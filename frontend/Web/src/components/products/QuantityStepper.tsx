import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Quantity control.
 *
 * A real number input rather than three buttons around a `<span>`: someone buying
 * twelve of something should be able to type 12, and a keyboard user should be able to
 * reach the value. Clamped to the stock on hand, because a quantity the catalogue
 * cannot fill is not a quantity the agent can be asked for.
 *
 * The value chosen here is a request. The number that gets authorised is the one the
 * authorisation card states, which the backend recomputes when the order is created.
 */
export function QuantityStepper({
  value,
  onChange,
  max,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  /** Stock on hand. The stepper never offers more than the catalogue has. */
  max: number;
  disabled?: boolean;
  className?: string;
}) {
  const ceiling = Math.max(1, Math.trunc(max));
  const clamp = (next: number) => Math.min(ceiling, Math.max(1, Math.trunc(next) || 1));

  return (
    <div
      className={cn(
        'border-line bg-surface inline-flex items-stretch overflow-hidden rounded-control border',
        disabled && 'opacity-45',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="text-muted hover:bg-surface-sunken hover:text-ink grid size-11 shrink-0 place-items-center transition-colors disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={ceiling}
        value={value}
        disabled={disabled}
        aria-label="Quantity"
        onChange={(event) => onChange(clamp(Number(event.target.value)))}
        className="text-ink nums border-line w-14 border-x bg-transparent text-center text-[15px] font-bold outline-none [appearance:textfield] focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= ceiling}
        aria-label="Increase quantity"
        className="text-muted hover:bg-surface-sunken hover:text-ink grid size-11 shrink-0 place-items-center transition-colors disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
