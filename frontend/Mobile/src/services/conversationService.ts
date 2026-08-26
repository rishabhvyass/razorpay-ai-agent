import { get, post } from './api';
import { Conversation, Message } from '../types';

export const conversationService = {
  async createConversation(userId?: string | null): Promise<Conversation> {
    return post<Conversation>('/api/conversations', { userId });
  },

  async getConversation(id: string): Promise<Conversation> {
    return get<Conversation>(`/api/conversations/${id}`);
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    return get<Message[]>(`/api/conversations/${conversationId}/messages`);
  },

  async postMessage(conversationId: string, content: string): Promise<Message> {
    return post<Message>(`/api/conversations/${conversationId}/messages`, { content });
  },
};
