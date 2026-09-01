import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useHealth } from '@/hooks/useHealth';
import { ThemeToggle } from '@/hooks/useTheme';
import { config } from '@/lib/config';
import { Badge, MockBadge } from '@/components/ui';
import { TestModeIndicator } from './TestModeIndicator';

/**
 * Page chrome.
 *
 * The brand is not repeated here. The rail carries the mark above 768px and the drawer
 * carries it below, so a second Mercora in the corner would only cost the page title
 * the width it needs on a phone.
 *
 * There is no profile menu. This build has no authentication - the session identity is
 * a generated id, and it is shown for what it is in Settings. An avatar in the corner
 * would imply an account that does not exist.
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
    /*
      No colour transition of its own. A theme change is animated globally by the
      `data-theme-switching` rule (spec section 35), which already forces one on every
      element for the length of the change - a permanent 300ms colour transition here
      only meant the top bar lagged behind the rest of the chrome.
    */
    <header className="bg-canvas border-line z-20 shrink-0 border-b">
      <div className="flex min-h-16 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:px-8 md:py-3.5">
        {onOpenNav ? (
          <button
            type="button"
            onClick={onOpenNav}
            aria-label="Open navigation"
            className="border-line text-muted hover:bg-surface-sunken hover:text-ink motion-fast -ml-1 grid size-11 shrink-0 place-items-center rounded-control border transition-[background-color,color,transform] motion-safe:active:scale-95 md:hidden"
          >
            <Menu className="size-4.5" aria-hidden />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {/* The page title is the only h1 on the screen, and it is set like a title:
              bold, tight tracking, not a 13px label. It stays visible at every width -
              the brand is what gets dropped on a phone, not the answer to "where am I". */}
          <h1 className="text-ink truncate text-[16px] leading-tight font-bold tracking-[-0.02em] md:text-[17px]">
            {title}
          </h1>
          {description ? (
            <p className="text-muted mt-0.5 hidden truncate text-[12px] leading-tight sm:block">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {actions}
          {/* Wrapped rather than given `hidden md:inline-flex` directly: `cn` is a plain
              join, so a passed `hidden` and the indicator's own `inline-flex` are two
              display utilities on one element and CSS order decides the winner - which
              it did, in favour of `inline-flex`. The badge then stayed on a phone and
              squeezed the page title down to one clipped letter. Hiding a parent needs
              no such tie-break. Below 768px the drawer carries the full-width version,
              so the statement is never absent, only relocated. */}
          <span className="hidden md:inline-flex">
            <TestModeIndicator compact />
          </span>
          {/* The rail's segmented control owns the theme above 768px; this is the same
              setting reached from a width where the rail is a drawer. */}
          <ThemeToggle className="md:hidden" />
          {/* Wrapped for the same reason as the indicator above: `Badge` sets its own
              display, so hiding it has to happen on a parent. */}
          {config.useMock ? (
            <span className="hidden lg:inline-flex">
              <MockBadge />
            </span>
          ) : null}
          <Badge tone={connection.tone} pulse={connection.pulse}>
            <span className="hidden sm:inline">{connection.label}</span>
            <span className="sm:hidden">{health.isError ? 'Offline' : 'Online'}</span>
          </Badge>
        </div>
      </div>

      {/* Below 768px the rail is a drawer, and a drawer is shut by default - so the
          badge that lives there is not a persistent statement, it is one a phone user
          has to go looking for. There is also no room for it beside the title at
          375px, which is what clipped the heading before. A thin full-width strip
          under the header is the honest answer: permanent, unmissable, and still
          quieter than anything it sits above. Spec section 36 - test mode must never
          be mistakable for production. */}
      <div className="border-line border-t md:hidden">
        <TestModeIndicator />
      </div>
    </header>
  );
}
