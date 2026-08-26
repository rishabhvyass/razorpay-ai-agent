/**
 * Chat route. Mounted at `/api/chat`, so this file owns:
 *
 *   POST /api/chat
 *
 * This is the agent entry point: a user message goes in, a structured response
 * with assistant turns, tool call results, and rich blocks comes out.
 *
 * The route itself is thin. It validates the request, saves the user message,
 * delegates to agentService.chat(), and returns what it gets. The agent logic,
 * tool execution, and guardrails all live in services/ — this file touches HTTP
 * and nothing else.
 *
 * Answers 501 when AGENTROUTER_API_KEY is not set, naming the missing variable
 * (not its value). This follows the same pattern as the payment routes.
 */

import { Router } from 'express';
import { z } from 'zod';

import { isAgentConfigured } from '../config/env.js';
import { getConversationById, touchConversation } from '../repositories/conversationRepo.js';
import { createMessage } from '../repositories/messageRepo.js';
import { chat, type ChatResponse } from '../services/agentService.js';
import { badRequest, notFound, notImplemented } from '../utils/errors.js';

export const chatRouter = Router();

const chatSchema = z
  .object({
    conversationId: z.uuid({ error: 'conversationId must be a UUID.' }),
    message: z
      .string()
      .trim()
      .min(1, 'Message cannot be empty.')
      .max(20_000, 'Message exceeds the 20,000 character limit.'),
  })
  .strict();

function requireAgentConfigured(): void {
  if (!isAgentConfigured) {
    throw notImplemented(
      'The agent is not configured on this server. Set AGENTROUTER_API_KEY ' +
        'in the backend environment to enable POST /api/chat.',
    );
  }
}

chatRouter.post('/', async (req, res) => {
  requireAgentConfigured();

  const parsed = chatSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid chat payload.', {
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }

  const { conversationId, message } = parsed.data;

  // Verify the conversation exists before doing anything.
  const conversation = await getConversationById(conversationId);
  if (conversation === null) {
    throw notFound('CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }

  // Save the user message first. This is the permanent record of what was said,
  // regardless of whether the agent call succeeds.
  await createMessage({
    conversationId,
    role: 'user',
    content: message,
    metadata: { requestId: req.requestId },
  });

  // Run the agent
  const response: ChatResponse = await chat({
    conversationId,
    message,
    requestId: req.requestId,
  });

  // Touch conversation for ordering
  await touchConversation(conversationId).catch(() => undefined);

  res.json({
    data: response,
    requestId: req.requestId,
  });
});
