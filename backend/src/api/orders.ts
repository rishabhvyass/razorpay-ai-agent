/**
 * Order routes. Mounted at `/api`, so this file owns two paths:
 *
 *   POST /api/orders                  record an intent to buy (PENDING_CONFIRMATION)
 *   GET  /api/orders/:id              one order
 *   GET  /api/orders/:id/activity     the order's audit trail
 *   GET  /api/users/:userId/orders    a user's order history
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY ABSENT: there is no HTTP endpoint that sets an order's status.
 *
 * `orderRepo.updateOrderStatus` exists and is tested, but exposing it over HTTP
 * would mean anyone who could reach this service could mark an order PAID. Status
 * is driven by exactly one thing: a Razorpay webhook whose HMAC signature
 * verified. That handler belongs to the payments phase and will call the
 * repository directly.
 *
 * The same reasoning is why `POST /api/orders` is safe to expose now: it only
 * writes PENDING_CONFIRMATION, which contacts no payment provider and moves no
 * money. It records that someone intends to buy something. The transition out of
 * that state is the gate, and the gate is not here.
 * ---------------------------------------------------------------------------
 */

import { Router } from 'express';
import { z } from 'zod';

import { getOrderActions } from '../repositories/agentActionRepo.js';
import { createOrderRecord, getOrderById, getUserOrders } from '../repositories/orderRepo.js';
import { ORDER_STATUSES } from '../db/types.js';
import { badRequest, notFound } from '../utils/errors.js';

export const ordersRouter = Router();

const orderIdParamSchema = z.object({
  id: z.uuid({ error: 'Order id must be a UUID.' }),
});

const userIdParamSchema = z.object({
  userId: z.uuid({ error: 'User id must be a UUID.' }),
});

const createOrderSchema = z
  .object({
    productId: z.uuid({ error: 'productId must be a UUID.' }),
    quantity: z.number().int().min(1).max(100).default(1),
    conversationId: z.uuid().nullish(),
    userId: z.uuid().nullish(),
    /**
     * Deduplication token. A retried POST with the same key returns the original
     * order rather than creating a second one - which is the difference between a
     * flaky network and a double charge once the payments layer is wired up.
     */
    idempotencyKey: z.string().trim().min(8).max(200).optional(),
  })
  .strict();

/**
 * Note what is NOT accepted: `amount`, `price`, `currency`, `total`. `.strict()`
 * means sending one is a 400 rather than a silently ignored field. The price is
 * read from the database inside createOrderRecord, so there is no code path in
 * which a caller - or an agent - can name its own price.
 */

const listOrdersSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .strict();

function issues(error: z.ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

ordersRouter.post('/orders', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid order payload.', issues(parsed.error));
  }

  const order = await createOrderRecord({
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
    conversationId: parsed.data.conversationId ?? null,
    userId: parsed.data.userId ?? null,
    idempotencyKey: parsed.data.idempotencyKey,
    metadata: { requestId: req.requestId },
  });

  res.status(201).json({
    data: order,
    meta: {
      // Spelled out because "created an order" reads as "took the money", and the
      // whole point of this state is that it has not.
      note: 'Order recorded as PENDING_CONFIRMATION. No payment has been initiated.',
    },
    requestId: req.requestId,
  });
});

ordersRouter.get('/orders/:id', async (req, res) => {
  const parsed = orderIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw badRequest('INVALID_UUID', 'Order id must be a UUID.');
  }

  const order = await getOrderById(parsed.data.id);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  res.json({ data: order, requestId: req.requestId });
});

/** Everything the agent did in the course of this order. */
ordersRouter.get('/orders/:id/activity', async (req, res) => {
  const parsed = orderIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw badRequest('INVALID_UUID', 'Order id must be a UUID.');
  }

  const order = await getOrderById(parsed.data.id);

  if (order === null) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found');
  }

  const actions = await getOrderActions(order.id);

  res.json({
    data: { orderId: order.id, status: order.status, actions },
    requestId: req.requestId,
  });
});

ordersRouter.get('/users/:userId/orders', async (req, res) => {
  const params = userIdParamSchema.safeParse(req.params);

  if (!params.success) {
    throw badRequest('INVALID_UUID', 'User id must be a UUID.');
  }

  const query = listOrdersSchema.safeParse(req.query);

  if (!query.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid list parameters.', issues(query.error));
  }

  // No ownership check, because there is no authenticated caller to compare
  // against yet. See the auth gap noted in api/conversations.ts - this route is
  // the one where it matters most, and the auth phase must compare :userId against
  // the verified JWT subject before this handles anything real.
  const orders = await getUserOrders(params.data.userId, {
    limit: query.data.limit,
    offset: query.data.offset,
    status: query.data.status,
  });

  res.json({
    data: orders,
    meta: {
      count: orders.length,
      limit: query.data.limit ?? 20,
      offset: query.data.offset ?? 0,
      status: query.data.status ?? null,
    },
    requestId: req.requestId,
  });
});
