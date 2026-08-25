/**
 * Razorpay webhook receiver. Mounted at `/api/webhooks`, so this file owns:
 *
 *   POST /api/webhooks/razorpay
 *
 * ============================================================================
 * This is the only inbound path that can mark an order PAID, and the HMAC below
 * is the only thing standing between "Razorpay says this was paid" and "somebody
 * posted JSON to a public URL".
 *
 * Three properties, in the order they are established:
 *
 *   1. AUTHENTICATE FIRST. The signature is checked over the exact bytes that
 *      arrived, before anything in the body is believed. See the raw-body note
 *      below - this is why the route is mounted ahead of express.json().
 *
 *   2. RECORD BEFORE ACTING. Every delivery is written to `payment_events`,
 *      verified or not, before it is processed. If this process dies halfway
 *      through applying a payment, the row is the evidence it arrived.
 *
 *   3. ACK WHAT A RETRY CANNOT FIX. Razorpay retries any delivery it does not get
 *      a 2xx for. So a genuine delivery we cannot act on - unknown event type,
 *      unknown order, mismatched amount - is recorded and answered 200, while a
 *      transient failure on our side is answered 5xx so the retry happens.
 *      Getting this backwards produces either a retry storm or a lost payment.
 * ============================================================================
 *
 * RAW BODY. `express.json()` replaces `req.body` with a parsed object and discards
 * the bytes. The HMAC is over the bytes, and `JSON.stringify` of the parsed object
 * is NOT byte-identical to what was sent - key order, whitespace and number
 * formatting all differ - so re-serialising to verify would fail on valid
 * deliveries and, worse, could be made to pass on invalid ones. server.ts therefore
 * mounts this router with `express.raw()` ahead of the JSON parser.
 *
 * WHERE THE WIRE SHAPE IS PARSED. Here, not in paymentService. This file owns what
 * a delivery looks like; the service owns what a payment state means. Both the
 * webhook and the reconcile path hand the service the same `ProviderPaymentState`,
 * so there is exactly one implementation of "does this mean the order is paid".
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';

import { RAZORPAY_ENV_VARS, isRazorpayConfigured, razorpayConfig } from '../config/env.js';
import {
  markEventFailed,
  markEventProcessed,
  recordPaymentEvent,
} from '../repositories/paymentEventRepo.js';
import {
  getOrderById,
  getOrderByRazorpayOrderId,
  getOrderByRazorpayPaymentLinkId,
  type PublicOrder,
} from '../repositories/orderRepo.js';
import { applyProviderState, type ProviderPaymentState } from '../services/paymentService.js';
import { badRequest, isAppError, paymentNotConfigured } from '../utils/errors.js';

export const webhooksRouter = Router();

const SIGNATURE_HEADER = 'x-razorpay-signature';
const EVENT_ID_HEADER = 'x-razorpay-event-id';

/**
 * How much of an unparseable body is kept for diagnosis.
 *
 * Capped because the column is JSONB in a table with no size limit of its own, and
 * an unparseable body is by definition something we did not expect the size of.
 */
const UNPARSEABLE_BODY_SAMPLE = 2000;

/**
 * Error codes that mean "recorded, but a retry will never help".
 *
 * Each one describes a permanent disagreement between what the provider reported
 * and what this system can accept. Razorpay redelivering the identical payload
 * would reach the identical conclusion, so these are acknowledged rather than
 * retried - and left `processed = false` in the reconciliation queue for a human.
 */
const TERMINAL_CODES = new Set(['PAYMENT_AMOUNT_MISMATCH', 'INVALID_STATE_TRANSITION']);

// -----------------------------------------------------------------------------
// Wire shape
// -----------------------------------------------------------------------------

/**
 * Razorpay's event envelope, described only as far as this handler acts on it.
 *
 * `looseObject` throughout: the full body is stored as the audit payload, and an
 * unexpected field is evidence rather than noise. Every entity is optional because
 * which ones are present depends on the event - `payment_link.paid` carries three,
 * `payment.failed` carries one.
 */
const entitySchema = z.looseObject({
  id: z.string().nullish(),
  status: z.string().nullish(),
  amount: z.number().nullish(),
  amount_paid: z.number().nullish(),
  currency: z.string().nullish(),
  reference_id: z.string().nullish(),
  order_id: z.string().nullish(),
});

const webhookSchema = z.looseObject({
  event: z.string().min(1),
  payload: z.looseObject({
    payment_link: z.looseObject({ entity: entitySchema }).nullish(),
    payment: z.looseObject({ entity: entitySchema }).nullish(),
    order: z.looseObject({ entity: entitySchema }).nullish(),
  }),
});

type WebhookBody = z.infer<typeof webhookSchema>;

/**
 * Event types this handler acts on.
 *
 * Anything else is recorded and acknowledged without action. That list is not
 * hypothetical - a Razorpay account emits refund, settlement, subscription and
 * invoice events, and a webhook configured slightly too broadly will send them all.
 */
const HANDLED_EVENTS = new Set([
  'payment_link.paid',
  'payment_link.expired',
  'payment_link.cancelled',
  'payment_link.partially_paid',
  'payment.captured',
  'payment.failed',
  'payment.authorized',
]);

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Collapse a delivery into the shape `applyProviderState` decides on.
 *
 * The amount is taken from what the provider says it COLLECTED - the link's
 * `amount_paid`, or the payment entity's `amount` - never from the link's `amount`,
 * which is the figure we asked for and therefore proves nothing about what arrived.
 *
 * Exported for scripts/smoke-logic.mjs, which asserts that last sentence directly.
 */
export function providerStateFromWebhook(body: WebhookBody): ProviderPaymentState {
  const link = body.payload.payment_link?.entity;
  const payment = body.payload.payment?.entity;

  const linkStatus = nonEmpty(link?.status);

  return {
    // Narrowed by the same union razorpayClient validates. An unrecognised link
    // status becomes null, which `decideNextStatus` reads as "changes nothing" -
    // the safe default for a status we have never seen.
    linkStatus:
      linkStatus === 'created' ||
      linkStatus === 'partially_paid' ||
      linkStatus === 'expired' ||
      linkStatus === 'cancelled' ||
      linkStatus === 'paid'
        ? linkStatus
        : null,
    paymentStatus: nonEmpty(payment?.status),
    paymentId: nonEmpty(payment?.id),
    razorpayOrderId: nonEmpty(payment?.order_id) ?? nonEmpty(body.payload.order?.entity.id),
    paidAmountMinor:
      typeof link?.amount_paid === 'number' && link.amount_paid > 0
        ? link.amount_paid
        : typeof payment?.amount === 'number'
          ? payment.amount
          : null,
    currency: nonEmpty(payment?.currency) ?? nonEmpty(link?.currency),
  };
}

/**
 * Find the order a delivery is about, strongest identifier first.
 *
 *   payment_link.id  Razorpay generated it and we stored it when we created the
 *                    link. A match here is a match on our own record.
 *   payment.order_id Also provider-generated.
 *   reference_id     Our order UUID, echoed back. Last because it is a value we
 *                    chose and sent, so it is only as trustworthy as the delivery
 *                    it arrived in - which, past the HMAC, it is.
 */
async function resolveOrder(body: WebhookBody): Promise<PublicOrder | null> {
  const link = body.payload.payment_link?.entity;
  const payment = body.payload.payment?.entity;

  const linkId = nonEmpty(link?.id);
  if (linkId !== null) {
    const byLink = await getOrderByRazorpayPaymentLinkId(linkId);
    if (byLink !== null) return byLink;
  }

  const razorpayOrderId = nonEmpty(payment?.order_id) ?? nonEmpty(body.payload.order?.entity.id);
  if (razorpayOrderId !== null) {
    const byOrder = await getOrderByRazorpayOrderId(razorpayOrderId);
    if (byOrder !== null) return byOrder;
  }

  const referenceId = nonEmpty(link?.reference_id) ?? nonEmpty(payment?.reference_id);
  if (referenceId !== null && z.uuid().safeParse(referenceId).success) {
    return getOrderById(referenceId);
  }

  return null;
}

// -----------------------------------------------------------------------------
// Signature
// -----------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 of the raw body against `X-Razorpay-Signature`.
 *
 * `timingSafeEqual` rather than `===`, and the reason is specific: string equality
 * short-circuits at the first differing character, so the time it takes leaks how
 * many leading characters matched. Given enough attempts that is enough to
 * reconstruct a valid signature one character at a time. This is the single place in
 * the codebase where that class of attack is possible, and it is the reason the
 * `razorpay` SDK's own `validateWebhookSignature` helper is not used - it compares
 * with `===`.
 *
 * The length check in front of it is required, not defensive: `timingSafeEqual`
 * throws on unequal lengths, and a thrown exception here would answer 500 to a
 * forged signature - which Razorpay's retry logic would then hammer.
 *
 * Exported for scripts/smoke-logic.mjs. It is pure, and it is the one function here
 * worth testing directly - every property this file claims rests on it.
 */
export function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signature.trim(), 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function parseJson(rawBody: Buffer): unknown {
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    return undefined;
  }
}

/** Best-effort event type, for the NOT NULL column, before the body is trusted. */
function peekEventType(parsed: unknown): string {
  if (typeof parsed === 'object' && parsed !== null) {
    const candidate = (parsed as { event?: unknown }).event;
    if (typeof candidate === 'string' && candidate !== '') {
      return candidate.slice(0, 100);
    }
  }
  return 'unknown';
}

// -----------------------------------------------------------------------------
// Route
// -----------------------------------------------------------------------------

webhooksRouter.post('/razorpay', async (req, res) => {
  if (!isRazorpayConfigured || razorpayConfig === null) {
    // Not "reject silently": an unconfigured server that answered 200 here would
    // look to Razorpay like every payment was acknowledged, and the deliveries
    // would be gone. A 501 keeps them queued at the provider.
    throw paymentNotConfigured(
      'This server cannot verify Razorpay webhooks because it has no credentials. Set ' +
        `${RAZORPAY_ENV_VARS.join(', ')} in the backend environment.`,
    );
  }

  // `express.raw` yields a Buffer only when the Content-Type matched; otherwise
  // `req.body` is an empty object. Without the bytes there is nothing to verify, and
  // an unverifiable delivery must not be recorded as though it were a real event.
  if (!Buffer.isBuffer(req.body)) {
    throw badRequest(
      'VALIDATION_ERROR',
      'Webhook body must be sent as raw application/json so its signature can be verified.',
    );
  }

  const rawBody: Buffer = req.body;
  const signature = req.header(SIGNATURE_HEADER);

  const signatureVerified =
    signature !== undefined &&
    signature !== '' &&
    verifySignature(rawBody, signature, razorpayConfig.webhookSecret);

  const parsed = parseJson(rawBody);

  // Razorpay's own delivery id when present. Falling back to a digest of the bytes
  // keeps the UNIQUE (provider, provider_event_id) replay guard working: an
  // identical replayed body produces an identical digest and is caught as a
  // duplicate, whereas a NULL would be stored as a distinct row every time.
  const providerEventId =
    nonEmpty(req.header(EVENT_ID_HEADER)) ??
    `sha256:${crypto.createHash('sha256').update(rawBody).digest('hex')}`;

  // -------------------------------------------------------------------------
  // Record before acting.
  // -------------------------------------------------------------------------
  const { event, duplicate } = await recordPaymentEvent({
    providerEventId,
    eventType: peekEventType(parsed),
    payload:
      parsed === undefined
        ? { unparseable: rawBody.toString('utf8').slice(0, UNPARSEABLE_BODY_SAMPLE) }
        : parsed,
    signatureVerified,
  });

  if (duplicate) {
    // Already seen. Acknowledged, not reprocessed - applying a payment event twice
    // is exactly what the unique constraint exists to prevent.
    res.json({
      data: { received: true, duplicate: true, applied: false },
      requestId: req.requestId,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // No order state changes past this point without a verified signature.
  // -------------------------------------------------------------------------
  if (!signatureVerified) {
    // Left `processed = false` deliberately: the row stays in the unprocessed index,
    // which is where a stream of forged deliveries becomes visible. Discarding it
    // would discard the only evidence of the attempt.
    await markEventFailed(
      event.id,
      signature === undefined || signature === ''
        ? 'Delivery carried no X-Razorpay-Signature header. No order state was changed.'
        : 'Signature did not match the HMAC of the received body. No order state was changed.',
    );

    throw badRequest(
      'INVALID_WEBHOOK_SIGNATURE',
      'Webhook signature verification failed. The delivery was recorded and ignored.',
    );
  }

  const validated = webhookSchema.safeParse(parsed);

  if (!validated.success) {
    // Razorpay signed this, so it is genuine - we simply do not recognise it. A 400
    // would put the provider into a retry loop over a shape that will not change, so
    // acknowledge and leave it flagged for a human.
    await markEventFailed(
      event.id,
      'Signature verified but the payload shape was not recognised, so nothing was applied.',
    );

    res.json({
      data: { received: true, applied: false, note: 'Payload shape not recognised.' },
      requestId: req.requestId,
    });
    return;
  }

  const body = validated.data;

  if (!HANDLED_EVENTS.has(body.event)) {
    // Expected and uninteresting. Marked processed rather than failed: there is
    // nothing here for anyone to follow up, and leaving refund or settlement events
    // in the reconciliation queue would bury the ones that matter.
    await markEventProcessed(event.id);

    res.json({
      data: { received: true, applied: false, note: `Event ${body.event} is not acted on.` },
      requestId: req.requestId,
    });
    return;
  }

  const order = await resolveOrder(body);

  if (order === null) {
    await markEventFailed(
      event.id,
      `Signature verified but no local order matched this ${body.event} delivery.`,
    );

    res.json({
      data: { received: true, applied: false, note: 'No matching order.' },
      requestId: req.requestId,
    });
    return;
  }

  try {
    const result = await applyProviderState(order, providerStateFromWebhook(body), {
      requestId: req.requestId,
    });

    await markEventProcessed(event.id, order.id);

    res.json({
      data: {
        received: true,
        applied: result.applied,
        orderId: result.order.id,
        status: result.order.status,
        note: result.note,
      },
      requestId: req.requestId,
    });
  } catch (cause) {
    if (isAppError(cause) && TERMINAL_CODES.has(cause.code)) {
      // An amount that does not match, or a transition the state graph forbids - a
      // late `payment.failed` after capture, say. Recorded with the reason, and
      // acknowledged, because the identical payload would fail identically.
      await markEventFailed(event.id, cause.message, order.id);

      res.json({
        data: { received: true, applied: false, orderId: order.id, note: cause.message },
        requestId: req.requestId,
      });
      return;
    }

    // Transient - a database blip, a lost connection. Rethrown so the error handler
    // answers 5xx and Razorpay retries, which is the outcome we want. No second
    // write is attempted: the row already reads `processed = false`, and a failing
    // database is a poor moment to depend on another insert.
    throw cause;
  }
});
