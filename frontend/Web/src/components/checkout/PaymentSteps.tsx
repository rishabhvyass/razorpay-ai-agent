import { Check, Circle, Hourglass, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChangeCount } from '@/hooks/useChangeCount';
import type { Order } from '@/types';

/**
 * A compact, read-only view of the payment lifecycle.
 *
 * The tracker never names or exposes a payment instrument. Each state comes from
 * the order row and provider identifiers, not from a timer or a local assumption.
 */
type StepState = 'done' | 'current' | 'upcoming' | 'failed';

const ICON: Record<StepState, typeof Check> = {
  done: Check,
  current: Hourglass,
  upcoming: Circle,
  failed: X,
};

const STATE_WORD: Record<StepState, string> = {
  done: 'Complete',
  current: 'Waiting',
  upcoming: 'Not started',
  failed: 'Failed',
};

function Step({ label, state, last }: { label: string; state: StepState; last: boolean }) {
  const Icon = ICON[state];
  const changes = useChangeCount(state);
  const transitioned = changes > 0;

  return (
    <li className="relative flex items-start gap-3 pb-3 last:pb-0">
      {!last ? (
        <span
          className={cn(
            'motion-normal absolute top-6 bottom-0 left-[11px] w-0.5 transition-colors',
            state === 'done' ? 'bg-success' : 'bg-line',
          )}
          aria-hidden
        />
      ) : null}

      <span
        className={cn(
          'rounded-control motion-fast relative z-10 grid size-6 shrink-0 place-items-center',
          'transition-[background-color,border-color]',
          state === 'done' && 'bg-success text-white',
          state === 'current' && 'bg-warning text-white',
          state === 'upcoming' && 'border-line-strong bg-surface border-2',
          state === 'failed' && 'bg-danger text-white',
        )}
        aria-hidden
      >
        {state === 'upcoming' ? (
          <span className="bg-line-strong size-1.5 rounded-full" />
        ) : (
          <Icon
            key={changes}
            className={cn(
              'size-3.5',
              transitioned && (state === 'done' ? 'animate-check-draw' : 'animate-check-pop'),
            )}
            strokeWidth={3}
          />
        )}
      </span>

      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
        <span
          className={cn(
            'motion-fast text-[12.5px] leading-tight font-bold tracking-[-0.01em] transition-colors',
            state === 'upcoming' ? 'text-faint' : 'text-ink',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'motion-fast shrink-0 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors',
            state === 'done' && 'text-success',
            state === 'current' && 'text-warning',
            state === 'failed' && 'text-danger',
            state === 'upcoming' && 'text-faint',
          )}
        >
          {STATE_WORD[state]}
        </span>
      </div>
    </li>
  );
}

export function PaymentSteps({ order }: { order: Order }) {
  const failed =
    order.status === 'PAYMENT_FAILED' ||
    order.status === 'PAYMENT_EXPIRED' ||
    order.status === 'CANCELLED';
  const paid = order.status === 'PAID';
  const paymentStarted =
    Boolean(order.razorpayPaymentLinkId) ||
    Boolean(order.razorpayOrderId) ||
    order.status === 'PAYMENT_PENDING' ||
    paid;

  const initiationState: StepState = paymentStarted
    ? 'done'
    : order.status === 'PAYMENT_FAILED' || order.status === 'PAYMENT_EXPIRED'
      ? 'done'
      : order.status === 'CANCELLED'
        ? 'upcoming'
        : 'current';

  const steps: Array<{ label: string; state: StepState }> = [
    { label: 'Order created', state: 'done' },
    { label: 'Payment initiation', state: initiationState },
  ];

  if (failed) {
    steps.push({ label: 'Payment not verified', state: 'failed' });
  } else {
    steps.push({
      label: 'Waiting for payment',
      state: paid ? 'done' : paymentStarted ? 'current' : 'upcoming',
    });
    steps.push({ label: 'Payment verification', state: paid ? 'done' : 'upcoming' });
  }

  return (
    <ol className="flex flex-col" aria-label="Payment progress">
      {steps.map((step, index) => (
        <Step
          key={step.label}
          label={step.label}
          state={step.state}
          last={index === steps.length - 1}
        />
      ))}
    </ol>
  );
}
