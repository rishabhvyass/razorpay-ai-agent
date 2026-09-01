import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Empty states explain and offer a next step (spec section 30). "No results" on its
 * own tells the user nothing they didn't already know.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        // A square block, not a circle: the empty state uses the same geometry as
        // every other container in the system.
        <div className="bg-surface-sunken text-muted mb-5 grid size-12 place-items-center rounded-card">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-[16px] font-bold">{title}</p>
      {description ? (
        <p className="text-muted mt-2 max-w-sm text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
