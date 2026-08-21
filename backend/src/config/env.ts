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

const envSchema = z.object({
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
        'Fix: copy .env.example to .env and fill in the values from',
        'Supabase Dashboard -> Project Settings -> API.',
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
