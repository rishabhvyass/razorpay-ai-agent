import { Brain, CircleCheck, CircleSlash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AgentStatusValue = 'idle' | 'thinking' | 'acting' | 'blocked' | 'done';

const PRESENTATION: Record<
  AgentStatusValue,
  { label: string; icon: React.ReactNode; className: string }
> = {
  idle: {
    label: 'Idle',
    icon: <Brain className="size-3.5" aria-hidden />,
    className: 'text-muted',
  },
  thinking: {
    label: 'Thinking',
    icon: <Loader2 className="size-3.5 animate-spin" aria-hidden />,
    className: 'text-accent',
  },
  acting: {
    label: 'Working',
    icon: <Loader2 className="size-3.5 animate-spin" aria-hidden />,
    className: 'text-accent',
  },
  blocked: {
    label: 'Waiting for you',
    icon: <CircleSlash className="size-3.5" aria-hidden />,
    className: 'text-warning',
  },
  done: {
    label: 'Complete',
    icon: <CircleCheck className="size-3.5" aria-hidden />,
    className: 'text-success',
  },
};

/**
 * What the agent is doing right now.
 *
 * `blocked` is the state worth naming: it means the agent has stopped because a
 * money action needs the user's authorisation. That is not an error and not a
 * delay - it is the product working, so it gets its own wording rather than being
 * folded into "thinking".
 */
export function AgentStatus({
  status,
  className,
}: {
  status: AgentStatusValue;
  className?: string;
}) {
  const presentation = PRESENTATION[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] font-medium',
        presentation.className,
        className,
      )}
    >
      {presentation.icon}
      {presentation.label}
    </span>
  );
}
