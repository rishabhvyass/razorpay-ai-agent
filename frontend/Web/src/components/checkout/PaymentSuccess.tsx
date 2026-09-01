import { Link } from 'react-router-dom';
import { BadgeCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatMinor, formatMinorSpoken } from '@/lib/money';
import { truncateId } from '@/lib/format';
import { stagger } from '@/lib/motion';
import type { Order } from '@/types';

/**
 * The only state in the app that says a payment succeeded.
 *
 * It renders exclusively when `order.status === 'PAID'`, and the backend writes that
 * status from exactly one place: a Razorpay webhook whose HMAC signature verified.
 * No client action, no timer, and no optimistic update can reach this component -
 * which is why it is allowed to state plainly that the payment was verified.
 *
 * Spec section 26 asks the outcome to arrive in order rather than all at once: the
 * block settles, the tick draws, the sentence follows, the buttons last. It is one
 * sequence built from the shared `--stagger` step (50ms) and it is over inside 460ms,
 * which is the whole budget - the reader is being told something, not applauded. There
 * is no timer driving it and no state to advance: the sequence is CSS delays on a
 * component that only mounts once the backend already said PAID.
 */
export function PaymentSuccess({
  order,
  paymentId,
  isMock,
}: {
  order: Order;
  paymentId: string | null;
  isMock: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Emerald block, one tick, no confetti (spec section 12). The restraint is the
          point: this state is trustworthy because it is only reachable from a verified
          webhook, and celebrating it harder would not make it truer. */}
      <div className="rounded-card bg-success-bg animate-scale-in overflow-hidden">
        <div className="bg-success flex items-center gap-2 px-5 py-2.5 text-white">
          <BadgeCheck className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase">Payment verified</h3>
        </div>

        <div className="p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-muted text-[11px] font-bold tracking-[0.08em] uppercase">
                Paid in full
              </p>
              <p
                className="text-ink nums mt-1.5 text-[30px] leading-none font-extrabold tracking-[-0.02em]"
                aria-label={formatMinorSpoken(order.amount, order.currency)}
              >
                {formatMinor(order.amount, order.currency)}
              </p>
            </div>
            {/* Second in the sequence: the badge settles at 0.86 → 1 and the tick draws
                itself along its own stroke, both on the same inherited delay. */}
            <span
              className="bg-success animate-check-pop grid size-9 shrink-0 place-items-center rounded-full text-white"
              style={stagger(1)}
            >
              <Check className="animate-check-draw size-5" strokeWidth={3} aria-hidden />
            </span>
          </div>

          <p
            className="text-ink border-success-line animate-fade-up mt-4 border-t pt-4 text-[13px] leading-relaxed"
            style={stagger(3)}
          >
            {isMock
              ? 'Confirmed by the labelled simulation. In production this state is reached only when a Razorpay webhook arrives with a valid HMAC signature - never from anything this browser does.'
              : 'Confirmed by a Razorpay webhook with a verified HMAC signature. The status was written server-side; the browser only read it.'}
          </p>

          <dl className="animate-fade-up mt-4 space-y-1.5" style={stagger(3)}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted text-[12px] font-medium">Order</dt>
              <dd className="text-muted nums font-mono text-[12px]" title={order.id}>
                {truncateId(order.id, 8, 4)}
              </dd>
            </div>
            {paymentId ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted text-[12px] font-medium">Razorpay payment</dt>
                <dd className="text-muted nums font-mono text-[12px]" title={paymentId}>
                  {truncateId(paymentId, 14, 4)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="animate-fade-up flex flex-col gap-2.5 sm:flex-row" style={stagger(4)}>
        <Link to={`/orders/${order.id}`} className="sm:flex-1">
          <Button variant="secondary" size="lg" fullWidth>
            View order
          </Button>
        </Link>
        <Link to="/products" className="sm:flex-1">
          <Button variant="ghost" size="lg" fullWidth>
            Continue shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
