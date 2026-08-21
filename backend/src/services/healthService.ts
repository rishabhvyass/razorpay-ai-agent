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
 * Cheapest possible proof that Supabase is reachable and this project's
 * credentials work: a HEAD-style count against `products` with no rows returned.
 *
 * It exercises the whole path - DNS, TLS, PostgREST, auth, Postgres - without
 * transferring data, and `products` is chosen because it always has rows after
 * seeding, so an empty result is a real signal rather than a normal state.
 */
async function checkDatabase(): Promise<DependencyReport> {
  const startedAt = process.hrtime.bigint();

  const elapsedMs = (): number => Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  try {
    const query = supabaseAdmin.from('products').select('id', { count: 'exact', head: true });

    // supabase-js has no per-request timeout, and an unreachable host can hang for
    // the OS TCP timeout - long enough for a readiness probe to time out first and
    // report nothing useful. Race it ourselves.
    const timeout = new Promise<never>((_resolve, reject) => {
      setTimeout(
        () => reject(new Error('timeout')),
        DB_CHECK_TIMEOUT_MS,
      ).unref(); // do not hold the event loop open on shutdown
    });

    const { error } = await Promise.race([query, timeout]);

    if (error !== null) {
      return {
        reachable: false,
        latencyMs: Math.round(elapsedMs()),
        // Classify, do not forward. A PostgREST error message can quote schema
        // details, and an auth failure message can hint at key shape.
        error: error.code === '42501' ? 'permission_denied' : 'query_failed',
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
