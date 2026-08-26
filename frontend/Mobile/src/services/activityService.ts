import { get } from './api';
import { ActivityFeed, OrderActivityFeed } from '../types';

export const activityService = {
  async getConversationActivity(conversationId: string): Promise<ActivityFeed> {
    return get<ActivityFeed>(`/api/conversations/${conversationId}/activity`);
  },

  async getOrderActivity(orderId: string): Promise<OrderActivityFeed> {
    return get<OrderActivityFeed>(`/api/orders/${orderId}/activity`);
  },
};
