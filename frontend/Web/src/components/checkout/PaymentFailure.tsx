import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { formatMinor } from '@/lib/money';
import { ORDER_STATUS_PRESENTATION } from '@/components/orders/OrderStatus';
import { PaymentSteps } from './PaymentSteps';
import type { Order } from '@/types';

/**
 * Payment did not go through.
 *
 * Spec sections 22 and 28: a failure is a first-class state, not an error toast. It
 * says what happened, states clearly that nothing was charged, shows how far the
 * payment actually got, and offers what the user might reasonably want next.
 *
 * It never blames the user and never suggests the payment "might" have gone through.
 * The order row says it did not.
 *
 * On the missing Retry action: spec section 22 lists a retry, and this card used to
 * carry a primary "Try payment again" button. It could not do that. Retrying is a
 * money action, so it needs the same explicit authorisation as the first attempt,
 * and the only handler any caller ever supplied was a refetch of the order row -
 * a button labelled as a payment attempt that re-read a database row instead. The
 * honest action on a settled failure is to re-read the provider's verdict, so that
 * is what the button now says and does. Re-authorising happens back in the
 * conversation, through the approval gate.
 *
 * A customer closing Standard Checkout reaches this component through the backend's
 * cancel-checkout response, so this screen is also the immediate recovery state for
 * a dismissed modal rather than a stale PAYMENT_PENDING card.
 */
export function PaymentFailure({
  order,
  reason,
  onRecheck,
  onNewOrder,
  rechecking = false,
}: {
  order: Order;
  reason: string | null;
  /**
   * Asks the server what the status is now - in real mode by reconciling against
   * Razorpay, which is the only source that could contradict this card. It cannot
   * change a settled outcome and it never re-submits a payment.
   */
  onRecheck?: () => void;
  /** Sends a new-order request through the assistant when this card is in chat. */
  onNewOrder?: () => void;
  /** True while that request is in flight, so the button is not silently inert. */
  rechecking?: boolean;
}) {
  const presentation = ORDER_STATUS_PRESENTATION[order.status];
  const cancelled = order.status === 'CANCELLED';

  return (
    <div className="space-y-5">
      {/* Red block, stated plainly. A failure that looks like a warning invites the
          reader to wonder whether the money left anyway.

          Spec section 27: it settles in on the same curve and the same 260ms as the
          success block, and then holds absolutely still. No shake, no shudder, no
          attention loop - the card is bad news being read carefully, and motion that
          performs alarm would make a calm, accurate statement feel like a system
          malfunction. The icon does not pulse either: nothing here is in progress. */}
      <div className="rounded-card bg-danger-bg animate-scale-in overflow-hidden">
        <div className="bg-danger flex items-center gap-2 px-5 py-2.5 text-white">
          <AlertCircle className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase">
            {cancelled ? 'Payment cancelled' : 'Payment not verified'}
          </h3>
        </div>

        <div className="p-5">
          <p className="text-ink text-[17px] leading-tight font-extrabold tracking-[-0.02em]">
            Nothing was charged
          </p>
          <p className="text-muted mt-2 text-[13px] leading-relaxed">
            {formatMinor(order.amount, order.currency)} was not collected.{' '}
            {cancelled
              ? 'You closed the Razorpay checkout before this order was paid.'
              : 'Razorpay did not verify a payment for this order.'}{' '}
            {reason ?? presentation.meaning}
          </p>

          <div className="border-danger-line mt-4 border-t pt-4">
            <PaymentSteps order={order} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        {onNewOrder ? (
          <Button
            variant="primary"
            size="lg"
            onClick={onNewOrder}
            className="sm:flex-1"
            fullWidth
          >
            Ask AI assistant for a new order
          </Button>
        ) : (
          <Link to="/checkout" className="sm:flex-1">
            <Button variant="primary" size="lg" fullWidth>
              Ask AI assistant for a new order
            </Button>
          </Link>
        )}
        {onRecheck ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={onRecheck}
            loading={rechecking}
            icon={<RefreshCw className="size-4" aria-hidden />}
            className="sm:flex-1"
          >
            Check status again
          </Button>
        ) : null}
        <Link to="/products" className="sm:flex-1">
          <Button variant="secondary" size="lg" fullWidth>
            Browse other products
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone="neutral">No retry was made automatically</Badge>
      </div>
      <p className="text-faint text-[11.5px] leading-relaxed">
        A failed payment is never retried on your behalf. Retrying is a money action, so it needs
        your authorisation like any other. This is why the only button here re-reads the status
        rather than attempting a second payment. To buy this again, ask the AI assistant to create
        a new order.
      </p>
    </div>
  );
}
