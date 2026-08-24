import { useMemo, useState } from 'react';
import { Info, ListTree, Search, SlidersHorizontal, X } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { AgentActivityTimeline } from '@/components/agent/AgentActivityTimeline';
import { Button, Card, Input, MockNotice } from '@/components/ui';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/cn';
import { truncateId } from '@/lib/format';
import { AGENT_ACTION_STATUSES, type AgentActionStatus } from '@/types';

type StatusFilter = AgentActionStatus | 'all';

/**
 * The complete audit trail — every agent action, with its reason.
 *
 * Aggregated from the scoped endpoints the backend actually has (see useAuditTrail).
 * Filtering happens client-side because that is where the aggregated set lives; the
 * page states which scopes it queried so a reviewer can tell the difference between
 * "the agent did nothing" and "this view cannot see everything".
 */
export function ActivityPage() {
  const { feed, isPending, error, sources, refetch } = useAuditTrail();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tool, setTool] = useState('');
  const [orderId, setOrderId] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);

  /** Filter options come from the data, so no tool name is hardcoded here. */
  const tools = useMemo(
    () => [...new Set(feed.actions.map((action) => action.toolName))].sort(),
    [feed.actions],
  );
  const orderIds = useMemo(
    () => [...new Set(feed.actions.map((action) => action.orderId).filter(Boolean))] as string[],
    [feed.actions],
  );

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();

    return feed.actions.filter((action) => {
      if (status !== 'all' && action.status !== status) return false;
      if (tool && action.toolName !== tool) return false;
      if (orderId && action.orderId !== orderId) return false;
      if (!needle) return true;

      return (
        action.toolName.toLowerCase().includes(needle) ||
        (action.reason ?? '').toLowerCase().includes(needle) ||
        (action.errorMessage ?? '').toLowerCase().includes(needle)
      );
    });
  }, [debouncedQuery, feed.actions, orderId, status, tool]);

  const isFiltered = status !== 'all' || tool !== '' || orderId !== '' || query.trim() !== '';
  const clear = () => {
    setQuery('');
    setStatus('all');
    setTool('');
    setOrderId('');
  };

  return (
    <Page
      title="Agent Activity"
      description="Every agent action is recorded and explainable"
      actions={
        <Button size="sm" variant="secondary" onClick={refetch}>
          Refresh
        </Button>
      }
    >
      <div className="space-y-4">
        {/* What this view can and cannot see. */}
        <div className="rounded-card border-info-line bg-info-bg flex items-start gap-2.5 border px-3.5 py-3">
          <Info className="text-info mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 text-[12px] leading-relaxed">
            <p className="text-muted">
              The backend has no global activity route, so this trail is assembled from the scopes
              this browser knows about:{' '}
              {sources.conversationId ? (
                <>
                  the current conversation (
                  <code className="text-ink">{truncateId(sources.conversationId, 12, 4)}</code>) and{' '}
                </>
              ) : (
                'no active conversation and '
              )}
              {sources.orderCount} {sources.orderCount === 1 ? 'order' : 'orders'}
              {sources.scope.kind === 'user' ? ' for the configured user' : ' created here'}. Actions
              from other users' conversations are not visible.
            </p>
            {sources.unreadableOrderCount > 0 ? (
              <p className="text-danger mt-1.5">
                {sources.unreadableOrderCount} of those order scopes could not be read, so this
                trail is incomplete — actions recorded against{' '}
                {sources.unreadableOrderCount === 1 ? 'that order' : 'those orders'} are missing
                from the list and from the counts below.
              </p>
            ) : null}
          </div>
        </div>

        {sources.localCount > 0 ? (
          <MockNotice>
            {sources.localCount} of the entries below were generated locally.{' '}
            <code>POST /api/chat</code> is not implemented, so the agent's reasoning steps are
            simulated and were never written to the <code>agent_actions</code> table. Order creation
            is real.
          </MockNotice>
        ) : null}

        {/* Filters */}
        <Card padded={false}>
          <div className="border-line space-y-3 border-b p-3.5">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tool names, reasons and errors"
              leading={<Search className="size-4" aria-hidden />}
              aria-label="Search the audit trail"
              trailing={
                query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="hover:text-ink transition-colors"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                ) : undefined
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="text-faint size-3.5 shrink-0" aria-hidden />

              {(['all', ...AGENT_ACTION_STATUSES] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  aria-pressed={status === value}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] font-medium capitalize transition-colors',
                    status === value
                      ? 'border-accent-200 bg-accent-50 text-accent-700'
                      : 'border-line text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {value}
                </button>
              ))}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {tools.length > 0 ? (
                  <select
                    value={tool}
                    onChange={(event) => setTool(event.target.value)}
                    aria-label="Filter by tool"
                    className="rounded-control border-line-strong bg-surface text-muted h-8 border px-2 text-[12px]"
                  >
                    <option value="">All tools</option>
                    {tools.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : null}

                {orderIds.length > 0 ? (
                  <select
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    aria-label="Filter by order"
                    className="rounded-control border-line-strong bg-surface text-muted h-8 border px-2 text-[12px]"
                  >
                    <option value="">All orders</option>
                    {orderIds.map((id) => (
                      <option key={id} value={id}>
                        {truncateId(id, 12, 4)}
                      </option>
                    ))}
                  </select>
                ) : null}

                {isFiltered ? (
                  <Button size="sm" variant="ghost" onClick={clear}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Summary counts, computed from the merged trail. */}
          {feed.actions.length > 0 ? (
            <dl className="border-line grid grid-cols-2 divide-x divide-[var(--color-line)] border-b sm:grid-cols-4">
              {[
                { label: 'Total', value: feed.summary.total, tone: 'text-ink' },
                { label: 'Success', value: feed.summary.success, tone: 'text-success' },
                { label: 'Failed', value: feed.summary.failed, tone: 'text-danger' },
                { label: 'Blocked', value: feed.summary.blocked, tone: 'text-warning' },
              ].map((stat) => (
                <div key={stat.label} className="px-3.5 py-2.5">
                  <dt className="text-faint text-[10px] font-semibold tracking-wide uppercase">
                    {stat.label}
                  </dt>
                  <dd className={cn('nums mt-0.5 text-base font-semibold', stat.tone)}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="p-4">
            {isFiltered && filtered.length !== feed.actions.length ? (
              <p className="text-faint mb-3.5 text-[12px]">
                Showing {filtered.length} of {feed.actions.length} recorded actions.
              </p>
            ) : null}

            <AgentActivityTimeline
              actions={filtered}
              isPending={isPending && feed.actions.length === 0}
              error={error}
              onRetry={refetch}
              emptyTitle={isFiltered ? 'No actions match these filters' : 'No recorded actions yet'}
              emptyDescription={
                isFiltered
                  ? 'Clear the filters to see the full trail.'
                  : 'Start a checkout and every tool call the agent makes will appear here — reads, writes and money actions, each with the reason it was taken.'
              }
            />
          </div>
        </Card>

        <p className="text-faint flex items-start gap-2 text-[11px] leading-relaxed">
          <ListTree className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Payloads are redacted before rendering: any field whose name or value looks like a key,
          token, signature or credential is replaced. No secret can reach this page.
        </p>
      </div>
    </Page>
  );
}
