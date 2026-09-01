/** Date, id and audit-text formatting for audit surfaces. */

import type { Order, Product } from '@/types';

/** "12:41:20" - the timestamp form the Agent Activity trace uses. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** "21 Aug 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "21 Aug 2026, 12:41" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** "just now" / "4m ago" / "2h ago" - for the activity feed's relative column. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '--';
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  return formatDate(iso);
}

/**
 * Shorten an opaque identifier for display while keeping it recognisable.
 * truncateId('order_QxLm2pRt9vB') -> 'order_QxLm…9vB'
 *
 * The full value is always available via the element's `title`, so a reviewer can
 * still read it, and copy actions always copy the full string.
 */
export function truncateId(id: string | null | undefined, head = 12, tail = 4): string {
  if (!id) return 'Not available';
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/**
 * What the customer is paying for, in the phrasing that goes into the audit trail.
 *
 * Both payment methods build their `approvalReason` from this, so the two rows a
 * reviewer compares in `agent_actions` describe the same purchase the same way. A
 * reason reading "user approved" documents nothing anyone could check; naming the
 * product and the quantity means the recorded sentence can be held against the order
 * row it belongs to.
 *
 * Falls back to the order id when the product is not loaded, rather than to a
 * plausible-sounding placeholder - an audit reason that names a product this app was
 * not actually showing would be worse than one that names nothing.
 */
export function describePurchase(order: Order, product?: Product | null): string {
  return product == null ? `Order ${order.id}` : `${product.name} x${order.quantity}`;
}
