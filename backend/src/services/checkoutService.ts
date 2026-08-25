/**
 * Standard Checkout - the second payment method.
 *
 * ============================================================================
 * Razorpay's modal opens inside our own page, and its outcome comes back
 * THROUGH THE CUSTOMER'S BROWSER. That single fact shapes everything here.
 *
 * `checkout.js` hands its success handler three values:
 *
 *   razorpay_order_id       the order it paid
 *   razorpay_payment_id     the payment it created
 *   razorpay_signature      HMAC-SHA256(order_id|payment_id, KEY_SECRET)
 *
 * The signature is genuine proof - only Razorpay and this server hold the secret,
 * so a matching HMAC means Razorpay really did issue that pair. But note what it
 * does NOT prove: nothing about the amount, nothing about whether the payment was
 * captured, and nothing about whether this browser is entitled to settle the order
 * it names. A signature is an authenticity check, not an authorisation one.
 *
 * So the browser's word is used for exactly one thing - looking the payment up -
 * and every figure acted on is then read back from Razorpay over an authenticated
 * connection the customer has no part in. `verifyCheckoutPayment` sends the result
 * through `paymentService.applyProviderState`, the same single writer the webhook
 * and the reconcile endpoint use, so the amount and currency guards that already
 * protect the Payment Links path protect this one unchanged.
 * ============================================================================
 *
 * The consequence worth stating plainly: a client that replays a valid signature,
 * or signs a payment belonging to a different order, cannot produce a PAID order.
 * The lookup either finds a payment whose captured amount matches this order's
 * amount, or the order stays unpaid.
 */

import crypto from 'node:crypto';

import {
  completeAgentAction,
  failAgentAction,
  recordBlockedAction,
  startAgentAction,
} from '../repositories/agentActionRepo.js';
import {
  getOrderById,
  updateOrderStatus,
  type PublicOrder,
} from '../repositories/orderRepo.js';
import { getProductById } from '../repositories/productRepo.js';
import { razorpayConfig } from '../config/env.js';
import { approvalRequired, badRequest, conflict, internal, notFound } from '../utils/errors.js';
import {
  assertPayable,
  capturePaymentIfAuthorised,
  getPaymentView,
  type PaymentView,
} from './paymentService.js';
import {
  createOrder,
  fetchPayment,
  MINIMUM_ORDER_AMOUNT_MINOR,
} from './razorpayClient.js';

/**
 * What the browser needs to open the modal.
 *
 * `keyId` is the publishable half of the pair - it is designed to sit in a browser,
 * appears in every Razorpay checkout integration, and can create nothing on its own.
 * It is returned here rather than built into the frontend bundle so there is exactly
 * one source of truth for which account is being charged: a bundle-baked key and a
 * server-configured key that disagree would produce an order the modal cannot pay.
 *
 * `amount` and `currency` are included for display only. The frontend is told, in
 * its own comments, not to send them back - and it could not usefully do so, because
 * nothing downstream reads an amount from a request body.
 */
export interface CheckoutSession {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  amountFormatted: string;
  /** Shown in the modal so the customer sees what they are paying for. */
  description: string;
  orderId: string;
}

export interface CreateCheckoutSessionInput {
  orderId: string;
  /** Must be exactly `true`. The explicit human yes, same gate as Payment Links. */
  approved: boolean;
  approvalReason: string;
  conversationId?: string | null | undefined;
  requestId: string;
}

/**
 * Create a Razorpay Order and return what the modal needs to open.
 *
 * The sequence mirrors `issuePaymentLink` step for step, and for the same reasons:
 * refuse without approval and WRITE the refusal, open the audit row before
 * contacting anyone, persist the yes before the provider call so a failure leaves
 * the order retryable, and only then create the provider-side object.
 *
 * The amount comes from the order row. There is no parameter on this function, or
 * field in the route's schema, through which a caller can name a price.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSession> {
  const config = razorpayConfig;

  if (config === null) {
    throw internal('createCheckoutSession was called with no Razorpay credentials configured');
  }

  const order = await getOrderById(input.orderId);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  // ---------------------------------------------------------------------------
  // 1. The gate. A guardrail that fires silently is indistinguishable from one
  //    that never fired, so the refusal is recorded before it is thrown.
  // ---------------------------------------------------------------------------
  if (input.approved !== true) {
    await recordBlockedAction({
      toolName: 'create_checkout_session',
      actionType: 'MONEY_ACTION',
      orderId: order.id,
      conversationId: input.conversationId ?? order.conversationId,
      reason: 'No explicit approval was supplied with the request.',
      input: { orderId: order.id, approved: input.approved },
      requestId: input.requestId,
      errorCode: 'APPROVAL_REQUIRED',
      reasonMessage:
        'Refused to open a checkout session: the request did not carry an explicit approval.',
    });

    throw approvalRequired(
      'Opening checkout is a money action and requires explicit approval. ' +
        'Send { "approved": true } together with the reason the customer agreed.',
      { orderId: order.id },
    );
  }

  assertPayable(order, 'No new checkout session was created.');

  // One payment instrument per order. A Payment Link and a checkout session live
  // side by side at the provider, neither knows about the other, and both are
  // payable - so an order carrying both can be paid twice. The second payment would
  // arrive against an order already PAID, where `applyProviderState` correctly
  // refuses to do anything with it, leaving money collected and nothing to attach it
  // to. Refusing here is cheaper than reconciling that.
  if (order.razorpayPaymentLinkId !== null) {
    throw conflict(
      'CONFLICT',
      'A Razorpay payment link has already been issued for this order. Pay through that link ' +
        'rather than opening checkout, so this order cannot be charged twice.',
      { orderId: order.id, paymentLinkId: order.razorpayPaymentLinkId },
    );
  }

  // Razorpay's floor. Checked here so a sub-minimum order fails with a sentence
  // naming the actual minimum rather than as an opaque BAD_REQUEST_ERROR from the
  // provider. It should be unreachable - products are seeded well above ₹1 - which
  // is why it reads as a guard rather than a validation message.
  if (order.amount < MINIMUM_ORDER_AMOUNT_MINOR) {
    throw badRequest(
      'VALIDATION_ERROR',
      `Razorpay requires at least ${MINIMUM_ORDER_AMOUNT_MINOR} minor units ` +
        `(${order.currency} 1.00) per payment. This order is ${order.amountFormatted}.`,
      { orderId: order.id, amount: order.amount, minimum: MINIMUM_ORDER_AMOUNT_MINOR },
    );
  }

  // A Razorpay order already exists for this row. Reuse it rather than creating a
  // second: two live provider orders against one of ours is two ways to pay it, and
  // the reconcile path would then have only one of them to read.
  if (order.razorpayOrderId !== null) {
    const product = await getProductById(order.productId);

    return {
      keyId: config.keyId,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      amountFormatted: order.amountFormatted,
      description: describeOrder(order, product?.name ?? null),
      orderId: order.id,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Audit before acting.
  // ---------------------------------------------------------------------------
  const action = await startAgentAction({
    toolName: 'create_checkout_session',
    actionType: 'MONEY_ACTION',
    orderId: order.id,
    conversationId: input.conversationId ?? order.conversationId,
    reason: input.approvalReason,
    input: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      amountFormatted: order.amountFormatted,
      method: 'standard_checkout',
    },
    requestId: input.requestId,
  });

  try {
    // -------------------------------------------------------------------------
    // 3. Persist the yes, before the provider call. If step 4 fails the order
    //    rests in ORDER_CREATED, which the state graph allows to retry.
    // -------------------------------------------------------------------------
    const confirmed =
      order.status === 'PENDING_CONFIRMATION'
        ? await updateOrderStatus(order.id, 'ORDER_CREATED')
        : order;

    // -------------------------------------------------------------------------
    // 4. Create the provider order. Amount and currency from the order row.
    // -------------------------------------------------------------------------
    const product = await getProductById(confirmed.productId);

    const razorpayOrder = await createOrder({
      amountMinor: confirmed.amount,
      currency: confirmed.currency,
      // Razorpay's `receipt` is "your own identifier for this order", capped at 40
      // characters. A UUID is 36, and echoing it back is what lets the webhook and
      // the reconcile path find our row from the provider's.
      receipt: confirmed.id,
      notes: {
        order_id: confirmed.id,
        request_id: input.requestId,
        method: 'standard_checkout',
      },
    });

    // -------------------------------------------------------------------------
    // 5. Record the provider order and move to PAYMENT_PENDING.
    // -------------------------------------------------------------------------
    const updated = await updateOrderStatus(confirmed.id, 'PAYMENT_PENDING', {
      razorpayOrderId: razorpayOrder.id,
    });

    await completeAgentAction(
      action.id,
      {
        razorpayOrderId: razorpayOrder.id,
        status: razorpayOrder.status,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      updated.id,
    );

    return {
      keyId: config.keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: updated.amount,
      currency: updated.currency,
      amountFormatted: updated.amountFormatted,
      description: describeOrder(updated, product?.name ?? null),
      orderId: updated.id,
    };
  } catch (cause) {
    await failAgentAction(
      action.id,
      'CHECKOUT_SESSION_FAILED',
      cause instanceof Error ? cause.message : 'Checkout session creation failed.',
    );
    throw cause;
  }
}

function describeOrder(order: PublicOrder, productName: string | null): string {
  return productName === null
    ? `Checkout Concierge order ${order.id}`
    : `${productName} x${order.quantity}`;
}

// -----------------------------------------------------------------------------
// The browser's return trip
// -----------------------------------------------------------------------------

/**
 * Verify the signature Razorpay's modal handed the browser.
 *
 * `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)`, compared
 * against `razorpay_signature`. This is Razorpay's documented scheme for the
 * checkout handler, and it is the same construction the webhook uses over a
 * different body.
 *
 * `timingSafeEqual` rather than `===`, with a length guard in front because it
 * throws on mismatched lengths. String equality returns early at the first differing
 * byte, so the time it takes leaks how much of a guessed signature was right - which
 * over enough attempts is how a signature gets forged one character at a time. The
 * `razorpay` npm package's own helper compares with `===`, which is a large part of
 * why this file does not use it.
 *
 * Exported for the offline test in scripts/, which asserts a forged signature is
 * rejected without needing a live provider.
 */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signature.trim(), 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export interface VerifyCheckoutPaymentInput {
  /** OUR order id, from the URL. The browser cannot pick which order it settles. */
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  requestId: string;
}

/**
 * Verify a checkout result and settle the order from what Razorpay reports.
 *
 * Four checks stand between a browser POST and a PAID order, and each one is doing
 * separate work:
 *
 *   1. SIGNATURE   The HMAC must match. This proves Razorpay issued the pair. A
 *                  mismatch is recorded as a blocked money action and refused - it
 *                  is the checkout-path counterpart of a forged webhook, and it is
 *                  worth being able to point at in the audit trail.
 *
 *   2. BINDING     `razorpay_order_id` must equal the one stored on OUR order. A
 *                  valid signature over some other order's pair is still authentic;
 *                  it is simply not evidence about this order. Without this check a
 *                  customer could settle a ₹1,400 order with a genuine signature
 *                  from a ₹1 one.
 *
 *   3. LOOKUP      The payment is fetched FROM RAZORPAY. Nothing the browser sent
 *                  about amount, currency or status is read - those three fields
 *                  are not even accepted by the route's schema.
 *
 *   4. AMOUNT      `applyProviderState` compares the captured figure and currency
 *                  against the order row, and refuses PAID on any mismatch. That
 *                  guard is not re-implemented here; it is reached by routing
 *                  through the same single writer the webhook uses.
 *
 * Check 3 is what makes the difference between this and the integration Razorpay's
 * quickstart describes. Verifying the signature and marking the order paid would
 * satisfy the letter of "verify the payment" while trusting the browser for the part
 * that matters - whether money actually arrived, and how much.
 */
export async function verifyCheckoutPayment(
  input: VerifyCheckoutPaymentInput,
): Promise<PaymentView> {
  const config = razorpayConfig;

  if (config === null) {
    throw internal('verifyCheckoutPayment was called with no Razorpay credentials configured');
  }

  const order = await getOrderById(input.orderId);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  // ---------------------------------------------------------------------------
  // 1. Signature.
  // ---------------------------------------------------------------------------
  // KEY_SECRET, not WEBHOOK_SECRET. Razorpay signs the checkout handler's values
  // with the API key secret and signs webhook bodies with the separately-chosen
  // webhook secret; using the wrong one here would reject every genuine payment.
  const signatureValid = verifyCheckoutSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
    config.keySecret,
  );

  if (!signatureValid) {
    await recordBlockedAction({
      toolName: 'verify_checkout_payment',
      actionType: 'MONEY_ACTION',
      orderId: order.id,
      conversationId: order.conversationId,
      reason: 'The checkout signature did not match, so the values were not issued by Razorpay.',
      input: {
        orderId: order.id,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        // `redactSensitive` blanks any key named `signature`, so the value itself
        // never reaches the row - only the fact that one was present and wrong.
        signature: input.razorpaySignature,
      },
      requestId: input.requestId,
      errorCode: 'INVALID_PAYMENT_SIGNATURE',
      reasonMessage:
        'Refused to settle the order: the checkout signature could not be verified against ' +
        "this account's key secret.",
    });

    throw badRequest(
      'INVALID_PAYMENT_SIGNATURE',
      'The payment signature could not be verified, so the order was not marked paid. ' +
        'If money was in fact taken, it will be picked up by reconciliation.',
      { orderId: order.id },
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Binding. A signature is authentic; it is not automatically about US.
  // ---------------------------------------------------------------------------
  if (order.razorpayOrderId === null) {
    throw conflict(
      'INVALID_STATE_TRANSITION',
      'No checkout session has been opened for this order, so there is no payment to verify.',
      { orderId: order.id, status: order.status },
    );
  }

  if (order.razorpayOrderId !== input.razorpayOrderId) {
    await recordBlockedAction({
      toolName: 'verify_checkout_payment',
      actionType: 'MONEY_ACTION',
      orderId: order.id,
      conversationId: order.conversationId,
      reason:
        'The signature was valid but covers a different Razorpay order than the one opened ' +
        'for this order.',
      input: {
        orderId: order.id,
        expectedRazorpayOrderId: order.razorpayOrderId,
        reportedRazorpayOrderId: input.razorpayOrderId,
      },
      requestId: input.requestId,
      errorCode: 'INVALID_PAYMENT_SIGNATURE',
      reasonMessage:
        'Refused to settle the order: the verified payment belongs to a different Razorpay order.',
    });

    throw badRequest(
      'INVALID_PAYMENT_SIGNATURE',
      'The payment was verified but belongs to a different order, so this order was not ' +
        'marked paid.',
      { orderId: order.id },
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Ask Razorpay what the payment actually is. 4. Let the single writer decide.
  // ---------------------------------------------------------------------------
  const payment = await fetchPayment(input.razorpayPaymentId);

  // The payment must belong to the order it claims. Razorpay would have to be badly
  // wrong for this to fire after the signature check passed, which is exactly why it
  // is worth asserting rather than assuming.
  if (
    typeof payment.order_id === 'string' &&
    payment.order_id !== '' &&
    payment.order_id !== order.razorpayOrderId
  ) {
    throw internal(
      `Razorpay payment ${payment.id} reports order ${payment.order_id}, but order ${order.id} ` +
        `is bound to ${order.razorpayOrderId}`,
    );
  }

  await capturePaymentIfAuthorised(order, payment, { requestId: input.requestId });

  return getPaymentView(order.id);
}
