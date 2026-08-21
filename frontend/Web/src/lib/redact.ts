/**
 * Redaction for anything rendered from a JSON payload.
 *
 * Agent activity rows include the `input` and `output` of tool calls, and the
 * Activity page shows them so a reviewer can audit what the agent did. Those
 * payloads are written by the backend, which means their shape is not fully under
 * this app's control.
 *
 * Spec section 17 / 35 is unconditional: never display API keys, secrets,
 * authorization headers, the Supabase service role key, or the Razorpay secret. So
 * rather than trusting that no future tool ever logs a token, every JSON value
 * displayed in the UI passes through here first and any suspiciously-named field is
 * replaced before it can reach the DOM.
 *
 * This is defence in depth, not the primary control - the frontend has no secrets
 * of its own and never sends an Authorization header. It exists because the cost of
 * being wrong is a credential in a screenshot.
 */

const SENSITIVE_KEY = /(secret|password|passwd|token|api[-_]?key|authorization|auth|credential|signature|private[-_]?key|service[-_]?role|bearer)/i;

/** Values that look like a credential regardless of the key they arrived under. */
const SENSITIVE_VALUE = /^(sb_secret_|sb_publishable_|sk-|rzp_live_|rzp_test_|eyJ[A-Za-z0-9_-]{10,}\.)/;

const MASK = '[redacted]';

export function redactJson(value: unknown, depth = 0): unknown {
  // Bail out rather than recursing forever on a cyclic or pathological payload.
  if (depth > 8) return '[truncated]';

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && SENSITIVE_VALUE.test(value)) return MASK;
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactJson(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY.test(key) ? MASK : redactJson(item, depth + 1);
  }
  return result;
}

/** Pretty-print a payload for display, redacted, with a length cap. */
export function formatJsonForDisplay(value: unknown, maxChars = 1200): string {
  try {
    const text = JSON.stringify(redactJson(value), null, 2);
    if (!text) return '';
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n… truncated` : text;
  } catch {
    return '[unserialisable]';
  }
}
