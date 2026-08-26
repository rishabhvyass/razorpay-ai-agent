import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CreditCard,
  Database,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { formatJsonForDisplay } from '@/lib/redact';
import { Badge } from '@/components/ui';
import type { AgentAction, AgentActionStatus } from '@/types';

/**
 * One line in the agent audit trail.
 *
 * Visually and semantically distinguishes:
 * - AI DECISION (recommendations, search queries)
 * - USER AUTHORIZATION (explicit human approval)
 * - SYSTEM ACTION (server-side price calculations, state transitions)
 * - MONEY ACTION (financial order creation, payment links)
 * - RAZORPAY VERIFIED (HMAC-verified webhooks & API captures)
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
  badgeTone: 'neutral' | 'success' | 'warning' | 'accent' | 'danger';
} {
  switch (actionType) {
    case 'WEBHOOK_VERIFICATION':
      return {
        icon: <CheckCircle2 className="size-3.5" aria-hidden />,
        ring: 'border-success-line bg-success-bg text-success',
        label: 'Razorpay Verified',
        badgeTone: 'success',
      };
    case 'PAYMENT_RECONCILIATION':
      return {
        icon: <RefreshCw className="size-3.5" aria-hidden />,
        ring: 'border-info-line bg-info-bg text-info',
        label: 'Reconciliation',
        badgeTone: 'accent',
      };
    case 'PURCHASE_AUTHORIZATION':
      return {
        icon: <UserCheck className="size-3.5" aria-hidden />,
        ring: 'border-accent-200 bg-accent-50 text-accent-700',
        label: 'User Authorized',
        badgeTone: 'accent',
      };
    case 'MONEY_ACTION':
    case 'ORDER_CREATION':
    case 'PAYMENT_LINK_CREATION':
      return {
        icon: <CreditCard className="size-3.5" aria-hidden />,
        ring: 'border-warning-line bg-warning-bg text-warning',
        label: 'Money Action',
        badgeTone: 'warning',
      };
    case 'WRITE_ACTION':
    case 'ORDER_STATE_CHANGE':
      return {
        icon: <Database className="size-3.5" aria-hidden />,
        ring: 'border-accent-200 bg-accent-50 text-accent-700',
        label: 'System Action',
        badgeTone: 'neutral',
      };
    case 'SYSTEM_ACTION':
      return {
        icon: <ShieldCheck className="size-3.5" aria-hidden />,
        ring: 'border-info-line bg-info-bg text-info',
        label: 'System Action',
        badgeTone: 'neutral',
      };
    default:
      return {
        icon: <Eye className="size-3.5" aria-hidden />,
        ring: 'border-line bg-surface-sunken text-muted',
        label: 'AI Decision',
        badgeTone: 'neutral',
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
            <Badge tone={type.badgeTone}>{type.label}</Badge>
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

          <div className="mt-1.5 flex items-center gap-3">
            {hasPayload ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="text-faint hover:text-muted inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
              >
                <ChevronDown
                  className={cn('size-3 transition-transform', expanded && 'rotate-180')}
                  aria-hidden
                />
                {expanded ? 'Hide audit trace' : 'Inspect audit trace'}
              </button>
            ) : null}

            {action.orderId ? (
              <span className="text-faint font-mono text-[10px]">
                Order: {action.orderId.slice(0, 8)}…
              </span>
            ) : null}
          </div>

          {expanded && hasPayload ? (
            <div className="mt-2 space-y-2 rounded-lg border border-line bg-surface-sunken p-2.5">
              {action.requestId ? (
                <div className="text-faint font-mono text-[10px]">
                  Request ID: <span className="text-muted">{action.requestId}</span>
                </div>
              ) : null}

              {action.input !== null ? (
                <div>
                  <p className="text-faint mb-1 text-[10px] font-semibold uppercase">Input Payload</p>
                  <pre className="text-muted scrollbar-slim max-h-36 overflow-auto rounded bg-surface/50 p-2 font-mono text-[11px] leading-relaxed">
                    {formatJsonForDisplay(action.input)}
                  </pre>
                </div>
              ) : null}

              {action.output !== null ? (
                <div>
                  <p className="text-faint mb-1 text-[10px] font-semibold uppercase">Output Result</p>
                  <pre className="text-muted scrollbar-slim max-h-36 overflow-auto rounded bg-surface/50 p-2 font-mono text-[11px] leading-relaxed">
                    {formatJsonForDisplay(action.output)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
