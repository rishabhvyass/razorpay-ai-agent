import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leading, trailing, invalid = false, className, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'bg-surface rounded-control flex h-10 items-center gap-2 border px-3 transition-colors',
        'focus-within:border-accent-300 focus-within:ring-accent-100 focus-within:ring-2',
        invalid ? 'border-danger-line' : 'border-line-strong',
        className,
      )}
    >
      {leading ? <span className="text-faint shrink-0">{leading}</span> : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        // The ring lives on the wrapper, so the inner element drops its own -
        // otherwise focus draws two rings a few pixels apart.
        className="text-ink placeholder:text-faint min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
        {...rest}
      />
      {trailing ? <span className="text-faint shrink-0">{trailing}</span> : null}
    </div>
  );
});

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-ink block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-muted text-xs leading-relaxed">{hint}</p> : null}
    </div>
  );
}
