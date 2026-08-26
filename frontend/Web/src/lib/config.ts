/**
 * Frontend runtime configuration.
 *
 * Read once, here. Nothing else in the app touches `import.meta.env`, for the
 * same reason the backend funnels everything through config/env.ts: one place
 * to look when a value is wrong, and one place that documents what each flag
 * actually changes.
 */

/** Truthy parse that treats an unset var as false rather than throwing. */
const flag = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
const rawRazorpayKeyId = (import.meta.env.VITE_RAZORPAY_KEY_ID ?? '').trim();

export interface AppConfig {
  readonly apiUrl: string;
  readonly razorpayKeyId: string | null;
  readonly useMock: boolean;
  readonly isDev: boolean;
  readonly isProd: boolean;
}

export const config: AppConfig = {
  apiUrl: rawApiUrl,
  razorpayKeyId: rawRazorpayKeyId === '' ? null : rawRazorpayKeyId,
  useMock: import.meta.env.PROD ? false : flag(import.meta.env.VITE_USE_MOCK, false),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

/** Helper to construct full API endpoints safely */
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.apiUrl}${cleanPath}`;
}

/** Endpoints the backend has not implemented yet (all core endpoints are now live) */
export const NOT_IMPLEMENTED_ENDPOINTS: readonly string[] = [];
