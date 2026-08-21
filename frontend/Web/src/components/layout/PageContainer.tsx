import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Topbar } from './Topbar';
import { useNav } from './AppShell';

/**
 * A standard page: top bar plus a width-constrained scroll region.
 *
 * `fill` opts out of the constrained container for the one page that needs the
 * full viewport height without an outer scrollbar - the chat, whose own message
 * list scrolls.
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

  return (
    <>
      <Topbar
        title={title}
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
        {...(nav ? { onOpenNav: nav.openNav } : {})}
      />
      {fill ? (
        <main className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</main>
      ) : (
        <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8', className)}>
          {children}
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
    <section className={cn('space-y-3.5', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-ink text-[13px] font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-muted mt-0.5 text-[12px]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
