import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getConversationActivity, getOrderActivity, mergeFeeds } from '@/services/activityService';
import { useCheckoutSession } from './useCheckoutSession';
import { useKnownOrders } from './useKnownOrders';
import type { ActivityFeed } from '@/types';

/**
 * The widest audit trail this app can honestly assemble.
 *
 * There is no `GET /api/activity`. The backend exposes the trail per scope only -
 * `/api/conversations/:id/activity` and `/api/orders/:id/activity` - so a global
 * view has to be aggregated client-side from the scopes the browser knows about:
 *
 *   - the current conversation, if one has been created;
 *   - every order this browser recorded (or the configured user's orders);
 *   - actions generated locally by the mock agent, which the backend never saw
 *     because `POST /api/chat` does not exist yet.
 *
 * `sources` is returned so the page can state exactly which scopes were queried.
 * An audit trail that looks complete but is a slice would undermine the one thing
 * this panel is for.
 */
export function useAuditTrail() {
  const session = useCheckoutSession();
  const known = useKnownOrders();

  const orderIds = useMemo(() => known.orders.map((order) => order.id), [known.orders]);

  // Mapped over a 0-or-1 array rather than a conditional `[...] : []`, so useQueries
  // sees a uniform array type instead of a `[] | [T]` tuple - the tuple form makes
  // its overload resolve to `never[]` and every field access below fails to compile.
  const conversationIds = useMemo(
    () => (session.conversationId ? [session.conversationId] : []),
    [session.conversationId],
  );

  const conversationFeed = useQueries({
    queries: conversationIds.map((id) => ({
      queryKey: qk.conversations.activity(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getConversationActivity(id, {}, signal),
    })),
  });

  const orderFeeds = useQueries({
    queries: orderIds.map((id) => ({
      queryKey: qk.orders.activity(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getOrderActivity(id, signal),
      // A recorded id can outlive its row between demo runs; retrying a 404 only
      // delays the page.
      retry: false,
    })),
  });

  // useQueries returns a fresh array of fresh result objects every render, so it can
  // never be a dependency. `dataUpdatedAt` is TanStack's own revision counter: joining
  // the timestamps gives a primitive that changes exactly when some query's data
  // changed. Computed here rather than inline in the dep array because a dependency
  // has to be a plain value the linter can compare across renders.
  const conversationRevision = conversationFeed.map((query) => query.dataUpdatedAt).join(',');
  const orderRevision = orderFeeds.map((query) => query.dataUpdatedAt).join(',');

  const feed = useMemo<ActivityFeed>(() => {
    const merged = mergeFeeds([
      ...conversationFeed.map((query) => query.data),
      ...orderFeeds.map((query) => query.data),
    ]);

    if (session.localActions.length === 0) return merged;

    // Local mock actions are merged the same way, so dedupe-by-id still holds and
    // the summary counts each action once.
    return mergeFeeds([merged, { actions: session.localActions, orders: [], summary: merged.summary }]);
    // The revision strings above stand in for the query arrays the body reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.localActions, conversationRevision, orderRevision]);

  const isPending =
    known.isPending ||
    conversationFeed.some((query) => query.isPending) ||
    orderFeeds.some((query) => query.isPending);

  const error = conversationFeed.find((query) => query.isError)?.error ?? known.error ?? null;

  return {
    feed,
    isPending,
    error,
    sources: {
      conversationId: session.conversationId,
      orderCount: orderIds.length,
      localCount: session.localActions.length,
      scope: known.scope,
    },
    refetch: () => {
      for (const query of conversationFeed) void query.refetch();
      for (const query of orderFeeds) void query.refetch();
      known.refetch();
    },
  };
}
