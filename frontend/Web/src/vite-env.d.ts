/// <reference types="vite/client" />

/**
 * The complete set of environment variables this frontend reads.
 *
 * Declaring them gives lib/config.ts real types instead of `string | undefined`
 * guesswork, and it puts the entire surface of what the browser can see in one
 * reviewable place.
 *
 * Nothing secret belongs here, ever. Vite inlines every VITE_-prefixed value
 * directly into the client bundle, so anything listed below is readable by anyone
 * who opens devtools. AGENTROUTER_API_KEY, ANTHROPIC_API_KEY,
 * RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY are
 * backend-only and must never appear in this file or in any .env the bundler reads.
 */
interface ImportMetaEnv {
  /** Backend origin. Empty in development - vite.config.ts proxies to :3000. */
  readonly VITE_API_URL?: string;
  /** Serve the two unbuilt backend routes from src/services/mock/. */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
