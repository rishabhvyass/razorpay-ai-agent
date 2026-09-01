import { Hourglass } from 'lucide-react';
import { PaymentSteps } from './PaymentSteps';
import type { Order } from '@/types';

/**
 * Read-only payment state for an order that is not settled yet.
 *
 * Standard Checkout is rendered by the parent immediately above this status panel.
 * This component reports what the backend knows, while PAID remains reachable only
 * through server-side verification.
 */
export function PaymentPending({ order }: { order: Order }) {
  const paymentStarted =
    order.status === 'PAYMENT_PENDING' ||
    Boolean(order.razorpayOrderId) ||
    Boolean(order.razorpayPaymentLinkId);
  const headline = paymentStarted ? 'Payment awaiting verification' : 'Payment not started';

  return (
    <div className="space-y-5">
      <div className="rounded-card bg-warning-bg animate-scale-in overflow-hidden">
        <div className="bg-warning flex items-center gap-2 px-5 py-2.5 text-white">
          <Hourglass className="animate-pulse-soft size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase">Payment not verified</h3>
        </div>

        <div className="p-5">
          <p className="text-ink text-[17px] leading-tight font-extrabold tracking-[-0.02em]">
            {headline}
          </p>
          <p className="text-muted mt-2 text-[13px] leading-relaxed">
            {paymentStarted
              ? 'The order is waiting for the payment provider to confirm the result.'
              : 'The order is recorded, but no payment has been started. Nothing has been charged.'}{' '}
            This status changes only when the backend receives and verifies the provider&apos;s
            confirmation.
          </p>

          <div className="border-warning-line mt-4 border-t pt-4">
            <PaymentSteps order={order} />
          </div>
        </div>
      </div>

      <p className="text-faint text-[11.5px] leading-relaxed">
        The Standard Checkout button opens Razorpay in a secure modal. The status shown here is
        read from the backend and will only become successful after provider verification.
      </p>
    </div>
  );
}
