import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'ink';

/**
 * Cards in Mercora are colour blocks, not floating panels.
 *
 * A tinted tone is self-defining, so it carries no border — the fill is the edge.
 * Only `default` gets a 1px line, because a white block on a white canvas has
 * nothing else to distinguish it. That is the whole reason the border is conditional
 * rather than universal: a border under a tint is a second edge doing no work.
 */
const TONES: Record<Tone, string> = {
  default: 'bg-surface border border-line',
  muted: 'bg-surface-sunken',
  accent: 'bg-accent-50',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
  info: 'bg-info-bg',
  ink: 'bg-ink text-canvas',
};

/** Where `interactive` sends the block on hover: one step deeper in its own family. */
const HOVER: Record<Tone, string> = {
  default: 'hover:border-line-strong hover:bg-surface-subtle',
  muted: 'hover:bg-line',
  accent: 'hover:bg-accent-100',
  success: 'hover:brightness-[0.97]',
  warning: 'hover:brightness-[0.97]',
  danger: 'hover:brightness-[0.97]',
  info: 'hover:bg-accent-100',
  ink: 'hover:brightness-125',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Adds the standard 24px padding. Off for cards whose children own their spacing. */
  padded?: boolean;
  /** The whole block is a target: scale and intensify on hover, never elevate. */
  interactive?: boolean;
}

export function Card({
  tone = 'default',
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card motion-micro shadow-none transition-[background-color,border-color,transform,filter]',
        TONES[tone],
        padded && 'p-6',
        // The scale is decoration and opts out under reduced motion; the colour or
        // brightness shift beside it is the part that says "this is a target", and it
        // stays (spec sections 3 and 15).
        interactive && cn('motion-safe:hover:scale-[1.01]', HOVER[tone]),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="text-muted mt-0.5 shrink-0">{icon}</span> : null}
        <div className="min-w-0">
          <h3 className="text-ink truncate text-[15px] font-bold">{title}</h3>
          {description ? (
            <p className="text-muted mt-1 text-[13px] leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
