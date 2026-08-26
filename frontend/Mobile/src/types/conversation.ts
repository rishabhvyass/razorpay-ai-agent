/**
 * Conversation domain types.
 */

export const CONVERSATION_STATUSES = ['active', 'completed', 'archived'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export interface Conversation {
  id: string;
  userId: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}
