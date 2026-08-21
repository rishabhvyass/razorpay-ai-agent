import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'razorpay';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-muted border-line',
  accent: 'bg-accent-50 text-accent-700 border-accent-200',
  success: 'bg-success-bg text-success border-success-line',
  warning: 'bg-warning-bg text-warning border-warning-line',
  danger: 'bg-danger-bg text-danger border-danger-line',
  info: 'bg-info-bg text-info border-info-line',
  razorpay: 'bg-info-bg text-razorpay border-info-line',
};

export interface BadgeProps {
  tone?: Tone;
  /**
   * Icons are not decoration here. Every status badge pairs colour with a label and
   * a glyph, so a payment state is never communicated by hue alone.
   */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** A quietly pulsing dot for genuinely in-progress states. */
  pulse?: boolean;
}

export function Badge({ tone = 'neutral', icon, children, className, pulse = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-5 font-medium tracking-tight',
        TONES[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="animate-pulse-soft size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </span>
  );
}
