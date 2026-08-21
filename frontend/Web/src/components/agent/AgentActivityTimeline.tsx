import { Activity } from 'lucide-react';
import { EmptyState, ErrorState, SkeletonText } from '@/components/ui';
import { AgentActivityItem } from './AgentActivityItem';
import type { AgentAction } from '@/types';

export function AgentActivityTimeline({
  actions,
  isPending = false,
  error,
  onRetry,
  emptyTitle = 'No agent activity yet',
  emptyDescription = 'Every tool call the agent makes is recorded here as it happens - reads, writes and money actions, each with its reason.',
}: {
  actions: AgentAction[];
  isPending?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (error) {
    return <ErrorState error={error} compact {...(onRetry ? { onRetry } : {})} />;
  }

  if (isPending) {
    return (
      <div className="space-y-4 px-1 py-2">
        <SkeletonText lines={2} />
        <SkeletonText lines={2} />
        <SkeletonText lines={2} />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-5" aria-hidden />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ol className="space-y-3.5">
      {actions.map((action) => (
        <AgentActivityItem key={action.id} action={action} />
      ))}
    </ol>
  );
}
