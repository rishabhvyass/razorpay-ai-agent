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
        <div className="bg-surface-sunken text-faint mb-4 grid size-11 place-items-center rounded-full">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-sm font-semibold">{title}</p>
      {description ? (
        <p className="text-muted mt-1.5 max-w-sm text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
