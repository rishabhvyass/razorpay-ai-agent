/**
 * The single HTTP boundary.
 *
 * No component calls `fetch`. Everything goes through `request()` here, which is
 * what makes the error envelope, the request-id propagation and the timeout
 * behaviour uniform instead of re-implemented per call site.
 *
 * The backend answers in two shapes and only two:
 *   success  { data, meta?, requestId }
 *   failure  { error: { code, message, requestId, details? } }
 *
 * so `ApiError` can always carry a code and a requestId - the same requestId the
 * server logged. That pairing is the whole reason an error surface in this app can
 * say "quote req_xxx" instead of "something went wrong".
 */

import { config } from '@/lib/config';
import type { ApiErrorBody } from '@/types';

/** A failure with the backend's own error code and request id attached. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: Record<string, unknown> | undefined;
  /**
   * Set only when the thrower knows something the status code cannot express.
   * A response-shape mismatch is the case in point: it can arrive on a perfectly
   * healthy HTTP 200, yet retrying is futile because the same request returns the
   * same unrecognised shape. Offering a "Try again" there wastes the user's time
   * and hides a bug behind what looks like a flaky network.
   */
  private readonly retryableOverride: boolean | undefined;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    requestId?: string | null;
    details?: Record<string, unknown>;
    /** Overrides the status-based guess in `isRetryable`. */
    retryable?: boolean;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId ?? null;
    this.details = init.details;
    this.retryableOverride = init.retryable;
  }

  /** True when retrying could plausibly succeed - drives "Try again" buttons. */
  get isRetryable(): boolean {
    if (this.retryableOverride !== undefined) return this.retryableOverride;
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }

  /** True when the backend is unreachable rather than refusing. */
  get isNetworkFailure(): boolean {
    return this.status === 0;
  }

  /** True when the route simply is not built yet. */
  get isNotImplemented(): boolean {
    return this.status === 404 && this.code === 'ROUTE_NOT_FOUND';
  }
}

/** Endpoints can hang; a request that never settles leaves a spinner forever. */
const DEFAULT_TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Appended as a query string; undefined and null entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const base = `${config.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Perform a request and unwrap the success envelope's `data`.
 *
 * Use `requestEnvelope` instead when the caller needs `meta` (pagination) too.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const envelope = await requestEnvelope<T>(path, options);
  return envelope.data;
}

/** As `request`, but returns the whole envelope so `meta` survives. */
export async function requestEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown>; requestId: string }> {
  const { method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS, query } = options;

  // Compose the caller's signal with our timeout so either can abort. Without
  // this, a query cancelled by React Query would still hold the timeout open.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch (cause) {
    const aborted = controller.signal.aborted;
    // The timeout path aborts with `new Error('timeout')` (above); a caller abort
    // forwards the caller's reason. `signal.reason` is typed `any`, so narrow it
    // through Error rather than reaching into `.message` blind.
    const reason: unknown = controller.signal.reason;
    const timedOut = aborted && reason instanceof Error && reason.message === 'timeout';

    // A caller-driven cancellation must propagate as an abort, not as a visible
    // error - React Query treats it as a cancellation and keeps the prior data.
    if (aborted && !timedOut) throw cause;

    throw new ApiError({
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: timedOut
        ? 'The backend did not respond in time.'
        : 'Could not reach the backend. Is it running on port 3000?',
      details: { cause: String(cause) },
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // A non-JSON body from a proxy or crash page. Surface it as a real error
      // rather than letting `undefined` flow into the UI as empty state.
      throw new ApiError({
        status: response.status,
        code: 'MALFORMED_RESPONSE',
        message: `Backend returned a non-JSON response (HTTP ${response.status}).`,
        details: { preview: text.slice(0, 200) },
      });
    }
  }

  if (!response.ok) {
    const errorBody = parsed as ApiErrorBody | null;
    const err = errorBody?.error;
    throw new ApiError({
      status: response.status,
      code: err?.code ?? 'HTTP_ERROR',
      message: err?.message ?? `Request failed with HTTP ${response.status}.`,
      requestId: err?.requestId ?? null,
      details: err?.details,
    });
  }

  const envelope = parsed as { data: T; meta?: Record<string, unknown>; requestId: string } | null;

  // `/health` answers with a bare object rather than the data envelope. Treat a
  // missing `data` key as "the body IS the data" instead of returning undefined.
  if (envelope && typeof envelope === 'object' && !('data' in envelope)) {
    return { data: parsed as T, requestId: '' };
  }

  return {
    data: envelope?.data as T,
    meta: envelope?.meta,
    requestId: envelope?.requestId ?? '',
  };
}

/** Convert anything thrown into an ApiError so error UIs have one shape. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
  });
}
