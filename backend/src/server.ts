/**
 * Checkout Concierge - server entry point.
 *
 * Express app assembly and lifecycle. Middleware order below is not arbitrary;
 * each position is load-bearing and noted where it matters.
 *
 * What this phase deliberately does not include: no Claude client, no
 * AgentRouter, no MCP server, no Razorpay, no payment links, no webhook handler,
 * no Telegram. The database and its access layer come first, because everything
 * above depends on the order state machine and the audit trail being right, and
 * those are far cheaper to correct now than after four layers are built on them.
 */

import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { pathToFileURL } from 'node:url';

import { conversationsRouter } from './api/conversations.js';
import { healthRouter } from './api/health.js';
import { ordersRouter } from './api/orders.js';
import { productsRouter } from './api/products.js';
import { env, isProduction } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { REQUEST_ID_HEADER, requestId } from './middleware/requestId.js';
import { SERVICE_NAME, getReadiness } from './services/healthService.js';

export function createApp(): Express {
  const app = express();

  // Express advertises itself in every response by default. Free reconnaissance
  // for no benefit.
  app.disable('x-powered-by');

  // Not behind a proxy in this phase. When one is added, set this to the number of
  // trusted hops - never `true`, which lets any client spoof X-Forwarded-For and
  // with it every rate limit or audit entry keyed on client IP.
  app.set('trust proxy', false);

  // FIRST: every later middleware, including the error handler, expects
  // req.requestId to exist. An error thrown by the body parser still has to be
  // reportable, and it cannot be if the id was assigned after it.
  app.use(requestId);

  app.use(
    cors({
      // Wide open for local development. Before this is deployed anywhere real,
      // replace with an explicit origin allowlist - and note that a permissive
      // CORS policy only becomes dangerous once cookie or header auth exists,
      // which is exactly what the auth phase adds. Change it then, not later.
      origin: true,
      credentials: false,
      exposedHeaders: [REQUEST_ID_HEADER],
    }),
  );

  // 100kb, well above any legitimate request here. The default is also 100kb;
  // stating it means a future change is a decision rather than an inheritance.
  app.use(express.json({ limit: '100kb' }));

  // One line per request, with the id that ties it to everything downstream.
  // Deliberately not in production: this writes unstructured text, and a real
  // deployment should emit structured logs from a proper logger instead.
  if (!isProduction) {
    app.use((req, res, next) => {
      const startedAt = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        console.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms [${req.requestId}]`,
        );
      });
      next();
    });
  }

  app.use('/health', healthRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/conversations', conversationsRouter);
  // Mounted at /api because this router owns both /api/orders/* and
  // /api/users/:userId/orders.
  app.use('/api', ordersRouter);

  /**
   * Route index. Useful during development, and it documents what is not built
   * yet - so a caller hitting /api/chat learns it is coming rather than getting a
   * bare 404.
   */
  app.get('/', (req, res) => {
    res.json({
      service: SERVICE_NAME,
      phase: 'backend-foundation',
      endpoints: {
        health: ['GET /health', 'GET /health/ready'],
        products: [
          'GET /api/products',
          'GET /api/products/categories',
          'GET /api/products/:id',
        ],
        conversations: [
          'POST /api/conversations',
          'GET /api/conversations/:id',
          'PATCH /api/conversations/:id',
          'GET /api/conversations/:id/messages',
          'POST /api/conversations/:id/messages',
          'GET /api/conversations/:id/activity',
        ],
        orders: [
          'POST /api/orders',
          'GET /api/orders/:id',
          'GET /api/orders/:id/activity',
          'GET /api/users/:userId/orders',
        ],
      },
      notImplementedYet: [
        'POST /api/chat (needs the Claude + MCP layer)',
        'POST /api/webhooks/razorpay (needs the payments layer)',
      ],
      requestId: req.requestId,
    });
  });

  // AFTER all routers: anything unmatched becomes a ROUTE_NOT_FOUND in the
  // standard envelope.
  app.use(notFoundHandler);

  // LAST, and must be last: Express selects the error handler by arity, and only
  // considers handlers registered after the one that threw.
  app.use(errorHandler);

  return app;
}

/**
 * Start listening.
 *
 * Guarded by `import.meta.url` so importing this module for a test does not bind a
 * port. `env` was already validated at import time - the process has exited by now
 * if a required variable was missing.
 */
async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`\n${SERVICE_NAME}`);
    console.log(`  listening   http://localhost:${env.PORT}`);
    console.log(`  environment ${env.NODE_ENV}`);
    console.log(`  health      http://localhost:${env.PORT}/health\n`);
  });

  // Report database reachability at boot without blocking the listen. Starting
  // anyway is intentional: a service that refuses to start when its database is
  // briefly unavailable cannot recover on its own, whereas one that starts
  // degraded and reports it through /health/ready can.
  void getReadiness().then((report) => {
    if (report.checks.database.reachable) {
      console.log(`  database    connected (${report.checks.database.latencyMs}ms)\n`);
    } else {
      console.warn(
        `  database    NOT REACHABLE (${report.checks.database.error ?? 'unknown'}).\n` +
          '              Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env,\n' +
          '              and that supabase/migrations/001_initial_schema.sql has been run.\n',
      );
    }
  });

  // Finish in-flight requests before exiting, so a deploy does not sever a
  // response mid-write. The timer is unref'd and the handler is registered once
  // per signal.
  const shutdown = (signal: string): void => {
    console.log(`\n${signal} received, shutting down.`);

    server.close(() => {
      console.log('Closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Did not close in 10s; forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Run only when executed directly, not when imported by a test.
 *
 * Comparing the module's own URL against argv[1] is the ESM equivalent of
 * `require.main === module`. `pathToFileURL` handles the Windows drive-letter and
 * separator differences that make a raw string comparison fail.
 */
const entryPoint = process.argv[1];
const isDirectRun = entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href;

if (isDirectRun) {
  await main();
}
