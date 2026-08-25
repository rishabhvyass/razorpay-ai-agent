/**
 * Payments.
 *
 * Implemented on the backend, and consumed here:
 *   POST /api/orders/:id/payment-link      requires an explicit { approved: true }
 *   GET  /api/orders/:id/payment
 *   POST /api/orders/:id/payment/refresh   reconcile against Razorpay
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE STRUCTURALLY CANNOT DO: set a payment status.
 *
 * Every status shown comes from `PaymentView.order.status`, which the backend read
 * out of the database. The only writer of PAID is the backend's own
 * `applyProviderState`, reached from a signature-verified Razorpay webhook or from a
 * figure Razorpay handed back on /refresh. There is no argument this app can pass to
 * any of the three routes above that produces a PAID order, and `/refresh` takes no
 * payment information at all - only an order id.
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
import { decodeBackendPaymentView, type BackendPaymentView } from './decode';
import { getOrder } from './orderService';
import {
  createMockPaymentLink,
  getMockPaymentState,
  settleMockPayment,
} from './mock/mockPayments';
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
