/**
 * Payment status.
 *
 * There is no payment endpoint on the backend, and there is deliberately no
 * endpoint that sets an order's status either. Real status changes will arrive
 * asynchronously via `POST /api/webhooks/razorpay`, which is unbuilt.
 *
 * So this module reads status the only honest way available: it re-reads the order
 * row through the real `GET /api/orders/:id`. When the payments layer lands, the
 * webhook will write to that row and this poll will observe the transition with no
 * change to the calling code - which is why polling a real resource is preferable
 * to inventing a socket.
 *
 * In mock mode the overlay in mock/mockPayments supplies the states the real row
 * cannot reach yet.
 */

import { config } from '@/lib/config';
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

/**
 * Read the current payment view for an order.
 *
 * The real row is always fetched first, so the product, quantity and amount shown
 * are the backend's numbers even in mock mode. Only the payment-state fields are
 * overlaid.
 */
export async function getPaymentView(orderId: string, signal?: AbortSignal): Promise<PaymentView> {
  const order = await getOrder(orderId, signal);

  if (!config.useMock) {
    return {
      order,
      paymentUrl: null, // supplied by the payments layer once it exists
      razorpayOrderId: order.razorpayOrderId,
      paymentLinkId: order.razorpayPaymentLinkId,
      paymentId: order.razorpayPaymentId,
      failureReason: null,
      mock: false,
    };
  }

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
    // Status comes from the overlay because the real row cannot leave
    // PENDING_CONFIRMATION without a webhook.
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
 * Real implementation will be a backend call that talks to Razorpay. There is no
 * such endpoint, so in mock mode this produces the local overlay and in real mode
 * it refuses rather than guessing at a route name.
 */
export async function requestPaymentLink(orderId: string): Promise<PaymentView> {
  if (!config.useMock) {
    throw new Error(
      'Payment link creation is not implemented on the backend yet (payments layer). ' +
        'No endpoint was called.',
    );
  }

  createMockPaymentLink(orderId);
  return getPaymentView(orderId);
}

/**
 * Simulate the provider settling the payment.
 *
 * Mock only, and exposed in the UI as an explicitly labelled control. It exists
 * because the Razorpay challenge requires demonstrating a graceful failure, and a
 * reviewer needs to reach that state deliberately rather than by chance.
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
