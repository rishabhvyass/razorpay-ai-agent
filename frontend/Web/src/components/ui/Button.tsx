import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Mercora button.
 *
 * Flat by construction: there is no elevation, and feedback is a colour shift plus a
 * 1% scale, never a shadow. Four things are worth knowing before adding a call site.
 *
 * `primary` is reserved for the affirmative action in a flow, and there is exactly
 * one per surface — notably the approve button on the purchase gate — because a
 * screen with three primary buttons has no primary button, and this is the one screen
 * where the user must not misidentify which control spends money.
 *
 * `outline` carries a 4px border rather than the usual 1px. That is deliberate: it is
 * the only variant whose weight comes entirely from its edge, so a hairline would
 * read as a disabled input rather than a button.
 *
 * `xl` (64px) and `lg` (56px) exist for money actions. A 40px button is fine for
 * "Clear filters"; it is not fine for the control that authorises a payment.
 *
 * A `loading` button is disabled while the request is in flight, because letting it
 * be clicked twice is how one intent becomes two orders.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-blue text-white hover:bg-brand-blue-deep',
  secondary: 'bg-surface-sunken text-ink hover:bg-line',
  outline: 'border-4 border-ink bg-transparent text-ink hover:bg-ink hover:text-canvas',
  ghost: 'bg-transparent text-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
  success: 'bg-success text-white hover:brightness-95',
};

/**
 * Every size clears the 44px touch target except `sm`, which is only used for
 * secondary controls inside dense rows where a 44px button would break the row.
 */
const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-[13px] gap-1.5',
  md: 'min-h-11 px-5 text-[14px] gap-2',
  lg: 'min-h-14 px-7 text-[15px] gap-2.5',
  xl: 'min-h-16 px-8 text-[16px] gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  /**
   * A settled outcome, shown in place of the icon (spec section 47).
   *
   * Only ever passed from something the server has already decided - an order that
   * exists, a request that came back with an error. There is no timer and no optimistic
   * path to `success` here: the prop is presentation for a fact held elsewhere, and a
   * button that congratulates itself is a button that can be wrong.
   */
  state?: 'idle' | 'success' | 'error';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    state = 'idle',
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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap',
        'motion-micro transition-[background-color,color,border-color,transform,opacity]',
        // 2% on hover, 3% down on press (spec section 16). Both are `motion-safe`: the
        // press is confirmation that the click landed, not information, and a reader who
        // asked for less movement gets the colour shift on its own.
        'motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100',
        // `aria-disabled` is styled the same as `disabled`, for controls that must
        // stay focusable so a screen reader can reach the explanation of why they are
        // unavailable — a truly `disabled` button leaves the tab order and takes its
        // `aria-describedby` with it. Callers using it must guard their own handler.
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {/* One slot, three occupants: the spinner while a request is in flight, the
          settled outcome once there is one, the caller's own icon otherwise. The tick
          draws itself along its stroke rather than popping, which is the difference
          between confirming something and celebrating it. */}
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : state === 'success' ? (
        <Check className="animate-check-draw size-4 shrink-0" strokeWidth={3} aria-hidden />
      ) : state === 'error' ? (
        <AlertCircle className="animate-fade-in size-4 shrink-0" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
