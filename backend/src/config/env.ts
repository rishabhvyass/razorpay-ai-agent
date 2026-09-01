/**
 * Environment configuration.
 *
 * Validated once, at import time, with Zod. If anything required is missing or
 * malformed the process exits immediately with a readable report of every
 * problem at once - not one error per restart.
 *
 * Failing fast matters more here than anywhere else in the codebase: a server
 * that boots with a missing Supabase key looks healthy and then fails on the
 * first customer request. Better to never accept traffic.
 *
 * Everything else in the app imports `env` from here. Nothing else reads
 * process.env directly.
 */

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// `quiet` suppresses dotenv's startup banner so it does not pollute logs.
// Real deployments inject env vars directly; a missing .env file is not an
// error, it just means nothing was loaded from disk.
loadDotenv({ quiet: true });

/**
 * Treat an unset variable and an empty one (`FOO=`) as the same thing.
 * Without this, a blank line in .env satisfies `z.string()` and the failure
 * surfaces later as a confusing 401 from Supabase.
 */
const blankToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const requiredSecret = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z
      .string({ error: `${label} is required` })
      .min(20, `${label} looks too short to be a real key - re-copy it from the Supabase dashboard`),
  );

/**
 * A credential the server can run without.
 *
 * Unset is legitimate here, which is why these are not `requiredSecret`: the
 * database layer and every read route work with no payment provider configured,
 * and refusing to boot without one would mean nobody could run the catalogue
 * locally. The routes that need a key report their own absence instead - see
 * `isRazorpayConfigured` below and api/payments.ts.
 *
 * `minLength` still applies when a value IS present, so a truncated paste fails
 * at boot rather than as a 401 from the provider on the first customer.
 */
const optionalSecret = (label: string, minLength = 16) =>
  z.preprocess(
    blankToUndefined,
    z
      .string()
      .min(minLength, `${label} looks too short to be a real value - re-copy it`)
      .optional(),
  );

const envSchema = z
  .object({
  /** e.g. https://abcdefghijklmnop.supabase.co */
  SUPABASE_URL: z.preprocess(
    blankToUndefined,
    z.url({ error: 'SUPABASE_URL is required and must be a full https URL' }),
  ),

  /**
   * Public / publishable key. Safe to ship to clients: every query made with it
   * is subject to Row Level Security.
   */
  SUPABASE_ANON_KEY: requiredSecret('SUPABASE_ANON_KEY'),

  /**
   * Service-role key. BACKEND ONLY.
   *
   * This key bypasses Row Level Security completely - it can read and write
   * every row in every table regardless of the policies in
   * supabase/migrations/001_initial_schema.sql. It must never appear in a
   * React Native bundle, a Next.js client component, an API response, a log
   * line, or an error message.
   */
  SUPABASE_SERVICE_ROLE_KEY: requiredSecret('SUPABASE_SERVICE_ROLE_KEY'),

  PORT: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(65535).default(3000),
  ),

  NODE_ENV: z.preprocess(
    blankToUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),

  // ---------------------------------------------------------------------------
  // Razorpay
  //
  // All three or none - enforced by the superRefine below. A half-configured
  // provider is the one genuinely dangerous state: with a key id and no webhook
  // secret the server can create payment links and take money, then be unable to
  // verify the confirmation that says the money arrived. It would have to either
  // trust an unauthenticated POST or leave every paid order stuck unpaid.
  // ---------------------------------------------------------------------------

  /**
   * Publishable key id, e.g. `rzp_test_XXXXXXXXXXXXXX`. Not a secret in the way
   * the two below are - it is designed to appear in Razorpay's own checkout - but
   * it is still not sent to our browser bundle, because nothing in this design
   * needs it there. Standard Checkout receives the publishable id at runtime from
   * the backend's checkout-session response; the secret remains server-side.
   */
  RAZORPAY_KEY_ID: optionalSecret('RAZORPAY_KEY_ID'),

  /**
   * BACKEND ONLY. Half of the Basic-auth pair that can create payment links and
   * read payments on the account. Never log it, never return it, never put it in
   * an error message.
   */
  RAZORPAY_KEY_SECRET: optionalSecret('RAZORPAY_KEY_SECRET'),

  /**
   * BACKEND ONLY. Chosen by you when creating the webhook in the Razorpay
   * dashboard, not issued by Razorpay. Every inbound delivery is HMAC-SHA256'd
   * with this over the raw request body; without it, `POST /api/webhooks/razorpay`
   * would be an unauthenticated endpoint that marks orders PAID.
   */
  RAZORPAY_WEBHOOK_SECRET: optionalSecret('RAZORPAY_WEBHOOK_SECRET', 8),

  // ---------------------------------------------------------------------------
  // Agent providers
  // ---------------------------------------------------------------------------

  /** Direct OpenAI API key. BACKEND ONLY. */
  OPENAI_API_KEY: optionalSecret('OPENAI_API_KEY'),

  /** OpenAI model used by the chat agent. Defaults to the cost-efficient GPT-5 mini. */
  OPENAI_MODEL: z.preprocess(
    blankToUndefined,
    z.string().trim().min(3).optional(),
  ),

  /** Anthropic, OpenRouter or AgentRouter API key. BACKEND ONLY. */
  AGENTROUTER_API_KEY: optionalSecret('AGENTROUTER_API_KEY'),
  OPENROUTER_API_KEY: optionalSecret('OPENROUTER_API_KEY'),

  /**
   * Which model to use. E.g. tencent/hy3, minimax/minimax-m2.7:free, or claude-sonnet-4-20250514.
   */
  ANTHROPIC_MODEL: z.preprocess(
    blankToUndefined,
    z.string().min(3).optional(),
  ),

  /**
   * Custom base URL for Anthropic / AgentRouter API.
   * Defaults to https://agentrouter.org when using AgentRouter keys.
   */
  ANTHROPIC_BASE_URL: z.preprocess(
    blankToUndefined,
    z.string().url().optional(),
  ),

  /**
   * xAI / Grok API key (e.g. xai-...).
   */
  XAI_API_KEY: optionalSecret('XAI_API_KEY', 10),

  /**
   * Grok model name. Defaults to grok-4.6 or grok-2-latest.
   */
  GROK_MODEL: z.preprocess(
    blankToUndefined,
    z.string().min(3).optional(),
  ),
  })
  .superRefine((value, ctx) => {
    // Report against each missing variable's own path, so the boot-time report
    // below names exactly what to add rather than describing the group.
    const razorpay = {
      RAZORPAY_KEY_ID: value.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: value.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: value.RAZORPAY_WEBHOOK_SECRET,
    };

    const present = Object.entries(razorpay).filter(([, v]) => v !== undefined);

    if (present.length > 0 && present.length < 3) {
      for (const [key, v] of Object.entries(razorpay)) {
        if (v === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message:
              'Razorpay is partly configured. Set all three of RAZORPAY_KEY_ID, ' +
              'RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET, or none of them.',
          });
        }
      }
    }

    // A live key against a development database would create real payment links
    // that charge real cards, and settle them against seed data. Test mode is not
    // the safe default here - it is the only correct one outside production.
    if (
      value.RAZORPAY_KEY_ID !== undefined &&
      value.NODE_ENV !== 'production' &&
      !value.RAZORPAY_KEY_ID.startsWith('rzp_test_')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['RAZORPAY_KEY_ID'],
        message:
          `NODE_ENV is '${value.NODE_ENV}', so RAZORPAY_KEY_ID must be a test-mode key ` +
          "(it starts with 'rzp_test_'). A live key here would charge real cards.",
      });
    }
  });

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    // Deliberately console.error + exit rather than throw: an unhandled
    // rejection during module init produces a stack trace that buries the
    // actual problem. Note that only variable NAMES are printed, never values.
    console.error(
      [
        '',
        'Invalid environment configuration. The server will not start.',
        '',
        problems,
        '',
        'Fix: copy .env.example to .env and fill in the values. Supabase keys come',
        'from Supabase Dashboard -> Project Settings -> API; Razorpay keys from',
        'Razorpay Dashboard -> Settings -> API Keys, in Test Mode.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Razorpay credentials, or null when the provider is not configured.
 *
 * Shaped as one nullable object rather than three optional strings so a single
 * null check narrows all three to `string` for callers. Without it every call
 * site would need its own non-null assertion, and an assertion is exactly the
 * thing that outlives the invariant it assumed.
 *
 * The all-or-nothing rule in the schema above is what makes this sound: there is
 * no state in which one of these is set and another is not.
 */
export const razorpayConfig: {
  readonly keyId: string;
  readonly keySecret: string;
  readonly webhookSecret: string;
} | null =
  env.RAZORPAY_KEY_ID !== undefined &&
  env.RAZORPAY_KEY_SECRET !== undefined &&
  env.RAZORPAY_WEBHOOK_SECRET !== undefined
    ? {
        keyId: env.RAZORPAY_KEY_ID,
        keySecret: env.RAZORPAY_KEY_SECRET,
        webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
      }
    : null;

export const isRazorpayConfigured = razorpayConfig !== null;

/**
 * The variable names a caller must set to enable payments.
 *
 * Names only. Printed in a 501 response body, so it must never become values -
 * the same rule the boot-time report above follows.
 */
export const RAZORPAY_ENV_VARS = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
] as const;

export interface AgentConfig {
  readonly provider: 'openai' | 'grok' | 'anthropic';
  readonly apiKey: string;
  readonly model: string;
  readonly baseURL?: string;
}

export const agentConfig: AgentConfig | null = (() => {
  if (env.OPENAI_API_KEY !== undefined) {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? 'gpt-5-mini',
    };
  }

  if (
    env.XAI_API_KEY !== undefined ||
    env.AGENTROUTER_API_KEY?.startsWith('xai-')
  ) {
    const key = env.XAI_API_KEY ?? env.AGENTROUTER_API_KEY!;
    return {
      provider: 'grok',
      apiKey: key,
      model: env.GROK_MODEL ?? 'grok-4.6',
      baseURL: 'https://api.x.ai/v1',
    };
  }

  const orKey = env.OPENROUTER_API_KEY ?? env.AGENTROUTER_API_KEY;
  if (orKey !== undefined) {
    return {
      provider: 'anthropic',
      apiKey: orKey,
      model:
        env.ANTHROPIC_MODEL ??
        (orKey.startsWith('sk-or-')
          ? 'tencent/hy3'
          : 'claude-sonnet-4-20250514'),
      baseURL:
        env.ANTHROPIC_BASE_URL !== undefined
          ? env.ANTHROPIC_BASE_URL.replace(/\/v1\/?$/, '')
          : orKey.startsWith('sk-or-')
            ? 'https://openrouter.ai/api'
            : orKey.startsWith('sk-ant-')
              ? undefined
              : 'https://agentrouter.org',
    };
  }

  return null;
})();

export const isAgentConfigured = agentConfig !== null;
