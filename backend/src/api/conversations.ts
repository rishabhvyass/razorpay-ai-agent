/**
 * Conversation routes. Mounted at `/api/conversations`.
 *
 *   POST /api/conversations             start a conversation
 *   GET  /api/conversations/:id         one conversation
 *   GET  /api/conversations/:id/messages  transcript
 *   POST /api/conversations/:id/messages  append a user message
 *   GET  /api/conversations/:id/activity  agent audit trail
 *
 * `POST /api/conversations` is NOT `/api/chat`. It creates the container; it does
 * not talk to a model. `/api/chat` arrives with the Claude + MCP layer and is
 * deliberately absent here.
 *
 * `POST .../messages` accepts role 'user' only. Assistant, system and tool turns
 * are written by the trusted agent layer through messageRepo - if a client could
 * post an assistant turn, it could forge the agent's side of a transcript, which
 * is exactly the record that later has to be trusted to show what was approved.
 *
 * ---------------------------------------------------------------------------
 * KNOWN GAP, this phase only: these routes have no authentication, and they read
 * through the service-role client, which bypasses RLS. Any caller who knows a
 * conversation UUID can read it. Acceptable for a Test Mode demo with no real
 * user data; it must close in the auth phase by resolving the caller's JWT and
 * querying through a user-scoped client (db/supabase.ts -> createUserScopedClient),
 * so the database policies do the enforcing rather than route code remembering to.
 * ---------------------------------------------------------------------------
 */

import { Router } from 'express';
import { z } from 'zod';

import { getConversationActions } from '../repositories/agentActionRepo.js';
import {
  createConversation,
  getConversationById,
  touchConversation,
  updateConversationStatus,
} from '../repositories/conversationRepo.js';
import { createMessage, getConversationMessages } from '../repositories/messageRepo.js';
import { getConversationOrders } from '../repositories/orderRepo.js';
import { badRequest, notFound } from '../utils/errors.js';

export const conversationsRouter = Router();

const idParamSchema = z.object({
  id: z.uuid({ error: 'Conversation id must be a UUID.' }),
});

const createConversationSchema = z
  .object({
    /**
     * Optional, and NOT trustworthy. Until auth lands there is nothing proving
     * the caller is this user, so it is recorded as an association rather than
     * treated as an identity. The auth phase takes it from the verified JWT and
     * ignores the body.
     */
    userId: z.uuid().nullish(),
  })
  .strict();

const createMessageSchema = z
  .object({
    content: z.string().trim().min(1, 'Message content cannot be empty.').max(20_000),
    role: z.literal('user').default('user'),
  })
  .strict();

const statusSchema = z
  .object({
    status: z.enum(['active', 'completed', 'archived']),
  })
  .strict();

const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

function parseId(params: unknown): string {
  const parsed = idParamSchema.safeParse(params);
  if (!parsed.success) {
    throw badRequest('INVALID_UUID', 'Conversation id must be a UUID.');
  }
  return parsed.data.id;
}

function parsePagination(query: unknown): { limit?: number | undefined; offset?: number | undefined } {
  const parsed = paginationSchema.safeParse(query);
  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid pagination parameters.', {
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

/**
 * Confirm a conversation exists before doing anything scoped to it.
 *
 * Without this, a bad id produces an empty message list and a 200 - which reads
 * to a client as "this conversation is empty" rather than "this conversation does
 * not exist". Two very different things to debug.
 */
async function requireConversation(id: string): Promise<void> {
  const conversation = await getConversationById(id);
  if (conversation === null) {
    throw notFound('CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
}

conversationsRouter.post('/', async (req, res) => {
  const parsed = createConversationSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid conversation payload.', {
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }

  const conversation = await createConversation({ userId: parsed.data.userId ?? null });

  res.status(201).json({ data: conversation, requestId: req.requestId });
});

conversationsRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params);
  const conversation = await getConversationById(id);

  if (conversation === null) {
    throw notFound('CONVERSATION_NOT_FOUND', 'Conversation not found');
  }

  res.json({ data: conversation, requestId: req.requestId });
});

conversationsRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params);
  const parsed = statusSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'status must be one of active, completed, archived.');
  }

  const conversation = await updateConversationStatus(id, parsed.data.status);

  if (conversation === null) {
    throw notFound('CONVERSATION_NOT_FOUND', 'Conversation not found');
  }

  res.json({ data: conversation, requestId: req.requestId });
});

conversationsRouter.get('/:id/messages', async (req, res) => {
  const id = parseId(req.params);
  const { limit, offset } = parsePagination(req.query);

  await requireConversation(id);

  const messages = await getConversationMessages(id, { limit, offset });

  res.json({
    data: messages,
    meta: { count: messages.length, limit: limit ?? 100, offset: offset ?? 0 },
    requestId: req.requestId,
  });
});

conversationsRouter.post('/:id/messages', async (req, res) => {
  const id = parseId(req.params);
  const parsed = createMessageSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid message payload.', {
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }

  await requireConversation(id);

  const message = await createMessage({
    conversationId: id,
    role: parsed.data.role,
    content: parsed.data.content,
    // The request id is stored on the turn so a transcript entry can be traced
    // back to the HTTP call that produced it.
    metadata: { requestId: req.requestId },
  });

  // Keeps "most recently active conversation" ordering meaningful. Best-effort:
  // a failed bump must not fail a message that was written successfully.
  await touchConversation(id).catch(() => undefined);

  res.status(201).json({ data: message, requestId: req.requestId });
});

/**
 * The Agent Activity feed: every tool call, its arguments, its outcome, and the
 * agent's stated reason - plus any orders the conversation produced.
 *
 * This is the endpoint that makes the agent auditable rather than magical, and the
 * one a reviewer should look at to confirm nothing was charged without approval.
 */
conversationsRouter.get('/:id/activity', async (req, res) => {
  const id = parseId(req.params);
  const { limit, offset } = parsePagination(req.query);

  await requireConversation(id);

  const [actions, orders] = await Promise.all([
    getConversationActions(id, { limit, offset }),
    getConversationOrders(id),
  ]);

  res.json({
    data: {
      actions,
      orders,
      summary: {
        total: actions.length,
        started: actions.filter((action) => action.status === 'started').length,
        success: actions.filter((action) => action.status === 'success').length,
        failed: actions.filter((action) => action.status === 'failed').length,
        blocked: actions.filter((action) => action.status === 'blocked').length,
      },
    },
    requestId: req.requestId,
  });
});
