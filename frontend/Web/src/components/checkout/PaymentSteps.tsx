import { Check, Circle, Hourglass, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Order } from '@/types';

/**
 * The four-step payment tracker from spec sections 20, 22 and 28.
 *
 * Deliberately separate from `OrderTimeline`, which narrates the whole order
 * lifecycle on the detail page. This one answers a narrower question the payment
 * card needs to answer at a glance: how far has *this payment* got, and is it still
 * moving?
 *
 * Every step's state is derived from the order row and the presence of a real
 * payment link - never from elapsed time, never from a local guess. "Payment link
 * generated" does not tick just because an order exists: if the payments layer has
 * not issued a link, the step stays open, because claiming otherwise would be the
 * interface asserting something it cannot see.
 */
type StepState = 'done' | 'current' | 'upcoming' | 'failed';

const ICON: Record<StepState, typeof Check> = {
  done: Check,
  current: Hourglass,
  upcoming: Circle,
  failed: X,
};

function Step({ label, state, last }: { label: string; state: StepState; last: boolean }) {
  const Icon = ICON[state];

  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-full',
          state === 'done' && 'bg-success text-white',
          state === 'current' && 'bg-warning text-white',
          state === 'upcoming' && 'border-line-strong bg-surface border',
          state === 'failed' && 'bg-danger text-white',
        )}
        aria-hidden
      >
        {state === 'upcoming' ? null : <Icon className="size-2.5" strokeWidth={3.5} />}
      </span>

      <span
        className={cn(
          'text-[12px] leading-tight',
          state === 'upcoming' ? 'text-faint' : 'text-muted',
          state === 'current' && 'text-ink font-medium',
        )}
      >
        {label}
      </span>

      {/* The state is also written out for assistive tech, because the icon and the
          colour are the only visual carriers and spec section 37 forbids relying on
          colour alone. */}
      <span className="sr-only">
        {state === 'done'
          ? ' — complete'
          : state === 'current'
            ? ' — in progress'
            : state === 'failed'
              ? ' — failed'
              : ' — not started'}
      </span>

      {!last ? <span className="bg-line ml-0.5 h-px flex-1" aria-hidden /> : null}
    </li>
  );
}

export function PaymentSteps({
  order,
  paymentUrl,
}: {
  order: Order;
  /** A real link, from the backend or the labelled mock. Absence keeps step 2 open. */
  paymentUrl?: string | null;
}) {
  const failed =
    order.status === 'PAYMENT_FAILED' ||
    order.status === 'PAYMENT_EXPIRED' ||
    order.status === 'CANCELLED';
  const paid = order.status === 'PAID';

  // A link exists if the provider issued one, or if one is in hand right now. Past
  // orders keep the id even after the URL is no longer held in memory.
  const hasLink =
    Boolean(paymentUrl) ||
    Boolean(order.razorpayPaymentLinkId) ||
    order.status === 'PAYMENT_PENDING' ||
    paid;

  // A settled order has nothing in progress. Reading "Payment link generated - in
  // progress" underneath "Payment not verified - failed" describes a payment that is
  // still moving, on an order that has stopped. Which of the two replaces it depends
  // on what the terminal status actually implies:
  //
  //   PAYMENT_FAILED / PAYMENT_EXPIRED  the provider had an attempt to decline or
  //                                     expire, so a link existed. Done.
  //   CANCELLED                         says nothing about whether a link was ever
  //                                     issued, so it is left not-started rather
  //                                     than claimed either way.
  //
  // This is only reached when the link itself is not in hand: the mock overlay's URL
  // is not threaded through the failure card, and a real failed order keeps no live
  // URL, so `hasLink` cannot see one even though one existed.
  const linkState: StepState = hasLink
    ? 'done'
    : order.status === 'PAYMENT_FAILED' || order.status === 'PAYMENT_EXPIRED'
      ? 'done'
      : order.status === 'CANCELLED'
        ? 'upcoming'
        : 'current';

  const steps: Array<{ label: string; state: StepState }> = [
    { label: 'Order created', state: 'done' },
    { label: 'Payment link generated', state: linkState },
  ];

  if (failed) {
    steps.push({ label: 'Payment not verified', state: 'failed' });
  } else {
    steps.push({
      label: 'Waiting for payment',
      state: paid ? 'done' : hasLink ? 'current' : 'upcoming',
    });
    steps.push({ label: 'Payment verification', state: paid ? 'done' : 'upcoming' });
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Payment progress">
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
