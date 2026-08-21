/**
 * Health routes.
 *
 * Mounted at `/health`, so:
 *   GET /health        liveness  - process is up. No database call.
 *   GET /health/ready  readiness - includes a real Supabase round-trip.
 *
 * Unauthenticated by design, which is why neither response carries anything
 * about the environment beyond its name. See services/healthService.ts.
 */

import { Router } from 'express';

import { getLiveness, getReadiness } from '../services/healthService.js';

export const healthRouter = Router();

/**
 * Liveness. Returns exactly:
 *   { "status": "ok", "service": "checkout-concierge-backend", "environment": "development" }
 */
healthRouter.get('/', (_req, res) => {
  res.json(getLiveness());
});

/**
 * Readiness. 200 when the database answered, 503 when it did not.
 *
 * The status code carries the signal so a load balancer needs no body parsing;
 * the body explains it for a human reading `curl -i`.
 */
healthRouter.get('/ready', async (_req, res) => {
  const report = await getReadiness();
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});
