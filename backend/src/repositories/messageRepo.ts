/**
 * Message repository.
 *
 * The verbatim transcript, in insertion order.
 *
 * Ordering is `created_at, id`. The tiebreaker matters more than it looks: a user
 * message and the assistant reply that follows it can land inside the same
 * microsecond under load, and a transcript that renders the answer above the
 * question is worse than one that renders slowly. `id` is a random UUID so the
 * tiebreak is arbitrary but stable - the same conversation always renders the
 * same way, which is what makes a demo trustworthy.
 */

import { supabaseAdmin } from '../db/supabase.js';
import type { Json, MessageRole, MessageRow } from '../db/types.js';
import { fromPostgrestError, internal } from '../utils/errors.js';

const MESSAGE_COLUMNS = 'id, conversation_id, role, content, metadata, created_at';

export interface PublicMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: unknown;
  createdAt: string;
}

export function toPublicMessage(row: MessageRow): PublicMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  /**
   * Turn-level context: token usage, model id, stop reason, the tool_use id a
   * 'tool' message answers. Kept out of `content` so `content` stays exactly what
   * a human would read.
   */
  metadata?: Json | undefined;
}

export async function createMessage(input: CreateMessageInput): Promise<PublicMessage> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'createMessage' });
  }
  if (data === null) {
    throw internal('Message insert returned no row');
  }

  return toPublicMessage(data);
}

export const DEFAULT_MESSAGE_LIMIT = 100;
export const MAX_MESSAGE_LIMIT = 500;

/**
 * A conversation's messages, oldest first - the order they should be rendered
 * and the order they must be replayed to the model.
 *
 * Paginated with a hard ceiling. A long-running conversation must not be able to
 * turn one request into a multi-megabyte response.
 */
export async function getConversationMessages(
  conversationId: string,
  options: { limit?: number | undefined; offset?: number | undefined } = {},
): Promise<PublicMessage[]> {
  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? DEFAULT_MESSAGE_LIMIT), 1),
    MAX_MESSAGE_LIMIT,
  );
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getConversationMessages' });
  }

  return (data ?? []).map(toPublicMessage);
}

/**
 * The last `limit` messages, returned oldest-first.
 *
 * Fetches descending and reverses in memory, because "the most recent N" cannot
 * be expressed as an ascending range without first knowing the total count. This
 * is what the agent phase will use to build a bounded context window.
 */
export async function getRecentMessages(
  conversationId: string,
  limit = 20,
): Promise<PublicMessage[]> {
  const bounded = Math.min(Math.max(Math.trunc(limit), 1), MAX_MESSAGE_LIMIT);

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(bounded);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getRecentMessages' });
  }

  return (data ?? []).map(toPublicMessage).reverse();
}

export async function countConversationMessages(conversationId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'countConversationMessages' });
  }

  return count ?? 0;
}
