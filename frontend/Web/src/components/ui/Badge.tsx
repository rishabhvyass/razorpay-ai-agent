import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'razorpay';

/**
 * Filled tints rather than outlines. A status badge is one of the few places
 * Mercora uses a pill, and it has to be readable at 10px against both a white card
 * and a tinted block — an outline-only chip disappears on the tinted one.
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-muted',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  razorpay: 'bg-warning-bg text-razorpay',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] leading-4 font-bold uppercase tracking-[0.08em]',
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
