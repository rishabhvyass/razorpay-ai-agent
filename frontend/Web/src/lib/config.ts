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

export const config = {
  apiUrl: rawApiUrl.replace(/\/+$/, ''),

  /**
   * Serve the not-yet-built backend routes (chat, Razorpay order creation,
   * payment links, webhook verification) from src/services/mock/.
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
