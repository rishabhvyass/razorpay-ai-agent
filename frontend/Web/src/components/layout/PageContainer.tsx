import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Topbar } from './Topbar';
import { useNav } from './AppShell';

/**
 * A standard page: top bar plus a scroll region.
 *
 * The shell is one viewport tall, so scrolling happens here rather than on the
 * document - the top bar stays put without needing to be sticky, and the rail cannot be
 * scrolled away.
 *
 * `fill` hands the whole region to the page instead, for the chat: its message list
 * scrolls on its own and the composer has to stay pinned at the bottom.
 *
 * Spec section 8 lives here rather than in each page: the content region is keyed by
 * pathname, so a route change replays one entrance in one place. The rail and the top
 * bar are deliberately outside it - the chrome does not move when the page inside it
 * changes, which is the difference between navigating within an app and reloading it.
 */
export function Page({
  title,
  description,
  actions,
  children,
  fill = false,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  fill?: boolean;
  className?: string;
}) {
  const nav = useNav();
  const { pathname } = useLocation();

  return (
    <>
      <Topbar
        title={title}
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
        {...(nav ? { onOpenNav: nav.openNav } : {})}
      />
      {fill ? (
        <main
          key={pathname}
          className={cn('animate-page flex min-h-0 flex-1 flex-col overflow-hidden', className)}
        >
          {children}
        </main>
      ) : (
        <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
          {/* The animation sits on the inner block, not on the scroll container: a
              transform on the scroller would move the scrollbar with it. */}
          <div
            key={pathname}
            className={cn(
              'animate-page mx-auto w-full max-w-7xl px-4 py-7 md:px-8 md:py-10',
              className,
            )}
          >
            {children}
          </div>
        </main>
      )}
    </>
  );
}

/** Section heading used inside pages, so headings stay consistent across them. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-ink text-[17px] leading-tight font-bold tracking-[-0.02em]">
            {title}
          </h2>
          {description ? (
            <p className="text-muted mt-1 text-[13px] leading-relaxed">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
