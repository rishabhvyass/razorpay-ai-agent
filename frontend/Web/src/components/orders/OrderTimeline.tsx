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
  const reached = RANK[status];
  const failure = FAILURE_LABEL[status];

  // PAID and the three failure states are terminal: nothing about the order is
  // still in flight. Deriving `current` from rank equality alone got this wrong in
  // both directions - a PAID order left "Payment verified" pulsing as though the
  // webhook were still pending, and a PAYMENT_FAILED order left "Payment link
  // issued - waiting on the customer" pulsing on an order that had already
  // stopped. On a settled order every step it reached is simply complete.
  const terminal = status === 'PAID' || failure !== undefined;

  const steps: Step[] = HAPPY_PATH.filter(
    // Beyond the point a failure branched from, the remaining steps are not
    // upcoming - they are not going to happen for this order at all, and greying
    // them out implies they still might. CANCELLED branches at the first step, so
    // it drops the three after it rather than only "Payment verified".
    (step) => !failure || RANK[step.status] <= reached,
  ).map((step) => {
    const rank = RANK[step.status];
    const state: StepState = terminal
      ? 'done'
      : rank < reached
        ? 'done'
        : rank === reached
          ? 'current'
          : 'upcoming';
    return { key: step.status, label: step.label, detail: step.detail, state };
  });

  if (failure) {
    steps.push({ key: status, label: failure.label, detail: failure.detail, state: 'failed' });
  }

  return steps;
}

export function OrderTimeline({ order }: { order: Order }) {
  const steps = buildSteps(order.status);

  // `updatedAt` says when the order last moved, so it belongs on the furthest step
  // the order actually reached: the failure step, the final step of a settled
  // order, or the one in flight. Keying it off `current` alone meant a PAID order
  // carried no timestamp at all once nothing was marked current.
  const stampIndex = steps.reduce(
    (last, step, index) => (step.state === 'upcoming' ? last : index),
    0,
  );

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
                {/* The state is carried visually by an icon and a colour. Spec
                    section 37 forbids leaning on colour alone, so it is also
                    written out for assistive tech. */}
                <span className="sr-only">
                  {step.state === 'done'
                    ? ' — complete'
                    : step.state === 'current'
                      ? ' — in progress'
                      : step.state === 'failed'
                        ? ' — failed'
                        : ' — not reached'}
                </span>
              </p>
              <p className="text-muted mt-0.5 text-xs leading-relaxed">{step.detail}</p>
              {index === stampIndex ? (
                <p className="text-faint nums mt-1 text-[11px]">
                  {/* The row's own timestamp - the backend's record, not a client clock. */}
                  {formatDateTime(order.updatedAt)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
