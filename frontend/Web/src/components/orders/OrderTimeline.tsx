import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { Order, OrderStatus } from '@/types';

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

interface Step {
  key: string;
  label: string;
  detail: string;
  state: StepState;
}

const HAPPY_PATH: Array<{ status: OrderStatus; label: string; detail: string }> = [
  {
    status: 'PENDING_CONFIRMATION',
    label: 'Intent recorded',
    detail: 'Order written to the database. No provider contacted, nothing charged.',
  },
  {
    status: 'ORDER_CREATED',
    label: 'Order created at provider',
    detail: 'Razorpay order created server-side with the amount from the product row.',
  },
  {
    status: 'PAYMENT_PENDING',
    label: 'Payment link issued',
    detail: 'Waiting on the customer. The provider owns this step, not this app.',
  },
  {
    status: 'PAID',
    label: 'Payment verified',
    detail: 'Webhook signature verified. This is the only step that can report success.',
  },
];

const RANK: Record<OrderStatus, number> = {
  PENDING_CONFIRMATION: 0,
  ORDER_CREATED: 1,
  PAYMENT_PENDING: 2,
  PAID: 3,
  // Failure states are terminal branches, not positions on the happy path. They
  // are ranked at the point they branch from so the earlier steps still read as
  // completed - the order really did get that far.
  PAYMENT_FAILED: 2,
  PAYMENT_EXPIRED: 2,
  CANCELLED: 0,
};

const FAILURE_LABEL: Partial<Record<OrderStatus, { label: string; detail: string }>> = {
  PAYMENT_FAILED: {
    label: 'Payment failed',
    detail: 'The provider did not capture the payment. Nothing was charged.',
  },
  PAYMENT_EXPIRED: {
    label: 'Payment link expired',
    detail: 'The link lapsed before it was used. Nothing was charged.',
  },
  CANCELLED: {
    label: 'Cancelled',
    detail: 'The order was cancelled before payment. Nothing was charged.',
  },
};

function buildSteps(status: OrderStatus): Step[] {
  const current = RANK[status];
  const failure = FAILURE_LABEL[status];

  const steps: Step[] = HAPPY_PATH.filter(
    // Once a payment has failed, "Payment verified" is not upcoming - it is not
    // going to happen for this order. Showing it greyed out implies it might.
    (step) => !(failure && step.status === 'PAID'),
  ).map((step) => {
    const rank = RANK[step.status];
    const state: StepState = rank < current ? 'done' : rank === current ? 'current' : 'upcoming';
    return { key: step.status, label: step.label, detail: step.detail, state };
  });

  if (failure) {
    steps.push({ key: status, label: failure.label, detail: failure.detail, state: 'failed' });
  }

  return steps;
}

export function OrderTimeline({ order }: { order: Order }) {
  const steps = buildSteps(order.status);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                  step.state === 'done' && 'border-success bg-success text-white',
                  step.state === 'current' && 'border-accent bg-accent-50',
                  step.state === 'upcoming' && 'border-line-strong bg-surface',
                  step.state === 'failed' && 'border-danger bg-danger text-white',
                )}
                aria-hidden
              >
                {step.state === 'done' ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : step.state === 'failed' ? (
                  <X className="size-3" strokeWidth={3} />
                ) : step.state === 'current' ? (
                  <span className="bg-accent animate-pulse-soft size-1.5 rounded-full" />
                ) : null}
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    'w-0.5 flex-1',
                    step.state === 'done' ? 'bg-success/40' : 'bg-line',
                  )}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-5')}>
              <p
                className={cn(
                  'text-[13px] leading-5 font-medium',
                  step.state === 'upcoming' ? 'text-faint' : 'text-ink',
                )}
              >
                {step.label}
              </p>
              <p className="text-muted mt-0.5 text-xs leading-relaxed">{step.detail}</p>
              {step.state === 'current' || step.state === 'failed' ? (
                <p className="text-faint nums mt-1 text-[11px]">
                  {/* The row's own timestamp - the backend's record, not a client clock. */}
                  {formatDateTime(order.updated_at)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
