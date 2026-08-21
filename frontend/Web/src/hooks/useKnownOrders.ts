import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getRecordedOrderIds, getUserId } from '@/lib/session';
import { getOrder } from '@/services/orderService';
import { useUserOrders } from './useOrders';
import type { Order } from '@/types';

/**
 * Every order this app can honestly show.
 *
 * The backend exposes no "list all orders" route - only `GET /api/orders/:id` and
 * `GET /api/users/:userId/orders`. With no auth layer there is no signed-in user
 * either, so the app cannot ask "what are my orders?" in general.
 *
 * Rather than inventing a user or a collection endpoint, this hook combines the two
 * things that are real:
 *
 *   - if a user id is configured in Settings, that user's orders from the real
 *     per-user route;
 *   - the orders created from this browser, fetched individually by id.
 *
 * `scope` is returned so every surface using this can state what it is showing.
 * A list that looks global but is not would misrepresent the data.
 */
export function useKnownOrders() {
  const userId = getUserId();
  const userOrders = useUserOrders(userId);

  // Held in a query rather than a useMemo so that invalidating `qk.orders.all`
  // after an order is created also refreshes the id list.
  const recordedIds = useQuery({
    queryKey: [...qk.orders.all, 'recorded-ids'],
    queryFn: () => getRecordedOrderIds(),
    staleTime: 0,
  });

  const ids = recordedIds.data ?? [];

  const localOrders = useQueries({
    queries: ids.map((id) => ({
      queryKey: qk.orders.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getOrder(id, signal),
      // A recorded id can outlive its row (database reset between demo runs).
      // Retrying a 404 three times just delays an empty list.
      retry: false,
    })),
  });

  const orders = useMemo<Order[]>(() => {
    const byId = new Map<string, Order>();

    for (const order of userOrders.data ?? []) byId.set(order.id, order);
    for (const query of localOrders) {
      if (query.data) byId.set(query.data.id, query.data);
    }

    return [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    // localOrders is a new array each render; its data identity is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrders.data, localOrders.map((query) => query.dataUpdatedAt).join(',')]);

  const isPending =
    (Boolean(userId) && userOrders.isPending) ||
    recordedIds.isPending ||
    localOrders.some((query) => query.isPending);

  // A missing local order is expected, not an error worth surfacing. A failing
  // per-user request is a real failure the page should show.
  const error = userId && userOrders.isError ? userOrders.error : null;

  return {
    orders,
    isPending,
    error,
    scope: userId
      ? ({ kind: 'user', userId } as const)
      : ({ kind: 'local', count: ids.length } as const),
    missingCount: localOrders.filter((query) => query.isError).length,
    refetch: () => {
      void recordedIds.refetch();
      if (userId) void userOrders.refetch();
      for (const query of localOrders) void query.refetch();
    },
  };
}
