import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui';

/**
 * A single dashboard metric.
 *
 * `source` is required, not decorative. Every number on the dashboard names where it
 * came from, because a metric card is exactly the place where an invented figure
 * looks most authoritative. If a value cannot be computed from a real endpoint, the
 * card says so instead of showing a zero that reads like a fact. The same applies
 * when the fetch behind it FAILED, which is the case this card previously did not
 * have: with no `error` prop, callers had nothing to pass, so a dashboard whose
 * order query had errored rendered "0 orders" and "₹0.00 revenue" in the same
 * confident type as a real reading. A withheld figure is recoverable; a zero that
 * looks measured is not.
 */
export function MetricCard({
  label,
  value,
  source,
  icon,
  tone = 'default',
  isPending = false,
  unavailable = false,
  error,
}: {
  label: string;
  value: ReactNode;
  source: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  isPending?: boolean;
  unavailable?: boolean;
  /**
   * The fetch this figure is derived from failed. Only its presence is used - the
   * message is not rendered here, because a metric card is too small to explain a
   * failure properly and the page shows the full ErrorState, with its retry and
   * request id, once.
   */
  error?: unknown;
}) {
  const valueTone = {
    default: 'text-ink',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone];

  return (
    <div className="rounded-card border-line bg-surface hover:border-line-strong hover:shadow-subtle border p-4 transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted text-[12px] font-medium">{label}</p>
        {icon ? <span className="text-faint shrink-0">{icon}</span> : null}
      </div>

      {isPending ? (
        <Skeleton className="mt-2.5 h-7 w-20" />
      ) : error ? (
        <p className="text-danger mt-2 text-[13px] leading-snug">Could not be read</p>
      ) : unavailable ? (
        <p className="text-faint mt-2 text-[13px] leading-snug">Not available</p>
      ) : (
        <p className={cn('nums mt-1.5 text-2xl leading-none font-semibold', valueTone)}>{value}</p>
      )}

      <p className="text-faint mt-2 text-[11px] leading-relaxed">{source}</p>
      {error ? (
        <p className="text-danger mt-1 text-[11px] leading-relaxed">
          That read failed, so no figure is shown. A zero here would not be a measurement.
        </p>
      ) : null}
    </div>
  );
}
