import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  CircleDot,
  CreditCard,
  Database,
  Eye,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { formatJsonForDisplay } from '@/lib/redact';
import { Badge } from '@/components/ui';
import type { AgentAction, AgentActionStatus } from '@/types';

/**
 * One line in the agent audit trail.
 *
 * The value of this panel to a reviewer is that it shows the agent's reasoning and
 * its money actions as separate, visibly different things. MONEY_ACTION gets its
 * own colour and icon, because "the agent read the catalogue" and "the agent
 * created an order" are not the same event and must not look alike.
 */

const STATUS: Record<
  AgentActionStatus,
  { tone: 'neutral' | 'success' | 'danger' | 'warning'; label: string; icon: React.ReactNode }
> = {
  started: {
    tone: 'neutral',
    label: 'Running',
    icon: <Loader2 className="size-3 animate-spin" aria-hidden />,
  },
  success: { tone: 'success', label: 'Success', icon: <CircleDot className="size-3" aria-hidden /> },
  failed: {
    tone: 'danger',
    label: 'Failed',
    icon: <AlertTriangle className="size-3" aria-hidden />,
  },
  blocked: { tone: 'warning', label: 'Blocked', icon: <Ban className="size-3" aria-hidden /> },
};

function actionTypeStyle(actionType: string): {
  icon: React.ReactNode;
  ring: string;
  label: string;
} {
  switch (actionType) {
    case 'MONEY_ACTION':
      return {
        icon: <CreditCard className="size-3.5" aria-hidden />,
        ring: 'border-warning-line bg-warning-bg text-warning',
        label: 'Money action',
      };
    case 'WRITE_ACTION':
      return {
        icon: <Database className="size-3.5" aria-hidden />,
        ring: 'border-accent-200 bg-accent-50 text-accent-700',
        label: 'Write',
      };
    case 'SYSTEM_ACTION':
      return {
        icon: <ShieldCheck className="size-3.5" aria-hidden />,
        ring: 'border-info-line bg-info-bg text-info',
        label: 'System',
      };
    default:
      return {
        icon: <Eye className="size-3.5" aria-hidden />,
        ring: 'border-line bg-surface-sunken text-muted',
        label: 'Read',
      };
  }
}

export function AgentActivityItem({ action }: { action: AgentAction }) {
  const [expanded, setExpanded] = useState(false);
  const type = actionTypeStyle(action.actionType);
  const status = STATUS[action.status] ?? STATUS.started;
  const hasPayload = action.input !== null || action.output !== null;

  return (
    <li className="animate-fade-up">
      <div className="flex gap-2.5">
        <span
          className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border', type.ring)}
          title={type.label}
        >
          {type.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink font-mono text-[12px] font-medium">{action.toolName}</span>
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
            <span className="text-faint nums ml-auto shrink-0 text-[11px]">
              {formatTime(action.createdAt)}
            </span>
          </div>

          {action.reason ? (
            <p className="text-muted mt-1 text-[12px] leading-relaxed">{action.reason}</p>
          ) : null}

          {action.errorMessage ? (
            <p className="text-danger mt-1 text-[12px] leading-relaxed">
              {action.errorCode ? `${action.errorCode}: ` : ''}
              {action.errorMessage}
            </p>
          ) : null}

          {hasPayload ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="text-faint hover:text-muted mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
              >
                <ChevronDown
                  className={cn('size-3 transition-transform', expanded && 'rotate-180')}
                  aria-hidden
                />
                {expanded ? 'Hide payload' : 'Show payload'}
              </button>

              {expanded ? (
                <div className="mt-1.5 space-y-1.5">
                  {action.input !== null ? (
                    <pre className="bg-surface-sunken text-muted scrollbar-slim max-h-40 overflow-auto rounded-lg p-2.5 font-mono text-[11px] leading-relaxed">
                      {/* Redacted before render - see lib/redact.ts. */}
                      {formatJsonForDisplay(action.input)}
                    </pre>
                  ) : null}
                  {action.output !== null ? (
                    <pre className="bg-surface-sunken text-muted scrollbar-slim max-h-40 overflow-auto rounded-lg p-2.5 font-mono text-[11px] leading-relaxed">
                      {formatJsonForDisplay(action.output)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
