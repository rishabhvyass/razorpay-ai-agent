/**
 * Checkout Concierge - server entry point.
 *
 * Express app assembly and lifecycle. Middleware order below is not arbitrary;
 * each position is load-bearing and noted where it matters.
 *
 * What this phase deliberately does not include: no Claude client, no
 * AgentRouter, no MCP server, no Telegram. The database and its access layer came
 * first, because everything above depends on the order state machine and the audit
 * trail being right, and those are far cheaper to correct now than after four
 * layers are built on them.
 *
 * The payments layer is built on top of it: Razorpay Payment Links, Standard
 * Checkout, the webhook receiver, and the reconcile endpoint. Two payment methods,
 * one settlement path - both end at `paymentService.applyProviderState`, which is
 * the only function that can mark an order PAID. The agent layer is still absent, so
 * /api/chat remains unimplemented - which means money can move here only through an
 * explicitly authorised HTTP call, never on an agent's own initiative.
 */

import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { pathToFileURL } from 'node:url';

import { chatRouter } from './api/chat.js';
import { checkoutRouter } from './api/checkout.js';
import { conversationsRouter } from './api/conversations.js';
import { healthRouter } from './api/health.js';
import { ordersRouter } from './api/orders.js';
import { paymentsRouter } from './api/payments.js';
import { productsRouter } from './api/products.js';
import { webhooksRouter } from './api/webhooks.js';
import { env, isProduction, agentConfig, isAgentConfigured, isRazorpayConfigured, RAZORPAY_ENV_VARS } from './config/env.js';
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

  /**
   * BEFORE express.json(), and this ordering is load-bearing.
   *
   * The Razorpay webhook is authenticated by an HMAC over the exact bytes that
   * arrived. `express.json()` parses the body and throws the bytes away, and
   * re-serialising the parsed object does not reproduce them - key order,
   * whitespace and number formatting all differ - so a signature check downstream of
   * it would reject valid deliveries. `express.raw()` hands the handler a Buffer
   * instead.
   *
   * Scoped to this one path rather than done with a global `verify` hook, so no
   * other route pays the cost of buffering its body, and no other route can
   * accidentally end up with an unparsed one.
   *
   * Still AFTER `requestId` (above): a parser error on a webhook has to remain
   * reportable in the standard envelope.
   *
   * 256kb rather than the 100kb used elsewhere. A `payment_link.paid` delivery
   * carries three nested entities plus notes, and the size is chosen by the provider,
   * not by us - a delivery rejected for size would be retried forever.
   */
  app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json', limit: '256kb' }),
    webhooksRouter,
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
  // Also /api: these hang off /api/orders/:id, and keeping them in their own file
  // keeps the money path readable without splitting the URL space.
  app.use('/api', paymentsRouter);
  // Standard Checkout - POST /api/create-order and POST /api/verify-payment. A
  // separate file from paymentsRouter because it is a second payment METHOD rather
  // than more routes for the same one; they share the order row, the audit trail and
  // the single writer of PAID, and nothing else.
  app.use('/api', checkoutRouter);
  // Chat — the agent entry point. Claude + MCP tool loop.
  app.use('/api/chat', chatRouter);

  /**
   * Route index. Useful during development, and it documents what is not built
   * yet - so a caller hitting /api/chat learns it is coming rather than getting a
   * bare 404.
   */
  app.get('/', (req, res) => {
    res.json({
      service: SERVICE_NAME,
      phase: 'backend-payments',
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
        payments: [
          'POST /api/orders/:id/payment-link (requires { "approved": true })',
          'GET /api/orders/:id/payment',
          'POST /api/orders/:id/payment/refresh',
        ],
        checkout: [
          'POST /api/create-order (Razorpay order for the checkout modal; requires { "approved": true })',
          'POST /api/verify-payment',
        ],
        webhooks: ['POST /api/webhooks/razorpay'],
        chat: ['POST /api/chat'],
      },
      // Reported so a developer can tell "the route is missing" from "the route is
      // there and this deployment has no keys" without reading server logs. The
      // flag only ever says whether credentials are present - never anything about
      // what they are.
      payments: {
        configured: isRazorpayConfigured,
        ...(isRazorpayConfigured
          ? {}
          : { note: 'Payment routes return 501 until the Razorpay environment variables are set.' }),
      },
      agent: {
        configured: isAgentConfigured,
        ...(isAgentConfigured
          ? {}
          : { note: 'POST /api/chat returns 501 until AGENTROUTER_API_KEY is set.' }),
      },
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
    console.log(`  health      http://localhost:${env.PORT}/health`);
    // Whether keys exist, never what they are. A developer whose payment routes
    // answer 501 should learn why from the boot log rather than by guessing.
    console.log(
      `  payments    ${
        isRazorpayConfigured
          ? 'Razorpay configured'
          : `not configured (set ${RAZORPAY_ENV_VARS.join(', ')})`
      }`,
    );
    console.log(
      `  agent       ${
        isAgentConfigured
          ? `${agentConfig?.provider === 'grok' ? 'Grok' : 'Claude'} configured (${agentConfig?.model})`
          : 'not configured (set XAI_API_KEY or AGENTROUTER_API_KEY)'
      }\n`,
    );
  });

  // Report database reachability at boot without blocking the listen. Starting
  // anyway is intentional: a service that refuses to start when its database is
  // briefly unavailable cannot recover on its own, whereas one that starts
  // degraded and reports it through /health/ready can.
  void getReadiness().then((report) => {
    const db = report.checks.database;

    if (db.reachable) {
      console.log(`  database    connected (${db.latencyMs}ms)\n`);
      return;
    }

    // Name the actual remedy rather than listing every possibility. The three
    // first-run failures have nothing to do with each other, and printing all of
    // them for each of them is how a startup warning gets ignored.
    const remedy: Record<string, string> = {
      not_migrated:
        'The schema is missing. Run supabase/migrations/001_initial_schema.sql\n' +
        '              in the Supabase SQL Editor (see README, "Database migration").',
      not_seeded:
        'The schema exists but products is empty. Run supabase/seed.sql\n' +
        '              in the Supabase SQL Editor (see README, "Seed data").',
      permission_denied:
        'Connected, but the key was refused by RLS/grants. Confirm\n' +
        '              SUPABASE_SERVICE_ROLE_KEY is the service-role key, not the anon key.',
      timeout: 'Supabase did not answer within 3s. Check the project is not paused.',
      unreachable:
        'Could not reach Supabase at all. Check SUPABASE_URL and\n' +
        '              that this machine has network access.',
    };

    console.warn(
      `  database    NOT READY (${db.error ?? 'unknown'}).\n` +
        `              ${remedy[db.error ?? ''] ?? 'Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'}\n`,
    );
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
