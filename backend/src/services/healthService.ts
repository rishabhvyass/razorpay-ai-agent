/**
 * Health and readiness.
 *
 * Two distinct checks, because orchestrators need to tell two different questions
 * apart:
 *
 *   Liveness  (`/health`)       - is the process running? Never touches the
 *                                 database. If a liveness probe fails on a
 *                                 database outage, the orchestrator restarts a
 *                                 perfectly healthy process, repeatedly, while the
 *                                 database is already struggling.
 *
 *   Readiness (`/health/ready`) - can this instance serve traffic? Includes a real
 *                                 Supabase round-trip, so a load balancer can take
 *                                 it out of rotation without killing it.
 *
 * Neither response contains a credential, a connection string, a key fragment, or
 * a host name. Health endpoints are the most-scraped unauthenticated surface on
 * any service, and "just the project ref, it's not secret" is how a project ref
 * ends up in someone's reconnaissance notes. What a caller gets is reachable
 * yes/no and a latency number.
 */

import { supabaseAdmin } from '../db/supabase.js';
import { env } from '../config/env.js';

export const SERVICE_NAME = 'checkout-concierge-backend';

export interface LivenessReport {
  status: 'ok';
  service: string;
  environment: string;
}

export interface DependencyReport {
  reachable: boolean;
  latencyMs: number;
  /** Generic classification only - never the driver's message. */
  error?: string;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  service: string;
  environment: string;
  uptimeSeconds: number;
  checks: {
    database: DependencyReport;
  };
}

export function getLiveness(): LivenessReport {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    environment: env.NODE_ENV,
  };
}

/** Above this, treat the database as unreachable rather than waiting. */
const DB_CHECK_TIMEOUT_MS = 3_000;

/**
 * Prove that Supabase is reachable, the credentials work, the migration has run,
 * and the catalogue is seeded.
 *
 * This deliberately does NOT use `{ count: 'exact', head: true }`, which is the
 * obvious way to write it and is silently useless. A head request gets HTTP 204
 * with no body, and PostgREST has nowhere to put an error in a bodyless response,
 * so supabase-js reports `error: null` for a table that does not exist. Verified
 * against this project: a head-count on `products` and on `totally_made_up_xyz`
 * both return 204 / error null / count null. A readiness probe built on that
 * answers "ok" for a database with no schema at all - the single state this phase
 * is most likely to be in - and `count` is always null anyway, because the number
 * travels in a Content-Range header that a 204 does not carry.
 *
 * So: a real one-row select. It costs one id over the wire and it can actually
 * fail, which is the entire job. The outcomes are reported distinctly, because
 * "cannot reach Supabase" and "reached it, but nobody ran the migration" need
 * different fixes and a probe that conflates them sends you to the wrong one.
 */
async function checkDatabase(): Promise<DependencyReport> {
  const startedAt = process.hrtime.bigint();

  const elapsedMs = (): number => Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  try {
    const query = supabaseAdmin.from('products').select('id').limit(1);

    // supabase-js has no per-request timeout, and an unreachable host can hang for
    // the OS TCP timeout - long enough for a readiness probe to time out first and
    // report nothing useful. Race it ourselves.
    const timeout = new Promise<never>((_resolve, reject) => {
      setTimeout(
        () => reject(new Error('timeout')),
        DB_CHECK_TIMEOUT_MS,
      ).unref(); // do not hold the event loop open on shutdown
    });

    const { data, error } = await Promise.race([query, timeout]);

    if (error !== null) {
      return {
        reachable: false,
        latencyMs: Math.round(elapsedMs()),
        // Classify, do not forward. A PostgREST error message can quote schema
        // details, and an auth failure message can hint at key shape.
        error: classifyDbError(error.code),
      };
    }

    if (data === null || data.length === 0) {
      // Schema is present and readable, but the catalogue is empty. Not "ok":
      // every product route would return [] and the demo has nothing to sell.
      return {
        reachable: false,
        latencyMs: Math.round(elapsedMs()),
        error: 'not_seeded',
      };
    }

    return { reachable: true, latencyMs: Math.round(elapsedMs()) };
  } catch (cause) {
    const isTimeout = cause instanceof Error && cause.message === 'timeout';
    return {
      reachable: false,
      latencyMs: Math.round(elapsedMs()),
      error: isTimeout ? 'timeout' : 'unreachable',
    };
  }
}

/**
 * Map a PostgREST code to a caller-safe classification.
 *
 * PGRST205 is "table not in the schema cache", which in practice means the
 * migration has not been applied - by far the most common first-run failure, and
 * worth naming rather than folding into a generic query failure.
 */
function classifyDbError(code: string | null | undefined): string {
  switch (code) {
    case 'PGRST205':
    case '42P01': // undefined_table
      return 'not_migrated';
    case '42501':
      return 'permission_denied';
    default:
      return 'query_failed';
  }
}

export async function getReadiness(): Promise<ReadinessReport> {
  const database = await checkDatabase();

  return {
    status: database.reachable ? 'ok' : 'degraded',
    service: SERVICE_NAME,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database },
  };
}
