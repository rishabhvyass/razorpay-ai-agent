/**
 * Order repository.
 *
 * ============================================================================
 * IMPORTANT: This file manages DATABASE STATE ONLY.
 *
 * There are no Razorpay API calls here and there must never be. Creating a
 * Razorpay order, issuing a payment link, and verifying a webhook signature all
 * belong to the payments layer, which will call into this repository to persist
 * what happened. That separation is what makes the money path testable without a
 * network, and auditable without reading two systems at once.
 * ============================================================================
 *
 * Two invariants this file exists to enforce:
 *
 *   1. `amount` is computed here from `products.price`, read from the database at
 *      order time. It is never accepted from a caller. Not from the HTTP body,
 *      not from an MCP tool argument, not from the model. An agent that can name
 *      its own price is an agent that can be talked into a discount.
 *
 *   2. Status transitions are checked against an explicit graph. PAID is
 *      terminal, and nothing can walk backwards out of it. A duplicate webhook
 *      arriving after capture cannot flip a paid order to PAYMENT_FAILED.
 */

import { createHash } from 'node:crypto';

import { supabaseAdmin } from '../db/supabase.js';
import type { Json, OrderRow, OrderStatus, OrderUpdate } from '../db/types.js';
import { badRequest, conflict, fromPostgrestError, internal } from '../utils/errors.js';
import { formatMinorUnits, isValidMinorAmount, lineTotalMinor } from '../utils/money.js';
import { getProductRowForOrder } from './productRepo.js';

/**
 * Must stay a single string literal. supabase-js resolves the return type of
 * `.select()` from the literal text of the argument; an array joined at runtime
 * widens to `string`, the row type collapses to `GenericStringError`, and every
 * caller then fails to typecheck for a reason that has nothing to do with the
 * caller. Keeping the list explicit rather than `*` means a column added to the
 * table does not silently appear in an HTTP response.
 */
const ORDER_COLUMNS =
  'id, user_id, conversation_id, product_id, quantity, amount, currency, status, razorpay_order_id, razorpay_payment_link_id, razorpay_payment_id, idempotency_key, metadata, created_at, updated_at';

/**
 * Legal status transitions.
 *
 * Written as data rather than as `if` statements so the whole money lifecycle can
 * be read - and reviewed - in one place.
 *
 * Notes on the shape:
 *   - PAID, PAYMENT_EXPIRED and CANCELLED are terminal. PAID especially: money
 *     has moved, and no later event may contradict that.
 *   - PAYMENT_FAILED can return to PAYMENT_PENDING, because a failed attempt on a
 *     live payment link is normal and the customer may simply retry.
 *   - PAYMENT_PENDING -> PAID is the webhook path.
 *   - ORDER_CREATED -> PAID exists because a captured payment can be observed
 *     before the payment-link record is written, if a webhook wins the race
 *     against our own database write.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_CONFIRMATION: ['ORDER_CREATED', 'CANCELLED'],
  ORDER_CREATED: ['PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED'],
  PAID: [],
  PAYMENT_FAILED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_EXPIRED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface PublicOrder {
  id: string;
  userId: string | null;
  conversationId: string | null;
  productId: string;
  quantity: number;
  /** Minor units. */
  amount: number;
  currency: string;
  amountFormatted: string;
  status: OrderStatus;
  razorpayOrderId: string | null;
  razorpayPaymentLinkId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The columns `ORDER_COLUMNS` actually selects.
 *
 * `idempotency_fingerprint` is on the table but not in that list, so a row read
 * through the public projection genuinely does not carry it. Typing the serialiser
 * against the projection rather than against the full `OrderRow` is what keeps
 * that honest - and means adding another internal-only column cannot silently
 * become a required field here.
 */
type PublicOrderRow = Omit<OrderRow, 'idempotency_fingerprint'>;

/**
 * Serialise for an HTTP response.
 *
 * `idempotency_key` and `metadata` are deliberately withheld. The key is a
 * caller-chosen token whose only purpose is deduplication; echoing it back lets a
 * client discover another caller's key. `metadata` is an open JSONB bag that the
 * payments layer will fill with provider detail, so it is not safe to expose
 * wholesale from a service-role query.
 */
export function toPublicOrder(row: PublicOrderRow): PublicOrder {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    productId: row.product_id,
    quantity: row.quantity,
    amount: row.amount,
    currency: row.currency,
    amountFormatted: formatMinorUnits(row.amount, row.currency),
    status: row.status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentLinkId: row.razorpay_payment_link_id,
    razorpayPaymentId: row.razorpay_payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateOrderInput {
  productId: string;
  quantity: number;
  userId?: string | null | undefined;
  conversationId?: string | null | undefined;
  /**
   * Caller-supplied deduplication token. Strongly recommended for anything that
   * will lead to a payment: a retried request with the same key returns the
   * original order instead of creating a second one.
   *
   * The key must be reused only for a genuine retry of the same request. Reusing
   * it with different parameters is rejected - see `fingerprintOrderRequest`.
   */
  idempotencyKey?: string | undefined;
  metadata?: Json | undefined;
}

/**
 * Fingerprint the parameters an idempotency key was first used with.
 *
 * An idempotency key alone cannot identify a retry. The key namespace is global
 * and the API accepts short human-chosen strings, so "same key" does not imply
 * "same request": a client reusing `checkout-0001` for a different product - or
 * two clients that happen to pick the same key - would otherwise be handed back
 * an order they never placed, with HTTP 201 claiming it was created for them.
 * Their real order would never be inserted, and nothing would report the mismatch.
 *
 * Comparing a fingerprint turns that silent wrong answer into an explicit 409.
 * Only the fields that define *what is being bought and by whom* are included;
 * `metadata` is excluded because it carries incidental request context (a request
 * id, for instance) that legitimately differs between retries of one order.
 */
function fingerprintOrderRequest(input: CreateOrderInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        productId: input.productId,
        quantity: input.quantity,
        userId: input.userId ?? null,
        conversationId: input.conversationId ?? null,
      }),
    )
    .digest('hex');
}

/**
 * Create an order in PENDING_CONFIRMATION.
 *
 * PENDING_CONFIRMATION is the point of the whole design. This function records
 * an *intent* to buy. It contacts no payment provider and moves no money, so the
 * agent can prepare a purchase and present it for approval without anything
 * irreversible having happened. The transition to ORDER_CREATED is the gate that
 * requires an explicit human yes.
 */
export async function createOrderRecord(input: CreateOrderInput): Promise<PublicOrder> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw badRequest('VALIDATION_ERROR', 'Quantity must be a positive whole number.', {
      quantity: input.quantity,
    });
  }

  const fingerprint =
    input.idempotencyKey === undefined ? null : fingerprintOrderRequest(input);

  // Idempotency check first. If this key has been seen, return what it produced -
  // do not re-price, do not insert. Cheaper than catching the unique violation,
  // and it makes the common retry path a single read.
  if (input.idempotencyKey !== undefined) {
    const existing = await getOrderRowByIdempotencyKey(input.idempotencyKey);
    if (existing !== null) {
      return replayOrConflict(existing, fingerprint, input.idempotencyKey);
    }
  }

  // Price comes from the database, now - never from the caller.
  const product = await getProductRowForOrder(input.productId);

  if (product === null) {
    throw badRequest('PRODUCT_NOT_FOUND', 'That product does not exist.');
  }
  if (!product.active) {
    throw conflict('CONFLICT', 'That product is no longer available for purchase.');
  }
  if (product.stock < input.quantity) {
    throw conflict('CONFLICT', `Only ${product.stock} left in stock.`, {
      requested: input.quantity,
      available: product.stock,
    });
  }

  // `lineTotalMinor` range-checks the product itself, so this cannot silently
  // overflow into the INTEGER column. A RangeError here means either an absurd
  // quantity (a client fault) or a `products.price` the catalogue should never
  // have contained (our fault); the two are separated so the caller gets a 400
  // only for the one it can actually fix.
  let amount: number;
  try {
    amount = lineTotalMinor(product.price, input.quantity);
  } catch (cause) {
    if (!isValidMinorAmount(product.price)) {
      throw internal(`Product ${product.id} has an out-of-range price`, cause);
    }
    throw badRequest('VALIDATION_ERROR', 'Order total is out of the supported range.', {
      quantity: input.quantity,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: input.userId ?? null,
      conversation_id: input.conversationId ?? null,
      product_id: product.id,
      quantity: input.quantity,
      amount,
      currency: product.currency,
      status: 'PENDING_CONFIRMATION',
      idempotency_key: input.idempotencyKey ?? null,
      idempotency_fingerprint: fingerprint,
      metadata: input.metadata ?? {},
    })
    .select(ORDER_COLUMNS)
    .single();

  if (error !== null) {
    // Lost the race: another request inserted the same key between our check and
    // this insert. The constraint is the real guard, so resolve rather than fail -
    // but still hold the winner to the same fingerprint check, or a concurrent
    // mismatched reuse would slip through the path the sequential one blocks.
    if (error.code === '23505' && input.idempotencyKey !== undefined) {
      const existing = await getOrderRowByIdempotencyKey(input.idempotencyKey);
      if (existing !== null) {
        return replayOrConflict(existing, fingerprint, input.idempotencyKey);
      }
      throw conflict('DUPLICATE_IDEMPOTENCY_KEY', 'That idempotency key is already in use.');
    }
    throw fromPostgrestError(error, { operation: 'createOrderRecord' });
  }
  if (data === null) {
    throw internal('Order insert returned no row');
  }

  return toPublicOrder(data);
}

export async function getOrderById(id: string): Promise<PublicOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getOrderById', notFoundCode: 'ORDER_NOT_FOUND' });
  }

  return data === null ? null : toPublicOrder(data);
}

/**
 * Look up by Razorpay's order id. This is the webhook's entry point: a delivery
 * identifies the order by the provider's id, not ours.
 */
export async function getOrderByRazorpayOrderId(
  razorpayOrderId: string,
): Promise<PublicOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'getOrderByRazorpayOrderId',
      notFoundCode: 'ORDER_NOT_FOUND',
    });
  }

  return data === null ? null : toPublicOrder(data);
}

/**
 * Look up by Razorpay's payment-link id.
 *
 * The primary route in from a Payment Links webhook. A `payment_link.*` delivery
 * names the link, and the link id is what we stored when we created it, so this is
 * a stronger match than `reference_id` - which is a value we chose and sent, and
 * therefore only as trustworthy as the delivery it arrived in.
 *
 * `razorpay_payment_link_id` is UNIQUE on the table, so this cannot return two
 * orders for one link.
 */
export async function getOrderByRazorpayPaymentLinkId(
  paymentLinkId: string,
): Promise<PublicOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('razorpay_payment_link_id', paymentLinkId)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'getOrderByRazorpayPaymentLinkId',
      notFoundCode: 'ORDER_NOT_FOUND',
    });
  }

  return data === null ? null : toPublicOrder(data);
}

/**
 * Read an order's `metadata` bag.
 *
 * Separate from `getOrderById` because `toPublicOrder` deliberately withholds this
 * column - it is an open JSONB bag written by the service-role client, so exposing
 * it wholesale over HTTP would leak whatever any later phase decided to put in it.
 * The payments layer needs it for two things the orders table has no column for:
 * the provider-issued payment URL, and a written failure reason.
 *
 * Returns `{}` for an order with no metadata and `null` when the order does not
 * exist, so a caller can tell "nothing stored" from "no such order".
 */
export async function getOrderMetadata(id: string): Promise<Record<string, Json> | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('metadata')
    .eq('id', id)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getOrderMetadata', notFoundCode: 'ORDER_NOT_FOUND' });
  }

  if (data === null) return null;

  const { metadata } = data;

  // The column is NOT NULL DEFAULT '{}', but it is typed as Json, so an array or a
  // scalar is representable. Anything that is not a plain object is treated as
  // absent rather than spread into a patch, where it would corrupt the bag.
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  // `Json` object values are `Json | undefined`; strip the undefined so the result
  // can be spread into a new metadata object without reintroducing holes.
  const entries = Object.entries(metadata).filter(
    (entry): entry is [string, Json] => entry[1] !== undefined,
  );

  return Object.fromEntries(entries);
}

export async function getOrderByIdempotencyKey(key: string): Promise<PublicOrder | null> {
  const row = await getOrderRowByIdempotencyKey(key);
  return row === null ? null : toPublicOrder(row);
}

/**
 * Same lookup, but keeping `idempotency_fingerprint` - which `ORDER_COLUMNS`
 * deliberately omits, because the fingerprint is an internal dedup detail and has
 * no business in an HTTP response.
 */
const ORDER_COLUMNS_WITH_FINGERPRINT = `${ORDER_COLUMNS}, idempotency_fingerprint` as const;

async function getOrderRowByIdempotencyKey(
  key: string,
): Promise<(PublicOrderRow & { idempotency_fingerprint: string | null }) | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS_WITH_FINGERPRINT)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getOrderByIdempotencyKey' });
  }

  return data;
}

/**
 * Decide what a reused idempotency key means.
 *
 * Same parameters: a genuine retry, so replay the original order. Different
 * parameters: the key does not describe this request, and returning the stored
 * order would answer a question the caller did not ask. That is reported rather
 * than papered over.
 *
 * A stored fingerprint of NULL means the row predates fingerprinting. Those are
 * replayed rather than rejected, so introducing this check cannot start failing
 * retries of orders that already exist.
 */
function replayOrConflict(
  row: PublicOrderRow & { idempotency_fingerprint: string | null },
  fingerprint: string | null,
  key: string,
): PublicOrder {
  const stored = row.idempotency_fingerprint;

  if (stored !== null && fingerprint !== null && stored !== fingerprint) {
    throw conflict(
      'IDEMPOTENCY_KEY_REUSED',
      'That idempotency key was already used for a different order. Use a new key.',
      { idempotencyKey: key },
    );
  }

  return toPublicOrder(row);
}

export interface UpdateOrderStatusInput {
  /** Attached as the order moves through the Razorpay flow. */
  razorpayOrderId?: string | undefined;
  razorpayPaymentLinkId?: string | undefined;
  razorpayPaymentId?: string | undefined;
  metadata?: Json | undefined;
}

/**
 * Transition an order, refusing anything the graph disallows.
 *
 * The guard is applied inside a conditional UPDATE rather than as a read-then-
 * write. `.eq('status', current)` means the row only changes if it is still in
 * the state we validated, so two concurrent webhooks for the same order cannot
 * both succeed - the loser matches no row and is reported as a conflict. A
 * read-then-write would let both through.
 */
export async function updateOrderStatus(
  id: string,
  nextStatus: OrderStatus,
  extra: UpdateOrderStatusInput = {},
): Promise<PublicOrder> {
  const current = await getOrderById(id);

  if (current === null) {
    throw fromPostgrestError({ code: 'PGRST116' }, {
      operation: 'updateOrderStatus',
      notFoundCode: 'ORDER_NOT_FOUND',
    });
  }

  // Re-applying the state an order is already in is a no-op *for the status*, and
  // webhook retries do this constantly, so it must not be an error.
  //
  // But it is only a no-op when there is nothing else to write. A same-status call
  // carrying provider ids - the shape a retried webhook takes when it is the first
  // delivery to include razorpay_payment_id - would otherwise return early and
  // discard them, leaving the order permanently unable to be reconciled against
  // the provider. So: return early only if this call would change nothing.
  const hasProviderRefs =
    extra.razorpayOrderId !== undefined ||
    extra.razorpayPaymentLinkId !== undefined ||
    extra.razorpayPaymentId !== undefined ||
    extra.metadata !== undefined;

  if (current.status === nextStatus && !hasProviderRefs) {
    return current;
  }

  if (current.status !== nextStatus && !canTransition(current.status, nextStatus)) {
    throw conflict(
      'INVALID_STATE_TRANSITION',
      `An order cannot move from ${current.status} to ${nextStatus}.`,
      { from: current.status, to: nextStatus, allowed: [...ALLOWED_TRANSITIONS[current.status]] },
    );
  }

  // Typed as OrderUpdate, not Record<string, unknown>. supabase-js rejects a
  // loosely-typed payload outright, and the strict type is what stops a typo in a
  // column name from reaching Postgres as a silent no-op.
  const patch: OrderUpdate = { status: nextStatus };
  if (extra.razorpayOrderId !== undefined) patch.razorpay_order_id = extra.razorpayOrderId;
  if (extra.razorpayPaymentLinkId !== undefined) {
    patch.razorpay_payment_link_id = extra.razorpayPaymentLinkId;
  }
  if (extra.razorpayPaymentId !== undefined) patch.razorpay_payment_id = extra.razorpayPaymentId;
  if (extra.metadata !== undefined) patch.metadata = extra.metadata;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', id)
    .eq('status', current.status) // optimistic lock
    .select(ORDER_COLUMNS)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'updateOrderStatus' });
  }

  if (data === null) {
    // Matched nothing: something else transitioned this order first.
    throw conflict(
      'INVALID_STATE_TRANSITION',
      'The order changed state concurrently. Re-read it and retry.',
      { expectedStatus: current.status },
    );
  }

  return toPublicOrder(data);
}

/** A user's orders, newest first. */
export async function getUserOrders(
  userId: string,
  options: { limit?: number | undefined; offset?: number | undefined; status?: OrderStatus | undefined } = {},
): Promise<PublicOrder[]> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 20), 1), 100);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  let request = supabaseAdmin.from('orders').select(ORDER_COLUMNS).eq('user_id', userId);

  if (options.status !== undefined) {
    request = request.eq('status', options.status);
  }

  const { data, error } = await request
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getUserOrders' });
  }

  return (data ?? []).map(toPublicOrder);
}

/** Orders belonging to one conversation, oldest first. */
export async function getConversationOrders(conversationId: string): Promise<PublicOrder[]> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getConversationOrders' });
  }

  return (data ?? []).map(toPublicOrder);
}
