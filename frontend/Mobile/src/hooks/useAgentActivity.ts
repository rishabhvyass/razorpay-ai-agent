import { useQuery } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { ActivityFeed, OrderActivityFeed } from '../types';

export function useConversationActivity(conversationId: string | null | undefined) {
  return useQuery<ActivityFeed | null>({
    queryKey: ['conversation-activity', conversationId],
    queryFn: () => (conversationId ? activityService.getConversationActivity(conversationId) : null),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useOrderActivity(orderId: string | null | undefined) {
  return useQuery<OrderActivityFeed | null>({
    queryKey: ['order-activity', orderId],
    queryFn: () => (orderId ? activityService.getOrderActivity(orderId) : null),
    enabled: !!orderId,
  });
}
