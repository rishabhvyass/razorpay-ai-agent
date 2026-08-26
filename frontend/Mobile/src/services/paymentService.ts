import { get, post } from './api';
import { AuthorizePaymentPayload, CheckoutSession, PaymentView } from '../types';

export const paymentService = {
  /**
   * Request a Razorpay Payment Link for an order.
   * Gated: strictly requires { approved: true, approvalReason: string }.
   */
  async issuePaymentLink(orderId: string, payload: AuthorizePaymentPayload): Promise<PaymentView> {
    return post<PaymentView>(`/api/orders/${orderId}/payment-link`, payload);
  },

  /**
   * Get current server-side payment state.
   */
  async getPaymentStatus(orderId: string): Promise<PaymentView> {
    return get<PaymentView>(`/api/orders/${orderId}/payment`);
  },

  /**
   * Reconcile order payment state directly against Razorpay.
   */
  async refreshPaymentStatus(orderId: string): Promise<PaymentView> {
    return post<PaymentView>(`/api/orders/${orderId}/payment/refresh`, {});
  },

  /**
   * Standard Checkout Modal Session creation.
   * Gated: strictly requires { approved: true, approvalReason: string }.
   */
  async createCheckoutSession(orderId: string, payload: AuthorizePaymentPayload): Promise<CheckoutSession> {
    return post<CheckoutSession>('/api/create-order', {
      orderId,
      approved: payload.approved,
      approvalReason: payload.approvalReason,
      conversationId: payload.conversationId,
    });
  },

  /**
   * Verify checkout modal signature after payment completion.
   */
  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId?: string;
  }): Promise<PaymentView> {
    return post<PaymentView>('/api/verify-payment', payload);
  },
};
