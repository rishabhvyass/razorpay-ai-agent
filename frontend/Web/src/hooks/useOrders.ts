import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getOrder, getOrderActivity, getUserOrders } from '@/services/orderService';

export function useOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.orders.detail(id ?? ''),
    queryFn: ({ signal }) => getOrder(id!, signal),
    enabled: Boolean(id),
  });
}

export function useOrderActivity(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.orders.activity(id ?? ''),
    queryFn: ({ signal }) => getOrderActivity(id!, signal),
    enabled: Boolean(id),
  });
}

/**
 * A user's order history.
 *
 * `GET /api/users/:userId/orders` is the only list endpoint the backend exposes -
 * there is no "all orders" route - so the Orders page is scoped to the demo user
 * (see lib/session.ts). That is a real constraint, and the page states it rather
 * than implying it is showing everything.
 */
export function useUserOrders(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.orders.byUser(userId ?? ''),
    queryFn: ({ signal }) => getUserOrders(userId!, { limit: 100 }, signal),
    enabled: Boolean(userId),
  });
}
