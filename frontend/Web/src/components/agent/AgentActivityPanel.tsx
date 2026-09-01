import { useMemo } from 'react';
import { ScrollText } from 'lucide-react';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { useConversationActivity } from '@/hooks/useActivity';
import { config } from '@/lib/config';
import { cn } from '@/lib/cn';
import { ErrorState, MockNotice } from '@/components/ui';
import { AgentActivityTimeline } from './AgentActivityTimeline';
import { AgentStatus, type AgentStatusValue } from './AgentStatus';
import type { AgentAction } from '@/types';

/**
 * The right-hand agent trace on the checkout page.
 *
 * It merges two sources and de-duplicates by action id:
 *
 *   - the REAL backend feed from `GET /api/conversations/:id/activity`, polled
 *     while the conversation is open;
 *   - actions produced locally by the mock adapter, since `POST /api/chat` does not
 *     exist yet and therefore writes nothing to `agent_actions`.
 *
 * When the mock supplies any of them the panel says so, at the top, once - which is
 * the point of the panel. An audit trail that might be partly invented without
 * saying which part is worse than no audit trail.
 */
export function AgentActivityPanel({
  className,
  showHeader = true,
}: {
  className?: string;
  /** Off inside the drawer, whose Modal chrome already supplies a title bar. */
  showHeader?: boolean;
}) {
  const session = useCheckoutSession();
  const feed = useConversationActivity(session.conversationId, {
    live: Boolean(session.conversationId),
  });

  const actions = useMemo<AgentAction[]>(() => {
    const byId = new Map<string, AgentAction>();
    for (const action of feed.data?.actions ?? []) byId.set(action.id, action);
    for (const action of session.localActions) byId.set(action.id, action);

    return [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [feed.data?.actions, session.localActions]);

  const status: AgentStatusValue = session.isThinking
    ? 'thinking'
    : session.isConfirming
      ? 'acting'
      : Object.values(session.confirmations).some((state) => state === 'confirming')
        ? 'acting'
        : session.turns.some((turn) =>
              turn.blocks?.some(
                (block) =>
                  block.kind === 'purchase-confirmation' &&
                  session.confirmations[turn.id] === undefined,
              ),
            )
          ? 'blocked'
          : actions.length > 0
            ? 'done'
            : 'idle';

  const counts = useMemo(
    () => ({
      total: actions.length,
      money: actions.filter((action) => action.actionType === 'MONEY_ACTION').length,
      failed: actions.filter((action) => action.status === 'failed' || action.status === 'blocked')
        .length,
    }),
    [actions],
  );

  const hasLocalActions = session.localActions.length > 0;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {showHeader ? (
        <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <ScrollText className="text-faint size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-ink text-[13px] leading-tight font-semibold">Agent Activity</h2>
              <p className="text-faint mt-0.5 truncate text-[11px] leading-tight">
                Transparent execution trace
              </p>
            </div>
          </div>
          <AgentStatus status={status} />
        </div>
      ) : (
        <div className="border-line flex items-center justify-end border-b px-4 py-2.5">
          <AgentStatus status={status} />
        </div>
      )}

      {counts.total > 0 ? (
        <dl className="border-line grid grid-cols-3 divide-x divide-[var(--color-line)] border-b">
          {[
            { label: 'Actions', value: counts.total, tone: 'text-ink' },
            { label: 'Money', value: counts.money, tone: 'text-warning' },
            { label: 'Blocked', value: counts.failed, tone: 'text-danger' },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-2.5">
              <dt className="text-faint text-[10px] font-semibold tracking-wide uppercase">
                {stat.label}
              </dt>
              <dd className={cn('nums mt-0.5 text-base font-semibold', stat.tone)}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {hasLocalActions ? (
          <MockNotice className="mb-4">
            Some entries below were produced locally. <code>POST /api/chat</code> is served by the
            configured backend AI provider, so these local entries may be incomplete and are not written to the{' '}
            <code>agent_actions</code> table. Order creation is real.
          </MockNotice>
        ) : null}

        {/* The backend feed failing is not the same as there being no activity, and
            it must not blank the local entries: passing `error` straight through to
            the timeline would have replaced the whole list, including actions this
            browser produced and holds. So the failure is a banner over the list, and
            it says the trail is incomplete rather than letting a short list pass for
            a complete one. */}
        {feed.isError ? (
          <div className="mb-4 space-y-2">
            <ErrorState error={feed.error} onRetry={() => void feed.refetch()} compact />
            {actions.length > 0 ? (
              <p className="text-faint text-[11px] leading-relaxed">
                The entries below are the ones already in hand. Because that read failed, this
                trail may be missing actions the backend has recorded. Treat it as incomplete
                until the retry succeeds.
              </p>
            ) : null}
          </div>
        ) : null}

        {!session.transcriptRecording && session.turns.length > 0 ? (
          <div className="rounded-control border-danger-line bg-danger-bg mb-4 border px-3 py-2.5">
            <p className="text-muted text-xs leading-relaxed">
              This conversation is not being persisted, so the backend has no activity feed for it.
              Only locally-generated entries appear below.
            </p>
          </div>
        ) : null}

        <AgentActivityTimeline
          actions={actions}
          isPending={feed.isPending && Boolean(session.conversationId) && actions.length === 0}
          emptyDescription={
            config.useMock
              ? 'Send a message to start. Every tool call the agent makes appears here with its reason - reads, writes, and money actions, which are visually distinct.'
              : 'Every tool call the agent makes appears here with its reason, read live from the backend audit trail.'
          }
        />
      </div>
    </div>
  );
}
