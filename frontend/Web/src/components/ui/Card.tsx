import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  default: 'border-line bg-surface',
  accent: 'border-accent-200 bg-accent-50',
  success: 'border-success-line bg-success-bg',
  warning: 'border-warning-line bg-warning-bg',
  danger: 'border-danger-line bg-danger-bg',
  info: 'border-info-line bg-info-bg',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Adds the default padding. Off for cards whose children own their own spacing. */
  padded?: boolean;
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
        'rounded-card border',
        TONES[tone],
        padded && 'p-4',
        interactive && 'hover:shadow-card hover:border-line-strong transition-all duration-200',
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
          <h3 className="text-ink truncate text-sm font-semibold">{title}</h3>
          {description ? <p className="text-muted mt-0.5 text-[13px]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
