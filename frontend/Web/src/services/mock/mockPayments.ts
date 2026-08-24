/**
 * Development fallback for the payment states the backend has not built.
 *
 * WHAT IS REAL HERE: nothing about the money. The order row itself is real -
 * `POST /api/orders` exists and writes PENDING_CONFIRMATION to Postgres. This
 * module overlays the states *after* that point, because the endpoints that would
 * produce them do not exist:
 *
 *   - Razorpay order creation      (payments layer, unbuilt)
 *   - payment link generation      (payments layer, unbuilt)
 *   - POST /api/webhooks/razorpay  (listed in the backend's own notImplementedYet)
 *   - any status transition at all (backend exposes none, deliberately)
 *
 * So the overlay is keyed by a real order id and is explicitly labelled wherever
 * it surfaces. `mock: true` travels with every value this module returns.
 *
 * The identifiers below are shaped like Razorpay's (order_…, plink_…, pay_…) but
 * are locally generated and meaningless. They are never sent anywhere. The
 * "payment URL" is a local route, not a provider URL - this module never
 * constructs a real Razorpay checkout link, which is the rule from spec section 19.
 *
 * DELETING THIS: set VITE_USE_MOCK=false. It is force-disabled in production
 * builds regardless (see lib/config.ts), because fabricated payment data reaching
 * a real deployment is the exact failure the product principle forbids.
 */

import type { OrderStatus } from '@/types';

export interface MockPaymentState {
  orderId: string;
  status: OrderStatus;
  razorpayOrderId: string;
  paymentLinkId: string;
  paymentUrl: string;
  paymentId: string | null;
  /** Set when the simulated provider reported a failure. */
  failureReason: string | null;
  updatedAt: string;
}

/**
 * Survives a page reload so a polling status view does not reset mid-demo.
 *
 * localStorage, NOT sessionStorage, and specifically to match `cc.orderIds` in
 * lib/session.ts. The overlay is keyed by order id, so if the two stores have
 * different lifetimes they disagree: the orders list (localStorage) would show an
 * order whose payment state (sessionStorage) had silently evaporated, and the same
 * order would read PAID in one tab and PENDING_CONFIRMATION in another. Real
 * provider state is not per-tab, so the thing standing in for it must not be either.
 */
const STORAGE_KEY = 'cc.mock.payments.v1';

function loadStore(): Map<string, MockPaymentState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, MockPaymentState>));
  } catch {
    return new Map();
  }
}

function persist(store: Map<string, MockPaymentState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(store)));
  } catch {
    // localStorage unavailable (private mode quota). In-memory still works for
    // the current page, which is enough - this is a dev fallback.
  }
}

const store = loadStore();

/** Razorpay-shaped but locally generated. Not a real identifier. */
function fakeId(prefix: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 14; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}_${out}`;
}

/**
 * Stand in for "Razorpay order created" + "payment link generated".
 *
 * Idempotent per order id: calling twice returns the same simulated link rather
 * than issuing a second one, matching how the real flow will behave.
 */
export function createMockPaymentLink(orderId: string): MockPaymentState {
  const existing = store.get(orderId);
  if (existing) return existing;

  const state: MockPaymentState = {
    orderId,
    status: 'PAYMENT_PENDING',
    razorpayOrderId: fakeId('order'),
    paymentLinkId: fakeId('plink'),
    // A local in-app route, NOT a provider URL. Opening it shows the simulated
    // checkout, which exists only so the pending -> verified transition is
    // demonstrable without a payments backend. The leading slash is what the
    // payment card uses to tell an internal route from a real provider link -
    // provider links open in a new tab, this one navigates in-app.
    paymentUrl: `/mock-checkout/${orderId}`,
    paymentId: null,
    failureReason: null,
    updatedAt: new Date().toISOString(),
  };

  store.set(orderId, state);
  persist(store);
  return state;
}

export function getMockPaymentState(orderId: string): MockPaymentState | undefined {
  return store.get(orderId);
}

/**
 * Stand in for a signature-verified webhook arriving.
 *
 * `outcome` is explicit rather than random: the Razorpay challenge asks for one
 * failure handled gracefully, and a reviewer needs to be able to reach that state
 * on demand instead of retrying until chance produces it.
 */
export function settleMockPayment(
  orderId: string,
  outcome: 'success' | 'failure',
): MockPaymentState | undefined {
  const state = store.get(orderId);
  if (!state) return undefined;

  const settled: MockPaymentState = {
    ...state,
    status: outcome === 'success' ? 'PAID' : 'PAYMENT_FAILED',
    paymentId: outcome === 'success' ? fakeId('pay') : null,
    failureReason:
      outcome === 'failure'
        ? 'Simulated provider response: payment was not captured. No successful payment was recorded.'
        : null,
    updatedAt: new Date().toISOString(),
  };

  store.set(orderId, settled);
  persist(store);
  return settled;
}

/** Clear the overlay - used by the Settings page's reset action. */
export function resetMockPayments(): void {
  store.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasMockPayments(): boolean {
  return store.size > 0;
}
