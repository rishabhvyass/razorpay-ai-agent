import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { Order } from '../types';

// Default demo user UUID for unauthenticated mode
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export function useOrders(userId: string = DEMO_USER_ID) {
  return useQuery<Order[]>({
    queryKey: ['user-orders', userId],
    queryFn: () => orderService.getUserOrders(userId).catch(() => []),
    staleTime: 10 * 1000,
  });
}
