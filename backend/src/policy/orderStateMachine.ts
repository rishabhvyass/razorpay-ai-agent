/**
 * Centralized Order State Machine.
 *
 * ============================================================================
 * State Graph:
 *
 *   PENDING_CONFIRMATION
 *       │ (User approvals / money action initiated)
 *       ▼
 *   ORDER_CREATED
 *       │ (Payment link issued / checkout opened)
 *       ▼
 *   PAYMENT_PENDING
 *       │
 *       ├─► (Verified Razorpay webhook or verified API reconciliation) ──► PAID [TERMINAL]
 *       │
 *       ├─► (Razorpay payment failed) ──► PAYMENT_FAILED ──► (Retry) ──► PAYMENT_PENDING
 *       │
 *       ├─► (Payment link expired) ──► PAYMENT_EXPIRED [TERMINAL]
 *       │
 *       └─► (User/System cancellation) ──► CANCELLED [TERMINAL]
 *
 * Rules:
 *   1. PAID is terminal and irreversible. No event or agent call can ever transition
 *      an order out of PAID.
 *   2. PAYMENT_EXPIRED and CANCELLED are terminal.
 *   3. PAYMENT_FAILED allows retry back to PAYMENT_PENDING.
 *   4. Invalid transitions (e.g. PAID -> PENDING_CONFIRMATION) are strictly rejected.
 * ============================================================================
 */

import type { OrderStatus } from '../db/types.js';
import { conflict } from '../utils/errors.js';

export const ALLOWED_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_CONFIRMATION: ['ORDER_CREATED', 'CANCELLED'],
  ORDER_CREATED: ['PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED'],
  PAID: [],
  PAYMENT_FAILED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_EXPIRED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES = new Set<OrderStatus>(['PAID', 'PAYMENT_EXPIRED', 'CANCELLED']);

export const PAYABLE_STATUSES = new Set<OrderStatus>([
  'PENDING_CONFIRMATION',
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
]);

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isPayableStatus(status: OrderStatus): boolean {
  return PAYABLE_STATUSES.has(status);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // Idempotent same-state is allowed
  return ALLOWED_ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
  orderId?: string,
): void {
  if (from === to) return;

  if (!canTransitionOrder(from, to)) {
    if (from === 'PAID') {
      throw conflict(
        'INVALID_STATE_TRANSITION',
        `Order is already PAID and settled. Cannot transition to ${to}.`,
        { orderId, from, to },
      );
    }

    throw conflict(
      'INVALID_STATE_TRANSITION',
      `Illegal order state transition from ${from} to ${to}. ` +
        `Allowed transitions from ${from}: [${ALLOWED_ORDER_TRANSITIONS[from].join(', ')}].`,
      { orderId, from, to, allowed: ALLOWED_ORDER_TRANSITIONS[from] },
    );
  }
}

export function describeStateTransition(from: OrderStatus, to: OrderStatus): string {
  if (from === to) return `Order maintained state at ${from}.`;
  if (to === 'ORDER_CREATED') return 'Order confirmed by user.';
  if (to === 'PAYMENT_PENDING') return 'Payment instrument generated and awaiting customer completion.';
  if (to === 'PAID') return 'Payment verified and captured by Razorpay.';
  if (to === 'PAYMENT_FAILED') return 'Payment attempt failed at provider; retry available.';
  if (to === 'PAYMENT_EXPIRED') return 'Payment link or order expired at provider.';
  if (to === 'CANCELLED') return 'Order cancelled.';
  return `Order transitioned from ${from} to ${to}.`;
}
