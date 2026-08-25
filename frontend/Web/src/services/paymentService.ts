/**
 * Payments.
 *
 * Implemented on the backend, and consumed here. Two methods, one settlement path:
 *
 *   Payment Links - Razorpay hosts the page, the customer leaves this app
 *     POST /api/orders/:id/payment-link    requires an explicit { approved: true }
 *
 *   Standard Checkout - Razorpay's modal opens over this app
 *     POST /api/create-order               requires an explicit { approved: true }
 *     POST /api/verify-payment             the modal's result, verified server-side
 *
 *   Shared
 *     GET  /api/orders/:id/payment
 *     POST /api/orders/:id/payment/refresh reconcile against Razorpay
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE STRUCTURALLY CANNOT DO: set a payment status.
 *
 * Every status shown comes from `PaymentView.order.status`, which the backend read
 * out of the database. The only writer of PAID is the backend's own
 * `applyProviderState`, reached from a signature-verified Razorpay webhook, from a
 * figure Razorpay handed back on /refresh, or - for the modal - from a payment the
 * backend re-read from Razorpay after checking the signature. There is no argument
 * this app can pass to any of these routes that produces a PAID order.
 *
 * `verifyRazorpayPayment` is the one that most looks like an exception and is not.
 * It posts three values the browser received from Razorpay, and the backend uses them
 * to LOOK THE PAYMENT UP; the amount, the currency and the captured-or-not question
 * are answered by Razorpay over the backend's own authenticated connection. The route
 * does not accept an amount or a status, so there is nothing here to lie about. Its
 * 200 is not the confirmation either - the confirmation is the order status inside the
 * response body, and this app renders that.
 *
 * So the honest reading of a green "Payment verified" in this UI is "the backend
 * says Razorpay confirmed it", which is exactly what the product claims.
 * ---------------------------------------------------------------------------
 *
 * `mock` is set here rather than read from the response. Provenance is a frontend
 * concern - the backend has no business reporting whether this app is running a mock
 * - so a real response is stamped `mock: false` on the way through, and only the
 * local overlay produces `mock: true`. That flag is what drives the "MOCK - awaiting
 * backend" badge, and getting it from the server would let a server bug hide a mock.
 */

import { config } from '@/lib/config';
import { request } from './api';
import {
  decodeBackendPaymentView,
  decodeCheckoutSession,
  type BackendPaymentView,
  type CheckoutSession,
} from './decode';
import { getOrder } from './orderService';
import {
  createMockPaymentLink,
  getMockPaymentState,
  settleMockPayment,
} from './mock/mockPayments';
import type { CheckoutHandlerResponse } from '@/lib/razorpayCheckout';
import type { Order } from '@/types';

export interface PaymentView {
  order: Order;
  /** Provider-issued URL. Never constructed by this app. Null until issued. */
  paymentUrl: string | null;
  razorpayOrderId: string | null;
  paymentLinkId: string | null;
  paymentId: string | null;
  failureReason: string | null;
  /** True when any part of this view came from the mock overlay. */
  mock: boolean;
}

/** Stamp a backend response as real. The one place `mock: false` is decided. */
function fromBackend(view: BackendPaymentView): PaymentView {
  return { ...view, mock: false };
}

/**
 * Read the current payment view for an order.
 *
 * In real mode this is a single request to the payments route, which returns the
 * order row alongside the payment fields - so the amount displayed and the status
 * displayed are read in one shot and cannot disagree with each other.
 *
 * In mock mode the real order row is still fetched first, so the product, quantity
 * and amount shown are the backend's numbers. Only the payment-state fields are
 * overlaid.
 */
export async function getPaymentView(orderId: string, signal?: AbortSignal): Promise<PaymentView> {
  if (!config.useMock) {
    return request<unknown>(`/api/orders/${orderId}/payment`, { signal })
      .then(decodeBackendPaymentView)
      .then(fromBackend);
  }

  const order = await getOrder(orderId, signal);
  const overlay = getMockPaymentState(orderId);

  // No overlay yet - the order exists at PENDING_CONFIRMATION and no link has
  // been requested. Report the real row unchanged.
  if (!overlay) {
    return {
      order,
      paymentUrl: null,
      razorpayOrderId: order.razorpayOrderId,
      paymentLinkId: order.razorpayPaymentLinkId,
      paymentId: order.razorpayPaymentId,
      failureReason: null,
      mock: false,
    };
  }

  return {
    // Status comes from the overlay because in mock mode nothing ever asked the
    // provider for a link, so the real row cannot leave PENDING_CONFIRMATION.
    order: { ...order, status: overlay.status },
    paymentUrl: overlay.paymentUrl,
    razorpayOrderId: overlay.razorpayOrderId,
    paymentLinkId: overlay.paymentLinkId,
    paymentId: overlay.paymentId,
    failureReason: overlay.failureReason,
    mock: true,
  };
}

/**
 * Request a payment link for an already-created order.
 *
 * `approved: true` and `approvalReason` are required by the backend, which refuses
 * without them and writes the refusal to the audit trail as a blocked MONEY_ACTION.
 * That is not a formality to be satisfied by a default value: this function must be
 * called from a user's explicit click, and `approvalReason` should say what they
 * agreed to.
 *
 * The response carries the provider-issued `paymentUrl`. Navigate to it as given -
 * this app never assembles a payment URL.
 */
export async function requestPaymentLink(
  orderId: string,
  approvalReason: string,
  signal?: AbortSignal,
): Promise<PaymentView> {
  if (!config.useMock) {
    return request<unknown>(`/api/orders/${orderId}/payment-link`, {
      method: 'POST',
      body: { approved: true, approvalReason },
      signal,
    })
      .then(decodeBackendPaymentView)
      .then(fromBackend);
  }

  createMockPaymentLink(orderId);
  return getPaymentView(orderId);
}

// -----------------------------------------------------------------------------
// Standard Checkout
// -----------------------------------------------------------------------------

export type { CheckoutSession } from './decode';

/**
 * Open a Razorpay checkout session for an already-created order.
 *
 * `POST /api/create-order`. The name is Razorpay's: it creates a RAZORPAY order, the
 * provider object that binds a price to a checkout session. Our own order row already
 * exists - its id is the argument.
 *
 * NOTE WHAT IS NOT SENT: an amount. The backend reads the figure from the order row
 * and its route schema is strict, so a body carrying `amount` is a 400 rather than a
 * price this app got to choose. That is the property the whole payment surface rests
 * on, and it is worth knowing it holds at the call site as well as in the handler.
 *
 * `approved: true` and `approvalReason` are required, and the backend writes a blocked
 * MONEY_ACTION to the audit trail if either is missing. So this must be called from a
 * user's explicit click, with a reason that says what they agreed to.
 *
 * Safe to call more than once: if a session is already open for the order the backend
 * returns that one rather than creating a second. A customer who dismisses the modal
 * and presses pay again gets the same Razorpay order, not a second way to be charged.
 */
export async function createRazorpayCheckoutSession(
  orderId: string,
  approvalReason: string,
  signal?: AbortSignal,
): Promise<CheckoutSession> {
  if (config.useMock) {
    // No mock branch, deliberately. Standard Checkout means Razorpay's own modal
    // collecting real card details against a real provider order; there is nothing
    // here a local overlay could stand in for that would not amount to a fake
    // payment screen. Mock mode uses the labelled payment-link overlay instead.
    throw new Error(
      'Razorpay Checkout needs the real backend. Set VITE_USE_MOCK=false and configure ' +
        'Razorpay keys on the server to pay with the checkout modal.',
    );
  }

  return request<unknown>('/api/create-order', {
    method: 'POST',
    body: { orderId, approved: true, approvalReason },
    signal,
  }).then(decodeCheckoutSession);
}

/**
 * Hand the modal's result to the backend for verification.
 *
 * `POST /api/verify-payment`. The three values are forwarded EXACTLY as Razorpay's
 * success handler supplied them, under Razorpay's own key names - no renaming step in
 * which a typo could become a payment that silently fails to verify.
 *
 * `orderId` is sent alongside them, and it is not redundant. It lets the backend check
 * the signed `razorpay_order_id` against the one it stored for THIS order, so a
 * genuine signature covering some other order cannot settle this one. Without it the
 * backend has to resolve the order from the signed id, and that check becomes
 * tautological.
 *
 * The resolved view is the order as the database now holds it. Render that. A rejected
 * signature is a 400 and the order is untouched - which is the one case where it
 * matters most that this function returns a status rather than a boolean.
 */
export async function verifyRazorpayPayment(
  orderId: string,
  response: CheckoutHandlerResponse,
  signal?: AbortSignal,
): Promise<PaymentView> {
  return request<unknown>('/api/verify-payment', {
    method: 'POST',
    body: {
      orderId,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    },
    signal,
  })
    .then(decodeBackendPaymentView)
    .then(fromBackend);
}

/**
 * Ask the backend to reconcile this order against Razorpay.
 *
 * Real mode only, and it is not a way to advance a payment - it is a way to ask the
 * provider what already happened. This is how a paid order becomes PAID on a
 * localhost backend, which Razorpay cannot deliver a webhook to.
 *
 * In mock mode it resolves to the current view unchanged: there is no provider to
 * ask, and returning a fabricated "now paid" is precisely what the mock must not do.
 */
export async function refreshPaymentStatus(
  orderId: string,
  signal?: AbortSignal,
): Promise<PaymentView> {
  if (config.useMock) {
    return getPaymentView(orderId, signal);
  }

  return request<unknown>(`/api/orders/${orderId}/payment/refresh`, {
    method: 'POST',
    signal,
  })
    .then(decodeBackendPaymentView)
    .then(fromBackend);
}

/**
 * Simulate the provider settling the payment.
 *
 * Mock only, and exposed in the UI as an explicitly labelled control. It exists
 * because the Razorpay challenge requires demonstrating a graceful failure, and a
 * reviewer needs to reach that state deliberately rather than by chance.
 *
 * Note that it stays mock-only now that the real payments layer exists. A real
 * settlement is a card being charged on Razorpay's hosted page; there is no
 * legitimate shortcut, and adding one would put a "mark this paid" button in a
 * product whose entire claim is that no such button exists.
 */
export async function simulateSettlement(
  orderId: string,
  outcome: 'success' | 'failure',
): Promise<PaymentView> {
  if (!config.useMock) {
    throw new Error('Settlement simulation is available in mock mode only.');
  }

  // settleMockPayment answers `undefined` when no overlay exists for this id -
  // nothing ever requested a payment link, so there is no payment to settle.
  // Discarding that answer was a money-integrity bug: getPaymentView would return
  // the untouched real row (still PENDING_CONFIRMATION, mock: false), the caller
  // would take the resolved promise as confirmation, and the audit trail would
  // record a verified webhook for a payment that was never initiated. A settlement
  // that did not happen has to fail loudly.
  const settled = settleMockPayment(orderId, outcome);

  if (!settled) {
    throw new Error(
      'There is no simulated payment to settle for this order. No payment link was ' +
        'issued for it in this browser, so nothing was changed and no payment was ' +
        'recorded. Start the checkout flow again to issue one.',
    );
  }

  return getPaymentView(orderId);
}
