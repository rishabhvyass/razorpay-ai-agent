import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useHealth } from '@/hooks/useHealth';
import { config } from '@/lib/config';
import { Badge, MockBadge } from '@/components/ui';

/**
 * Top bar: page identity on the left, honest system state on the right.
 *
 * The connection badge reports the result of a live `GET /health` poll, so it can
 * say "Backend offline" - a status indicator that can only ever show the good state
 * is not an indicator.
 */
export function Topbar({
  title,
  description,
  actions,
  onOpenNav,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  onOpenNav?: () => void;
}) {
  const health = useHealth();

  const connection = health.isPending
    ? { tone: 'neutral' as const, label: 'Checking…', pulse: true }
    : health.isError
      ? { tone: 'danger' as const, label: 'Backend offline', pulse: false }
      : { tone: 'success' as const, label: 'Backend online', pulse: true };

  return (
    <header className="border-line bg-surface/80 sticky top-0 z-20 border-b backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-3.5">
        {onOpenNav ? (
          <button
            type="button"
            onClick={onOpenNav}
            aria-label="Open navigation"
            className="text-muted hover:bg-surface-sunken hover:text-ink -ml-1 grid size-9 shrink-0 place-items-center rounded-lg transition-colors md:hidden"
          >
            <Menu className="size-4.5" aria-hidden />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="text-ink truncate text-[15px] leading-tight font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted mt-0.5 hidden truncate text-[12px] leading-tight sm:block">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {config.useMock ? <MockBadge className="hidden sm:inline-flex" /> : null}
          <Badge tone={connection.tone} pulse={connection.pulse}>
            <span className="hidden sm:inline">{connection.label}</span>
            <span className="sm:hidden">{health.isError ? 'Offline' : 'Online'}</span>
          </Badge>
        </div>
      </div>
    </header>
  );
}
