/**
 * Agent activity - the audit trail.
 *
 * There is no global `GET /api/activity` on the backend. Activity is exposed
 * per-scope only:
 *
 *   GET /api/conversations/:id/activity
 *   GET /api/orders/:id/activity
 *
 * The /activity page therefore aggregates client-side across the conversations it
 * knows about, rather than pretending a collection endpoint exists. That is a real
 * limitation and the page says so in its own empty state instead of silently
 * showing a thin slice of the truth.
 */

import { getConversationActivity } from './conversationService';
import { getOrderActivity } from './orderService';
import type { ActivityFeed, AgentAction } from '@/types';

export { getConversationActivity, getOrderActivity };

const EMPTY_SUMMARY: ActivityFeed['summary'] = {
  total: 0,
  started: 0,
  success: 0,
  failed: 0,
  blocked: 0,
};

/**
 * Merge several scoped feeds into one chronological trail.
 *
 * De-duplicates by action id, because an action attached to both a conversation
 * and an order appears in both feeds and must not be double-counted in a summary
 * a reviewer is reading as a count of what the agent did.
 */
export function mergeFeeds(feeds: Array<ActivityFeed | undefined>): ActivityFeed {
  const actionsById = new Map<string, AgentAction>();
  const ordersById = new Map<string, ActivityFeed['orders'][number]>();

  for (const feed of feeds) {
    if (!feed) continue;
    for (const action of feed.actions ?? []) actionsById.set(action.id, action);
    for (const order of feed.orders ?? []) ordersById.set(order.id, order);
  }

  const actions = [...actionsById.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const summary = actions.reduce<ActivityFeed['summary']>(
    (acc, action) => ({
      ...acc,
      total: acc.total + 1,
      [action.status]: (acc[action.status] ?? 0) + 1,
    }),
    { ...EMPTY_SUMMARY },
  );

  return { actions, orders: [...ordersById.values()], summary };
}

export const EMPTY_FEED: ActivityFeed = { actions: [], orders: [], summary: EMPTY_SUMMARY };
