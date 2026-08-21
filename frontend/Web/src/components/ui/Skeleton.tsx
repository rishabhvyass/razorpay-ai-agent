import { cn } from '@/lib/cn';

/**
 * Loading placeholder.
 *
 * Skeletons rather than spinners for content that has a known shape (spec section
 * 30): a grid of product cards that resolves into a grid of product cards does not
 * make the page jump, and the layout is legible before the data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('bg-surface-sunken animate-pulse-soft rounded-md', className)}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border-line bg-surface overflow-hidden border">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function RowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="border-line flex items-center gap-4 border-b px-4 py-3.5">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3', index === 0 ? 'w-32' : 'w-20')} />
      ))}
    </div>
  );
}
