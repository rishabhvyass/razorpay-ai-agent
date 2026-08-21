import { Link } from 'react-router-dom';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatMinor } from '@/lib/money';
import { truncateId } from '@/lib/format';
import type { Order } from '@/types';

/**
 * The only state in the app that says a payment succeeded.
 *
 * It renders exclusively when `order.status === 'PAID'`, and the backend writes that
 * status from exactly one place: a Razorpay webhook whose HMAC signature verified.
 * No client action, no timer, and no optimistic update can reach this component -
 * which is why it is allowed to state plainly that the payment was verified.
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
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <span className="bg-success-bg border-success-line animate-check-pop grid size-8 shrink-0 place-items-center rounded-full border">
          <BadgeCheck className="text-success size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold">Payment verified</p>
          <p className="text-muted text-[12px]">
            {formatMinor(order.amount, order.currency)} confirmed
          </p>
        </div>
      </div>

      <div className="rounded-control border-success-line bg-success-bg flex items-start gap-2.5 border px-3 py-2.5">
        <ShieldCheck className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p className="text-muted text-xs leading-relaxed">
          {isMock
            ? 'Confirmed by the simulated provider. In production this state is reached only when a Razorpay webhook arrives with a valid HMAC signature — never from anything the browser does.'
            : 'Confirmed by a Razorpay webhook with a verified HMAC signature. The order status was written server-side.'}
        </p>
      </div>

      {paymentId ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted text-[12px]">Payment ID</span>
          <span className="text-muted nums font-mono text-[12px]" title={paymentId}>
            {truncateId(paymentId, 14, 4)}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link to={`/orders/${order.id}`} className="sm:flex-1">
          <Button variant="secondary" size="md" fullWidth>
            View order
          </Button>
        </Link>
        <Link to="/products" className="sm:flex-1">
          <Button variant="ghost" size="md" fullWidth>
            Keep shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
