import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

/**
 * `primary` is reserved for the affirmative action in a flow. There is exactly one
 * per surface - notably, the confirm button on the purchase gate - because a screen
 * with three primary buttons has no primary button, and this is the one screen
 * where the user must not misidentify which control spends money.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-700 active:bg-accent-900 shadow-subtle',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-sunken',
  ghost: 'text-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90 shadow-subtle',
  success: 'bg-success text-white hover:brightness-95 shadow-subtle',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[0.5rem]',
  md: 'h-10 px-4 text-sm gap-2 rounded-control',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-control',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      // A loading button stays disabled: the loading state exists because a
      // request is in flight, and letting it be clicked again is how you get two
      // orders from one intent.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // `aria-disabled` styled the same as `disabled`, for the case where a control
        // must stay focusable so a screen reader can reach the explanation of why it
        // is unavailable. A truly `disabled` button leaves the tab order, which takes
        // its `aria-describedby` with it. Callers using it are responsible for
        // guarding their own handler - the attribute is advisory to the browser.
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
