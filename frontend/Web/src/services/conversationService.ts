/**
 * Conversations. All routes here exist on the backend:
 *
 *   POST  /api/conversations            create the container
 *   GET   /api/conversations/:id
 *   PATCH /api/conversations/:id        set status
 *   GET   /api/conversations/:id/messages
 *   POST  /api/conversations/:id/messages   (role 'user' only)
 *   GET   /api/conversations/:id/activity
 *
 * `POST /api/conversations` is NOT the chat endpoint. It creates the container and
 * talks to no model. Sending a user turn to the agent is chatService, and that
 * endpoint does not exist yet.
 *
 * The backend accepts role 'user' only when appending. Assistant, system and tool
 * turns are written by the trusted agent layer - if a browser could post an
 * assistant turn it could forge the agent's half of the transcript, which is
 * exactly the record that later has to prove what was approved.
 */

import { request } from './api';
import type { ActivityFeed, Conversation, ConversationStatus, Message } from '@/types';

export function createConversation(
  userId?: string | null,
  signal?: AbortSignal,
): Promise<Conversation> {
  return request<Conversation>('/api/conversations', {
    method: 'POST',
    body: userId ? { userId } : {},
    signal,
  });
}

export function getConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${id}`, { signal });
}

export function setConversationStatus(
  id: string,
  status: ConversationStatus,
  signal?: AbortSignal,
): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: { status },
    signal,
  });
}

export function getMessages(
  id: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${id}/messages`, {
    query: { limit: params.limit, offset: params.offset },
    signal,
  });
}

/** Append the user's turn. Role is fixed to 'user' by the backend schema. */
export function appendUserMessage(
  id: string,
  content: string,
  signal?: AbortSignal,
): Promise<Message> {
  return request<Message>(`/api/conversations/${id}/messages`, {
    method: 'POST',
    body: { content, role: 'user' },
    signal,
  });
}

export function getConversationActivity(
  id: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<ActivityFeed> {
  return request<ActivityFeed>(`/api/conversations/${id}/activity`, {
    query: { limit: params.limit, offset: params.offset },
    signal,
  });
}
