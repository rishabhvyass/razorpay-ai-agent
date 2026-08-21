/** Date and id formatting for audit surfaces. */

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
  if (!id) return '—';
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
