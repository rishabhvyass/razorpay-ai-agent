/**
 * Payment access for the web client.
 *
 * Standard Checkout initiation is exposed only as a server-backed session request. The
 * browser never chooses an amount and never marks an order paid; it forwards Razorpay's
 * signed result to the backend for verification.
 */

import { config } from '@/lib/config';
import { request } from './api';
import {
  decodeBackendPaymentView,
  decodeCheckoutSession,
  type BackendPaymentView,
  type CheckoutSession,
} from './decode';
import type { CheckoutHandlerResponse } from '@/lib/razorpayCheckout';
import { getOrder } from './orderService';
import type { Order } from '@/types';

export interface PaymentView {
  order: Order;
  /** Kept for decoding existing backend rows; the web UI never renders or opens it. */
  paymentUrl: string | null;
  razorpayOrderId: string | null;
  paymentLinkId: string | null;
  paymentId: string | null;
  failureReason: string | null;
  /** True only when a view came from a mock adapter. */
  mock: boolean;
}

function fromBackend(view: BackendPaymentView): PaymentView {
  return { ...view, mock: false };
}

/** Create the Razorpay Order used by Standard Checkout. */
export function createRazorpayCheckoutSession(
  orderId: string,
  approvalReason: string,
  signal?: AbortSignal,
): Promise<CheckoutSession> {
  if (config.useMock) {
    return Promise.reject(
      new Error(
        'Razorpay Checkout needs the real backend. Set VITE_USE_MOCK=false and configure Razorpay keys on the server.',
      ),
    );
  }

  return request<unknown>('/api/create-order', {
    method: 'POST',
    body: { orderId, approved: true, approvalReason },
    signal,
  }).then(decodeCheckoutSession);
}

/** Verify the signed result returned by Razorpay Standard Checkout. */
export function verifyRazorpayPayment(
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

/** Read the current server-side payment view for an order. */
export async function getPaymentView(orderId: string, signal?: AbortSignal): Promise<PaymentView> {
  if (!config.useMock) {
    return request<unknown>(`/api/orders/${orderId}/payment`, { signal })
      .then(decodeBackendPaymentView)
      .then(fromBackend);
  }

  // Mock mode still reads the real order row, but it does not fabricate a payment
  // instrument or create a local checkout surface.
  const order = await getOrder(orderId, signal);
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

/** Ask the backend to reconcile the order with the provider's current status. */
export async function refreshPaymentStatus(
  orderId: string,
  signal?: AbortSignal,
): Promise<PaymentView> {
  if (config.useMock) return getPaymentView(orderId, signal);

  return request<unknown>(`/api/orders/${orderId}/payment/refresh`, {
    method: 'POST',
    signal,
  })
    .then(decodeBackendPaymentView)
    .then(fromBackend);
}
