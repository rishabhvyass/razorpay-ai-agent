import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui';

/**
 * A single dashboard metric.
 *
 * `source` is required, not decorative. Every number on the dashboard names where it
 * came from, because a metric card is exactly the place where an invented figure
 * looks most authoritative. If a value cannot be computed from a real endpoint, the
 * card says so instead of showing a zero that reads like a fact.
 */
export function MetricCard({
  label,
  value,
  source,
  icon,
  tone = 'default',
  isPending = false,
  unavailable = false,
}: {
  label: string;
  value: ReactNode;
  source: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  isPending?: boolean;
  unavailable?: boolean;
}) {
  const valueTone = {
    default: 'text-ink',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone];

  return (
    <div className="rounded-card border-line bg-surface border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted text-[12px] font-medium">{label}</p>
        {icon ? <span className="text-faint shrink-0">{icon}</span> : null}
      </div>

      {isPending ? (
        <Skeleton className="mt-2.5 h-7 w-20" />
      ) : unavailable ? (
        <p className="text-faint mt-2 text-[13px] leading-snug">Not available</p>
      ) : (
        <p className={cn('nums mt-1.5 text-2xl leading-none font-semibold', valueTone)}>{value}</p>
      )}

      <p className="text-faint mt-2 text-[11px] leading-relaxed">{source}</p>
    </div>
  );
}
