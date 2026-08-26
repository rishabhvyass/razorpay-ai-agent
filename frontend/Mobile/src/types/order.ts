import { Product } from './product';

/**
 * Order & Payment domain types matching backend `PublicOrder` and `PaymentView`.
 */

export const ORDER_STATUSES = [
  'PENDING_CONFIRMATION',
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  userId?: string | null;
  conversationId?: string | null;
  productId: string;
  quantity: number;
  /** Server-computed total in minor units. */
  amount: number;
  currency: string;
  /** Server-formatted total string (e.g. "₹1,499.00") */
  amountFormatted: string;
  status: OrderStatus;
  product?: Product | null;
  razorpayOrderId?: string | null;
  razorpayPaymentLinkId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  productId: string;
  quantity?: number;
  conversationId?: string | null;
  userId?: string | null;
  idempotencyKey?: string;
}

export interface AuthorizePaymentPayload {
  approved: boolean;
  approvalReason?: string;
  conversationId?: string | null;
}

export interface PaymentView {
  order: Order;
  paymentUrl: string | null;
  razorpayOrderId: string | null;
  paymentLinkId: string | null;
  paymentId: string | null;
  failureReason: string | null;
}

export interface CheckoutSession {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  amountFormatted: string;
  description: string;
  orderId: string;
}
