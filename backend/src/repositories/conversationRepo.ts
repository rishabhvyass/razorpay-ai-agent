/**
 * Conversation repository.
 *
 * A conversation is the unit the whole demo hangs off: messages belong to it,
 * orders reference it, and agent_actions are grouped by it. Which makes it the
 * join key for the "Agent Activity" view - given one conversation you can
 * reconstruct exactly what the agent said, what it did, and what it was refused.
 *
 * `user_id` is nullable so a visitor can start talking before signing in. When
 * auth lands, an anonymous conversation gets claimed by setting user_id on
 * sign-in rather than being thrown away mid-chat.
 */

import { supabaseAdmin } from '../db/supabase.js';
import type { ConversationRow, ConversationStatus, Json } from '../db/types.js';
import { fromPostgrestError, internal } from '../utils/errors.js';

const CONVERSATION_COLUMNS = 'id, user_id, status, created_at, updated_at';

export interface PublicConversation {
  id: string;
  userId: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export function toPublicConversation(row: ConversationRow): PublicConversation {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateConversationInput {
  /** Null/omitted for an anonymous session. */
  userId?: string | null | undefined;
  status?: ConversationStatus | undefined;
  metadata?: Json | undefined;
}

export async function createConversation(
  input: CreateConversationInput = {},
): Promise<PublicConversation> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      user_id: input.userId ?? null,
      status: input.status ?? 'active',
    })
    .select(CONVERSATION_COLUMNS)
    .single();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'createConversation' });
  }
  if (data === null) {
    // PostgREST returned success with no row. Should be impossible for an
    // insert...select...single, but the type allows it and a silent null here
    // would surface as an unexplained crash two frames away.
    throw internal('Conversation insert returned no row');
  }

  return toPublicConversation(data);
}

/** Returns null when absent - the caller decides whether that is a 404. */
export async function getConversationById(id: string): Promise<PublicConversation | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'getConversationById',
      notFoundCode: 'CONVERSATION_NOT_FOUND',
    });
  }

  return data === null ? null : toPublicConversation(data);
}

/**
 * Move a conversation between active / completed / archived.
 *
 * Returns null when no row matched, so the caller can distinguish "does not
 * exist" from "updated" without a second query.
 */
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<PublicConversation | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .update({ status })
    .eq('id', id)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'updateConversationStatus',
      notFoundCode: 'CONVERSATION_NOT_FOUND',
    });
  }

  return data === null ? null : toPublicConversation(data);
}

/** A user's conversations, most recently updated first. */
export async function getUserConversations(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PublicConversation[]> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getUserConversations' });
  }

  return (data ?? []).map(toPublicConversation);
}

/**
 * Bump `updated_at` without changing anything else, so "most recent
 * conversation" ordering reflects the last message rather than the last status
 * change.
 *
 * The value passed here is only a non-empty PATCH body - PostgREST rejects an
 * empty one. The `trg_conversations_updated_at` trigger overwrites it with the
 * database clock, so the stored timestamp never depends on this process's clock.
 */
export async function touchConversation(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'touchConversation' });
  }
}
