import { useId, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
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
import { Collapse } from '@/components/motion';
import { stagger } from '@/lib/motion';
import { useChangeCount } from '@/hooks/useChangeCount';
import type { AgentAction, AgentActionStatus } from '@/types';

/**
 * One line in the agent audit trail.
 *
 * Visually and semantically distinguishes:
 * - AI DECISION (recommendations, search queries)
 * - USER AUTHORIZATION (explicit human approval)
 * - SYSTEM ACTION (server-side price calculations, state transitions)
 * - MONEY ACTION (financial order creation and checkout session creation)
 * - RAZORPAY VERIFIED (HMAC-verified webhooks & API captures)
 */

/**
 * Icons are held as components rather than elements so a row can animate the one it
 * renders (spec section 29). A shared element cannot carry a per-row class.
 */
const STATUS: Record<
  AgentActionStatus,
  { tone: 'neutral' | 'success' | 'danger' | 'warning'; label: string; Icon: typeof Check }
> = {
  started: { tone: 'neutral', label: 'Running', Icon: Loader2 },
  success: { tone: 'success', label: 'Success', Icon: Check },
  failed: { tone: 'danger', label: 'Failed', Icon: AlertTriangle },
  blocked: { tone: 'warning', label: 'Blocked', Icon: Ban },
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

export function AgentActivityItem({ action, index }: { action: AgentAction; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const type = actionTypeStyle(action.actionType);
  const status = STATUS[action.status] ?? STATUS.started;
  const hasPayload = action.input !== null || action.output !== null;

  /**
   * Spec section 29. A row that was already `success` when the panel opened does not
   * draw its tick again; a row that goes `started → success` while the reader is
   * watching does. The value being watched is the status the backend recorded, so the
   * mark follows the audit trail rather than the passage of time.
   */
  const changes = useChangeCount(action.status);
  const StatusIcon = status.Icon;

  return (
    // Spec section 13: entries arrive from the rail they hang off - 8px on X, not Y -
    // and a batch that lands together is stepped by the shared stagger.
    <li className="animate-enter-x" style={index === undefined ? undefined : stagger(index)}>
      <div className="flex gap-2.5">
        <span
          className={cn(
            'motion-fast mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
            type.ring,
          )}
          title={type.label}
        >
          {type.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink font-mono text-[12px] font-medium">{action.toolName}</span>
            <Badge tone={type.badgeTone}>{type.label}</Badge>
            <Badge
              tone={status.tone}
              icon={
                <StatusIcon
                  // Keyed so a second transition replays rather than inheriting a
                  // finished animation.
                  key={changes}
                  className={cn(
                    'size-3',
                    action.status === 'started' && 'animate-spin',
                    changes > 0 &&
                      (action.status === 'success' ? 'animate-check-draw' : 'animate-check-pop'),
                  )}
                  {...(action.status === 'success' ? { strokeWidth: 3 } : {})}
                  aria-hidden
                />
              }
            >
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
                aria-controls={panelId}
                className="text-faint hover:text-muted motion-fast inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
              >
                {/* Spec section 30: 0 → 90°, on the micro duration. */}
                <ChevronRight
                  className={cn(
                    'motion-micro size-3 transition-transform',
                    expanded && 'rotate-90',
                  )}
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

          {/* Height and opacity together, measured by the grid rather than by JS, and
              `inert` while closed so the payload is not reachable by tab or by a screen
              reader when it is not visible. The payload is still only rendered when it
              exists - `Collapse` animates whether it is shown, not whether it is here. */}
          {hasPayload ? (
            <Collapse open={expanded} id={panelId}>
              <div className="border-line bg-surface-sunken mt-2 space-y-2 rounded-lg border p-2.5">
                {action.requestId ? (
                  <div className="text-faint font-mono text-[10px]">
                    Request ID: <span className="text-muted">{action.requestId}</span>
                  </div>
                ) : null}

                {action.input !== null ? (
                  <div>
                    <p className="text-faint mb-1 text-[10px] font-semibold uppercase">
                      Input Payload
                    </p>
                    <pre className="text-muted scrollbar-slim bg-surface/50 max-h-36 overflow-auto rounded p-2 font-mono text-[11px] leading-relaxed">
                      {formatJsonForDisplay(action.input)}
                    </pre>
                  </div>
                ) : null}

                {action.output !== null ? (
                  <div>
                    <p className="text-faint mb-1 text-[10px] font-semibold uppercase">
                      Output Result
                    </p>
                    <pre className="text-muted scrollbar-slim bg-surface/50 max-h-36 overflow-auto rounded p-2 font-mono text-[11px] leading-relaxed">
                      {formatJsonForDisplay(action.output)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </Collapse>
          ) : null}
        </div>
      </div>
    </li>
  );
}
