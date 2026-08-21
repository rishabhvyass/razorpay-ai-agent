/**
 * Orders.
 *
 * Implemented on the backend:
 *   POST /api/orders                 record intent to buy (PENDING_CONFIRMATION)
 *   GET  /api/orders/:id
 *   GET  /api/orders/:id/activity
 *   GET  /api/users/:userId/orders
 *
 * NOT implemented, and deliberately so:
 *
 *   There is no HTTP endpoint anywhere that sets an order's status. The backend
 *   comment is explicit that exposing one "would mean anyone who could reach this
 *   service could mark an order PAID". Status is driven by exactly one thing: a
 *   Razorpay webhook whose HMAC signature verified.
 *
 * So this module has no `markPaid`, no `updateStatus`, no `confirmPayment`. The
 * frontend can create intent and read state. It cannot advance the money states,
 * and that is the property the product principle rests on - the UI is structurally
 * incapable of fabricating a payment.
 */

import { request } from './api';
import type { ActivityFeed, CreateOrderPayload, Order } from '@/types';

/**
 * Record an intent to buy. Writes PENDING_CONFIRMATION only - contacts no payment
 * provider and moves no money.
 *
 * Called exclusively from the user's click on "Confirm purchase". Never called as
 * a side effect of rendering a confirmation card.
 *
 * `idempotencyKey` means a retried submit returns the original order rather than
 * creating a second one, which is the difference between a flaky network and a
 * double charge once payments are wired up.
 */
export function createOrder(payload: CreateOrderPayload, signal?: AbortSignal): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: {
      productId: payload.productId,
      quantity: payload.quantity ?? 1,
      ...(payload.conversationId ? { conversationId: payload.conversationId } : {}),
      ...(payload.userId ? { userId: payload.userId } : {}),
      ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
    },
    signal,
  });
}

export function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request<Order>(`/api/orders/${id}`, { signal });
}

export function getOrderActivity(id: string, signal?: AbortSignal): Promise<ActivityFeed> {
  return request<ActivityFeed>(`/api/orders/${id}/activity`, { signal });
}

export function getUserOrders(
  userId: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<Order[]> {
  return request<Order[]>(`/api/users/${userId}/orders`, {
    query: { limit: params.limit, offset: params.offset },
    signal,
  });
}

/** Statuses that mean "no longer waiting on the provider". Drives poll stop. */
const TERMINAL: ReadonlySet<Order['status']> = new Set([
  'PAID',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'CANCELLED',
]);

export function isTerminalStatus(status: Order['status']): boolean {
  return TERMINAL.has(status);
}

/** True while the order is somewhere between created and provider-confirmed. */
export function isAwaitingPayment(status: Order['status']): boolean {
  return status === 'ORDER_CREATED' || status === 'PAYMENT_PENDING';
}
