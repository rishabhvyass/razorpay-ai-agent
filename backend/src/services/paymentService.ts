/**
 * Payments layer.
 *
 * ============================================================================
 * This file holds the product's central claim:
 *
 *   An agent can recommend and can prepare a purchase, but money only moves
 *   after an explicit human yes, and an order is only PAID because Razorpay
 *   said so.
 *
 * Both halves are enforced here, and neither is enforced anywhere else:
 *
 *   `issuePaymentLink`   requires `approved === true`. A request without it is
 *                        written to the audit trail as a BLOCKED money action and
 *                        refused. That row is the evidence the guardrail works.
 *
 *   `applyProviderState` is the ONLY function in the codebase that can move an
 *                        order to PAID, and it does so only from a figure Razorpay
 *                        reported, only after that figure has been checked against
 *                        the amount stored on the order.
 * ============================================================================
 *
 * The webhook (push) and the refresh endpoint (pull) both funnel through
 * `applyProviderState`. That is deliberate: two independent implementations of "what
 * does this provider state mean" is two chances to disagree about whether money
 * arrived, and the disagreement would surface as a customer who paid and an order
 * that says they did not.
 */

import {
  completeAgentAction,
  failAgentAction,
  recordBlockedAction,
  startAgentAction,
} from '../repositories/agentActionRepo.js';
import {
  getOrderById,
  getOrderMetadata,
  updateOrderStatus,
  type PublicOrder,
} from '../repositories/orderRepo.js';
import { getProductById } from '../repositories/productRepo.js';
import type { Json, OrderStatus } from '../db/types.js';
import {
  approvalRequired,
  badRequest,
  conflict,
  internal,
  notFound,
} from '../utils/errors.js';
import { formatMinorUnits } from '../utils/money.js';
import {
  createPaymentLink,
  fetchPaymentLink,
  type PaymentLinkStatus,
  type RazorpayPaymentLink,
} from './razorpayClient.js';

/** Where this layer keeps what the orders table has no column for. */
const METADATA_KEY = 'payment';

/**
 * States in which a payment link is still worth showing to a customer.
 *
 * PAYMENT_FAILED is included on purpose: a declined card on a live Razorpay link is
 * ordinary, the link is still payable, and the order state graph allows
 * PAYMENT_FAILED -> PAYMENT_PENDING for exactly that retry. PAID, PAYMENT_EXPIRED
 * and CANCELLED are excluded - handing back a URL that cannot complete a purchase
 * invites a customer to try.
 */
const PAYABLE_STATUSES: readonly OrderStatus[] = [
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
];

// -----------------------------------------------------------------------------
// The view a client reads
// -----------------------------------------------------------------------------

export interface PaymentView {
  order: PublicOrder;
  /**
   * Provider-issued URL, exactly as Razorpay returned it. Never constructed here
   * and never assembled from parts - a hand-built payment URL is a phishing link
   * with our name on it.
   */
  paymentUrl: string | null;
  razorpayOrderId: string | null;
  paymentLinkId: string | null;
  paymentId: string | null;
  /** Written by us when a payment did not complete. Never provider prose. */
  failureReason: string | null;
}

/**
 * What this layer stores in `orders.metadata.payment`.
 *
 * Read defensively - the bag is JSONB and a future phase may write alongside it, so
 * every field is proven to be a string before it is used rather than asserted.
 */
interface StoredPaymentMetadata {
  url: string | null;
  failureReason: string | null;
}

function readStoredPaymentMetadata(metadata: Record<string, Json>): StoredPaymentMetadata {
  const bag = metadata[METADATA_KEY];

  if (bag === undefined || bag === null || typeof bag !== 'object' || Array.isArray(bag)) {
    return { url: null, failureReason: null };
  }

  const url = bag.url;
  const failureReason = bag.failureReason;

  return {
    url: typeof url === 'string' && url !== '' ? url : null,
    failureReason: typeof failureReason === 'string' && failureReason !== '' ? failureReason : null,
  };
}

/**
 * Merge into `orders.metadata` rather than replacing it.
 *
 * `updateOrderStatus` writes the `metadata` column wholesale, so passing a bare
 * `{ payment: ... }` would erase whatever else is in the bag - including the
 * `requestId` that `POST /api/orders` stored, which is the thread tying an order
 * back to the request that created it.
 */
async function mergedPaymentMetadata(
  orderId: string,
  patch: Partial<StoredPaymentMetadata>,
): Promise<Json> {
  const existing = (await getOrderMetadata(orderId)) ?? {};
  const current = readStoredPaymentMetadata(existing);

  return {
    ...existing,
    [METADATA_KEY]: {
      url: patch.url === undefined ? current.url : patch.url,
      failureReason:
        patch.failureReason === undefined ? current.failureReason : patch.failureReason,
    },
  };
}

async function buildPaymentView(order: PublicOrder): Promise<PaymentView> {
  const stored = readStoredPaymentMetadata((await getOrderMetadata(order.id)) ?? {});

  return {
    order,
    paymentUrl: PAYABLE_STATUSES.includes(order.status) ? stored.url : null,
    razorpayOrderId: order.razorpayOrderId,
    paymentLinkId: order.razorpayPaymentLinkId,
    paymentId: order.razorpayPaymentId,
    failureReason: stored.failureReason,
  };
}

/** Read the current payment view. Contacts no provider. */
export async function getPaymentView(orderId: string): Promise<PaymentView> {
  const order = await getOrderById(orderId);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  return buildPaymentView(order);
}

// -----------------------------------------------------------------------------
// The gate
// -----------------------------------------------------------------------------

export interface IssuePaymentLinkInput {
  orderId: string;
  /**
   * Must be exactly `true`. This is the explicit human yes, and it is the only
   * thing that distinguishes "the agent prepared a purchase" from "the customer
   * agreed to it".
   */
  approved: boolean;
  /**
   * Why the caller believes it is authorised, recorded verbatim on the audit row.
   * For a real approval this names what the customer agreed to.
   */
  approvalReason: string;
  conversationId?: string | null | undefined;
  requestId: string;
}

/**
 * Issue a Razorpay Payment Link for an order.
 *
 * The sequence matters more than any individual step:
 *
 *   1. Refuse without approval, and WRITE the refusal. A guardrail that fires
 *      silently is indistinguishable from one that never fired.
 *   2. Open a MONEY_ACTION audit row before contacting anyone. If this process
 *      dies mid-call, that row is the evidence a payment may have been created.
 *   3. Move to ORDER_CREATED before calling Razorpay, so the yes is durable even
 *      if the provider call then fails.
 *   4. Only then contact Razorpay, with an amount read from the order row.
 *   5. Record the link and move to PAYMENT_PENDING.
 *
 * Step 3 before step 4 is what makes a provider failure recoverable: the order
 * rests in ORDER_CREATED, which the state graph allows to retry into
 * PAYMENT_PENDING, rather than being stuck behind a transition that already ran.
 */
export async function issuePaymentLink(input: IssuePaymentLinkInput): Promise<PaymentView> {
  const order = await getOrderById(input.orderId);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  // ---------------------------------------------------------------------------
  // 1. The gate.
  // ---------------------------------------------------------------------------
  if (input.approved !== true) {
    await recordBlockedAction({
      toolName: 'create_payment_link',
      actionType: 'MONEY_ACTION',
      orderId: order.id,
      conversationId: input.conversationId ?? order.conversationId,
      reason: 'No explicit approval was supplied with the request.',
      input: { orderId: order.id, approved: input.approved },
      requestId: input.requestId,
      errorCode: 'APPROVAL_REQUIRED',
      reasonMessage:
        'Refused to create a payment link: the request did not carry an explicit approval.',
    });

    throw approvalRequired(
      'A payment link is a money action and requires explicit approval. ' +
        'Send { "approved": true } together with the reason the customer agreed.',
      { orderId: order.id },
    );
  }

  if (order.status === 'PAID') {
    throw conflict('CONFLICT', 'This order is already paid. No new payment link was created.', {
      orderId: order.id,
      status: order.status,
    });
  }

  if (!PAYABLE_STATUSES.includes(order.status) && order.status !== 'PENDING_CONFIRMATION') {
    throw conflict(
      'INVALID_STATE_TRANSITION',
      `An order with status ${order.status} can no longer be paid.`,
      { orderId: order.id, status: order.status },
    );
  }

  // Local idempotency. A link already exists, so re-issuing would leave two live
  // links against one order and two ways for the customer to pay it. Return the
  // existing one, refreshed from the provider so its state is current.
  if (order.razorpayPaymentLinkId !== null) {
    const existing = await fetchPaymentLink(order.razorpayPaymentLinkId);
    await applyProviderState(order, providerStateFromLink(existing), {
      requestId: input.requestId,
    });
    return getPaymentView(order.id);
  }

  // ---------------------------------------------------------------------------
  // 2. Audit before acting.
  // ---------------------------------------------------------------------------
  const action = await startAgentAction({
    toolName: 'create_payment_link',
    actionType: 'MONEY_ACTION',
    orderId: order.id,
    conversationId: input.conversationId ?? order.conversationId,
    reason: input.approvalReason,
    input: {
      orderId: order.id,
      // The figure being authorised, so the audit row records what was approved
      // rather than only that something was.
      amount: order.amount,
      currency: order.currency,
      amountFormatted: order.amountFormatted,
    },
    requestId: input.requestId,
  });

  try {
    // -------------------------------------------------------------------------
    // 3. Persist the yes.
    // -------------------------------------------------------------------------
    const confirmed =
      order.status === 'PENDING_CONFIRMATION'
        ? await updateOrderStatus(order.id, 'ORDER_CREATED')
        : order;

    // -------------------------------------------------------------------------
    // 4. Contact Razorpay. Amount and currency come from the order row.
    // -------------------------------------------------------------------------
    const product = await getProductById(confirmed.productId);

    const link = await createPaymentLink({
      amountMinor: confirmed.amount,
      currency: confirmed.currency,
      referenceId: confirmed.id,
      description:
        product === null
          ? `Checkout Concierge order ${confirmed.id}`
          : `${product.name} x${confirmed.quantity}`,
      notes: {
        // Razorpay caps notes at 15 string values and echoes them on every webhook
        // for this link, which is what makes a delivery traceable to this request.
        order_id: confirmed.id,
        request_id: input.requestId,
      },
    });

    // -------------------------------------------------------------------------
    // 5. Record the link.
    // -------------------------------------------------------------------------
    const updated = await updateOrderStatus(confirmed.id, 'PAYMENT_PENDING', {
      razorpayPaymentLinkId: link.id,
      ...(typeof link.order_id === 'string' && link.order_id !== ''
        ? { razorpayOrderId: link.order_id }
        : {}),
      metadata: await mergedPaymentMetadata(confirmed.id, {
        url: link.short_url,
        failureReason: null,
      }),
    });

    await completeAgentAction(
      action.id,
      {
        paymentLinkId: link.id,
        // The URL is recorded so the activity feed can show what the customer was
        // sent to. It is provider-issued and contains no credential.
        paymentUrl: link.short_url,
        status: link.status,
        amount: link.amount,
        currency: link.currency,
      },
      updated.id,
    );

    return buildPaymentView(updated);
  } catch (cause) {
    // The audit row must not be left in 'started'. Failing it is what turns an
    // abandoned money action into a visible one.
    await failAgentAction(
      action.id,
      'PAYMENT_LINK_FAILED',
      cause instanceof Error ? cause.message : 'Payment link creation failed.',
    );
    throw cause;
  }
}

// -----------------------------------------------------------------------------
// The single writer of a payment outcome
// -----------------------------------------------------------------------------

/**
 * What a provider told us, normalised.
 *
 * Both the webhook payload and the Payment Link read collapse into this shape, so
 * the decision below never has to know which one it came from.
 */
export interface ProviderPaymentState {
  linkStatus: PaymentLinkStatus | null;
  /** Razorpay payment status: `captured`, `authorized`, `failed`, ... */
  paymentStatus: string | null;
  paymentId: string | null;
  razorpayOrderId: string | null;
  /**
   * What the provider says was actually PAID, in minor units. Not the amount the
   * link was created for - that figure is ours and proves nothing.
   */
  paidAmountMinor: number | null;
  currency: string | null;
}

/** Normalise a Payment Link read into the shape above. */
export function providerStateFromLink(link: RazorpayPaymentLink): ProviderPaymentState {
  const attempts = link.payments ?? [];
  const captured = attempts.find((attempt) => attempt.status === 'captured');
  const latest = captured ?? attempts[attempts.length - 1];

  return {
    linkStatus: link.status,
    paymentStatus: latest?.status ?? null,
    paymentId: latest?.payment_id ?? null,
    razorpayOrderId: typeof link.order_id === 'string' && link.order_id !== '' ? link.order_id : null,
    // `amount_paid` is the provider's own tally of what it collected. Falling back
    // to the captured attempt's amount covers a link read whose summary field is
    // absent; falling back to `link.amount` would defeat the check entirely, since
    // that is the figure we asked for.
    paidAmountMinor: link.amount_paid ?? captured?.amount ?? null,
    currency: link.currency,
  };
}

/**
 * Decide what an order status should become. Pure, so it can be read as a table.
 *
 * `null` means "this state says nothing that should change the order" - a link that
 * is merely `created`, or a payment that is authorised but not captured. Doing
 * nothing is the correct response to most provider events.
 */
export function decideNextStatus(state: ProviderPaymentState): {
  next: OrderStatus | null;
  note: string;
} {
  if (state.linkStatus === 'paid' || state.paymentStatus === 'captured') {
    return { next: 'PAID', note: 'Provider reports the payment captured.' };
  }
  if (state.linkStatus === 'expired') {
    return { next: 'PAYMENT_EXPIRED', note: 'Provider reports the payment link expired.' };
  }
  if (state.linkStatus === 'cancelled') {
    return { next: 'CANCELLED', note: 'Provider reports the payment link cancelled.' };
  }
  if (state.paymentStatus === 'failed') {
    return { next: 'PAYMENT_FAILED', note: 'Provider reports the payment attempt failed.' };
  }
  // `partially_paid` lands here. Links are created with accept_partial: false, so
  // seeing it means the provider did something we did not ask for, and the only
  // honest reading of a part-paid order is that it is not paid.
  if (state.linkStatus === 'partially_paid') {
    return { next: null, note: 'Provider reports a partial payment, which does not settle an order.' };
  }
  return { next: null, note: 'Provider state does not change the order.' };
}

export interface ApplyProviderStateResult {
  order: PublicOrder;
  /** Whether the order actually changed. */
  applied: boolean;
  /** Written explanation, safe to store and to show an operator. */
  note: string;
}

/**
 * Apply a provider-reported state to an order.
 *
 * THE ONLY PATH TO PAID. Three guards stand in front of it:
 *
 *   Amount   The provider's paid figure must equal `orders.amount` exactly. Not
 *            "at least" - a larger figure means something is as wrong as a smaller
 *            one, and neither is an order this customer agreed to.
 *
 *   Currency Must match the order. A correct integer in the wrong currency is off
 *            by whatever the exchange rate happens to be.
 *
 *   Graph    `updateOrderStatus` refuses anything ALLOWED_TRANSITIONS forbids, and
 *            PAID is terminal there - so a `payment.failed` arriving after capture
 *            cannot undo a paid order no matter how it got here.
 *
 * A mismatch throws rather than silently declining. The caller decides what that
 * means for HTTP; see api/webhooks.ts, which records it and still answers 2xx so
 * the provider stops retrying something a retry cannot fix.
 */
export async function applyProviderState(
  order: PublicOrder,
  state: ProviderPaymentState,
  context: { requestId: string },
): Promise<ApplyProviderStateResult> {
  const { next, note } = decideNextStatus(state);

  if (next === null) {
    return { order, applied: false, note };
  }

  if (next === 'PAID') {
    if (state.paidAmountMinor === null) {
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        'The provider reported a captured payment without an amount, so it could not be ' +
          'checked against the order. The order was left unpaid.',
        { orderId: order.id },
      );
    }

    if (state.paidAmountMinor !== order.amount) {
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        `The provider reported ${formatMinorUnits(state.paidAmountMinor, state.currency ?? order.currency)} ` +
          `for an order of ${order.amountFormatted}. The order was left unpaid.`,
        {
          orderId: order.id,
          expectedAmount: order.amount,
          reportedAmount: state.paidAmountMinor,
        },
      );
    }

    if (
      state.currency !== null &&
      state.currency.toUpperCase() !== order.currency.toUpperCase()
    ) {
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        `The provider reported a payment in ${state.currency} for an order priced in ` +
          `${order.currency}. The order was left unpaid.`,
        { orderId: order.id, expectedCurrency: order.currency, reportedCurrency: state.currency },
      );
    }
  }

  // Already there. Provider retries do this constantly, and it is not an error -
  // but provider ids are still written through, because a retry is often the first
  // delivery to carry the payment id.
  if (order.status === next) {
    const unchanged = await updateOrderStatus(order.id, next, {
      ...(state.paymentId === null ? {} : { razorpayPaymentId: state.paymentId }),
      ...(state.razorpayOrderId === null ? {} : { razorpayOrderId: state.razorpayOrderId }),
    });
    return { order: unchanged, applied: false, note: `${note} Order was already ${next}.` };
  }

  const isFailure = next === 'PAYMENT_FAILED' || next === 'PAYMENT_EXPIRED';

  const updated = await updateOrderStatus(order.id, next, {
    ...(state.paymentId === null ? {} : { razorpayPaymentId: state.paymentId }),
    ...(state.razorpayOrderId === null ? {} : { razorpayOrderId: state.razorpayOrderId }),
    metadata: await mergedPaymentMetadata(order.id, {
      // Cleared on success so a retried-and-succeeded payment does not keep
      // showing why the previous attempt failed.
      failureReason: isFailure ? note : null,
    }),
  });

  await completeAgentAction(
    (
      await startAgentAction({
        toolName: next === 'PAID' ? 'payment_verified' : 'payment_state_changed',
        actionType: 'SYSTEM_ACTION',
        orderId: order.id,
        conversationId: order.conversationId,
        reason: note,
        input: {
          from: order.status,
          to: next,
          linkStatus: state.linkStatus,
          paymentStatus: state.paymentStatus,
        },
        requestId: context.requestId,
      })
    ).id,
    { status: next, paymentId: state.paymentId, verifiedAmount: state.paidAmountMinor },
    order.id,
  );

  return { order: updated, applied: true, note };
}

// -----------------------------------------------------------------------------
// Reconciliation (pull)
// -----------------------------------------------------------------------------

/**
 * Ask Razorpay what happened to this order's payment link, and apply it.
 *
 * This is what makes the money path testable against a server on localhost:
 * Razorpay cannot deliver a webhook to a private address, but nothing stops the
 * server asking. The answer is still Razorpay's, and it goes through the same
 * `applyProviderState` the webhook uses, so "payment is verified by Razorpay" holds
 * identically on both paths.
 *
 * It is also the production reconciliation tool. Webhooks are lost sometimes; an
 * order sitting in PAYMENT_PENDING is not evidence that nobody paid.
 */
export async function refreshPaymentStatus(
  orderId: string,
  context: { requestId: string },
): Promise<PaymentView> {
  const order = await getOrderById(orderId);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  if (order.razorpayPaymentLinkId === null) {
    throw badRequest(
      'VALIDATION_ERROR',
      'No payment link has been issued for this order, so there is nothing to reconcile.',
      { orderId: order.id, status: order.status },
    );
  }

  const link = await fetchPaymentLink(order.razorpayPaymentLinkId);

  // A link whose reference_id is not this order means our stored link id points at
  // someone else's payment. Refusing is the only safe move: applying it would
  // settle this order with another customer's money.
  if (
    typeof link.reference_id === 'string' &&
    link.reference_id !== '' &&
    link.reference_id !== order.id
  ) {
    throw internal(
      `Payment link ${link.id} is stored on order ${order.id} but references a different order`,
    );
  }

  await applyProviderState(order, providerStateFromLink(link), context);

  return getPaymentView(order.id);
}
