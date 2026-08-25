/**
 * Payment event repository.
 *
 * ============================================================================
 * DATABASE STATE ONLY. No Razorpay calls, no signature checking, no decisions
 * about what an event means. Same separation as orderRepo.ts.
 * ============================================================================
 *
 * `payment_events` is the record of what the provider told us and what we did
 * about it. Two properties make it worth its own table rather than a log line:
 *
 *   1. Replay protection lives in the database. Razorpay retries any delivery it
 *      does not get a 2xx for and offers no at-most-once guarantee, so a duplicate
 *      is normal traffic, not an anomaly. UNIQUE (provider, provider_event_id) is
 *      what makes "process this once" true even across two server instances
 *      handling the same retry concurrently - which no amount of in-process
 *      bookkeeping can achieve.
 *
 *   2. A delivery is recorded BEFORE it is acted on. If the process dies halfway
 *      through applying an event, the row is the evidence it arrived, and
 *      `processed = false` marks it as unfinished business rather than losing it.
 *      This is the same write-before-acting rule agent_actions follows.
 *
 * A row with `signature_verified = false` must never drive an order state change.
 * That is enforced by the caller (api/webhooks.ts), and stated in the schema at
 * supabase/migrations/001_initial_schema.sql; storing the row anyway is deliberate,
 * because a stream of unverified deliveries is exactly what an attack looks like
 * and discarding them would discard the evidence.
 */

import { supabaseAdmin } from '../db/supabase.js';
import type { Json, PaymentEventRow } from '../db/types.js';
import { fromPostgrestError, internal } from '../utils/errors.js';
import { redactSensitive } from './agentActionRepo.js';

/**
 * Single string literal, for the reason spelled out in orderRepo.ts: supabase-js
 * derives the row type from the literal text, and a runtime-joined array collapses
 * it to an error type that breaks every caller.
 */
const EVENT_COLUMNS =
  'id, order_id, provider, event_type, provider_event_id, payload, signature_verified, processed, processing_error, created_at';

export const PAYMENT_PROVIDER = 'razorpay';

export interface RecordPaymentEventInput {
  /**
   * Razorpay's own id for this delivery, from the `X-Razorpay-Event-Id` header.
   *
   * Null is permitted and is NOT unique (Postgres treats NULLs as distinct), so a
   * delivery without one is always stored rather than being silently deduplicated
   * against an unrelated event. The caller substitutes a body digest instead - see
   * api/webhooks.ts - so the unique constraint still does its job.
   */
  providerEventId: string | null;
  eventType: string;
  /** The order this event is about, when it could be resolved. */
  orderId?: string | null | undefined;
  /** The full provider payload. Stored through `redactSensitive`. */
  payload: unknown;
  /** Whether the HMAC over the raw body matched. */
  signatureVerified: boolean;
}

export interface RecordPaymentEventResult {
  event: PaymentEventRow;
  /**
   * True when this delivery had already been recorded, so the caller is looking at
   * the original row rather than a new one.
   *
   * The caller must treat this as "do not apply again" and answer 2xx. It is a
   * normal outcome, not an error: Razorpay retrying a delivery we already handled
   * is the system working.
   */
  duplicate: boolean;
}

/**
 * Store an inbound provider delivery.
 *
 * The unique-violation branch is the load-bearing part. Checking for an existing
 * row first and then inserting would leave a window in which two concurrent
 * retries both pass the check, both insert, and one crashes - or worse, both
 * proceed to apply the same payment. Letting the constraint decide, and treating
 * its violation as "already seen", makes the race impossible rather than unlikely.
 */
export async function recordPaymentEvent(
  input: RecordPaymentEventInput,
): Promise<RecordPaymentEventResult> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .insert({
      order_id: input.orderId ?? null,
      provider: PAYMENT_PROVIDER,
      event_type: input.eventType,
      provider_event_id: input.providerEventId,
      // Provider payloads carry card numbers, UPI handles, contacts and the
      // signature itself. redactSensitive already covers all of those by key name.
      payload: redactSensitive(input.payload),
      signature_verified: input.signatureVerified,
      processed: false,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error !== null) {
    if (error.code === '23505' && input.providerEventId !== null) {
      const existing = await findEventByProviderId(input.providerEventId);
      if (existing !== null) {
        return { event: existing, duplicate: true };
      }
      // The constraint fired but the row is not readable, which should be
      // impossible. Reporting it rather than continuing matters: continuing would
      // mean applying a payment event with no record that it was applied.
      throw internal('A payment event collided on its provider id but could not be read back');
    }
    throw fromPostgrestError(error, { operation: 'recordPaymentEvent' });
  }

  if (data === null) {
    throw internal('Payment event insert returned no row');
  }

  return { event: data, duplicate: false };
}

export async function findEventByProviderId(
  providerEventId: string,
): Promise<PaymentEventRow | null> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .select(EVENT_COLUMNS)
    .eq('provider', PAYMENT_PROVIDER)
    .eq('provider_event_id', providerEventId)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'findEventByProviderId' });
  }

  return data;
}

/**
 * Mark an event as fully handled.
 *
 * `orderId` is accepted because the order is often resolved from the payload
 * during processing, after the row was already written. Passing it here keeps the
 * event joinable to the order it affected.
 */
export async function markEventProcessed(
  id: string,
  orderId?: string | null,
): Promise<PaymentEventRow> {
  return updateEvent(
    id,
    {
      processed: true,
      processing_error: null,
      ...(orderId === undefined || orderId === null ? {} : { order_id: orderId }),
    },
    'markEventProcessed',
  );
}

/**
 * Record that an event arrived but could not be applied.
 *
 * `processed` stays false on purpose. These rows are the reconciliation queue -
 * `idx_payment_events_unprocessed` indexes exactly them - and marking a failure
 * "processed" would hide a payment that Razorpay believes it took from us.
 *
 * `reason` is written by us. Provider prose does not belong in a column that an
 * operator UI may render.
 */
export async function markEventFailed(
  id: string,
  reason: string,
  orderId?: string | null,
): Promise<PaymentEventRow> {
  return updateEvent(
    id,
    {
      processed: false,
      processing_error: reason.slice(0, 500),
      ...(orderId === undefined || orderId === null ? {} : { order_id: orderId }),
    },
    'markEventFailed',
  );
}

async function updateEvent(
  id: string,
  patch: {
    processed?: boolean;
    processing_error?: string | null;
    order_id?: string;
    payload?: Json;
  },
  operation: string,
): Promise<PaymentEventRow> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .update(patch)
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation });
  }
  if (data === null) {
    throw internal(`Payment event ${id} could not be updated`);
  }

  return data;
}
