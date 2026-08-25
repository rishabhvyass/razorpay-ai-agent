/**
 * Frontend runtime configuration.
 *
 * Read once, here. Nothing else in the app touches `import.meta.env`, for the
 * same reason the backend funnels everything through config/env.ts: one place
 * to look when a value is wrong, and one place that documents what each flag
 * actually changes.
 *
 * Only VITE_-prefixed variables exist in the bundle. There is deliberately no
 * code path in this app that reads a secret - see .env.example.
 */

/** Truthy parse that treats an unset var as false rather than throwing. */
const flag = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

/**
 * Base URL for the backend.
 *
 * Empty string means "same origin", which in development means the Vite proxy
 * in vite.config.ts forwards to localhost:3000. A trailing slash is stripped so
 * callers can always join with a leading-slash path.
 */
const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();

/**
 * The PUBLISHABLE Razorpay key id, and optional.
 *
 * Safe in a bundle by design - it is the half Razorpay intends to sit in a browser,
 * it appears in every checkout integration, and it can create nothing on its own. The
 * secret half is `RAZORPAY_KEY_SECRET`, which lives in the backend environment and has
 * no VITE_ counterpart anywhere in this app.
 *
 * Optional because the app does not need it: `POST /api/create-order` returns the key
 * that created the Razorpay order, and that is the one the modal is opened with. Using
 * the server's answer means the key and the order can never come from different
 * accounts. When this variable IS set it is used as a cross-check - a mismatch is
 * reported as a configuration error rather than left to fail inside Razorpay's modal.
 */
const rawRazorpayKeyId = (import.meta.env.VITE_RAZORPAY_KEY_ID ?? '').trim();

export const config = {
  apiUrl: rawApiUrl.replace(/\/+$/, ''),

  /** Null when unset. See above - the backend's key_id is the one actually used. */
  razorpayKeyId: rawRazorpayKeyId === '' ? null : rawRazorpayKeyId,

  /**
   * Route the chat turn, and the payment states, through src/services/mock/.
   *
   * Chat is mocked because POST /api/chat is genuinely unbuilt. The payment
   * states are not: every payment route is real - both methods, links and
   * Standard Checkout - and this flag exists for them so the flow stays walkable
   * with no Razorpay keys configured and so the failure state is reachable on
   * demand. Product and order data always come from the backend in either mode -
   * there is no mock catalogue.
   *
   * The mock covers the payment-LINK method only. Standard Checkout has no mock
   * branch and refuses to run under this flag: it means Razorpay's own modal
   * collecting real card details, and a local stand-in for that would be a fake
   * payment screen, which is precisely what this product must not contain.
   *
   * Forced off in a production build: shipping fabricated payment data to a
   * real deployment is exactly the failure mode the product principle forbids,
   * so the flag cannot be switched on there even by mistake.
   */
  useMock: import.meta.env.PROD ? false : flag(import.meta.env.VITE_USE_MOCK, true),

  isDev: import.meta.env.DEV,
} as const;

/**
 * Endpoints the backend has not implemented yet, quoted from its own route
 * index at `GET /`. Surfaced in the UI (Settings page) rather than hidden, so
 * the gap is visible to anyone evaluating the demo.
 */
export const NOT_IMPLEMENTED_ENDPOINTS = [
  'POST /api/chat (needs the Claude + MCP layer)',
] as const;
