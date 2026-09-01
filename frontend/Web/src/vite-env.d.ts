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
  /** Serve POST /api/chat and labelled local states from src/services/mock/. */
  readonly VITE_USE_MOCK?: string;
  /**
   * Razorpay's PUBLISHABLE key id (`rzp_test_...`), and optional.
   *
   * This one is safe here and is the only Razorpay value that ever will be: it is the
   * half Razorpay designed to sit in a browser and it can create nothing on its own.
   * Its partner, RAZORPAY_KEY_SECRET, signs orders and payments - it stays in the
   * backend environment and must never be given a VITE_ name.
   *
   * Optional because POST /api/create-order returns the key that created the Razorpay
   * order, which is the one the modal is opened with. Set this only if you want the
   * cross-check in lib/config.ts to catch a frontend and backend pointed at different
   * Razorpay accounts.
   */
  readonly VITE_RAZORPAY_KEY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
