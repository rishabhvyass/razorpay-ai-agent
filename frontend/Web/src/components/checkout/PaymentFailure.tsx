import { Link } from 'react-router-dom';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';
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
 * On the missing Cancel action: spec section 22 lists a "Cancel order" button, but
 * the backend exposes no cancel route - POST /api/orders, GET /api/orders/:id,
 * GET /api/orders/:id/activity and GET /api/users/:userId/orders are the only order
 * endpoints that exist. A button that cannot cancel anything, or that only forgets
 * the order locally while the row stays open in the database, would be a fabricated
 * capability. So the state names the gap instead of faking the control.
 */
export function PaymentFailure({
  order,
  reason,
  onRecheck,
}: {
  order: Order;
  reason: string | null;
  /**
   * Re-reads the order from the backend. It cannot change a settled outcome, and
   * it never re-submits a payment - it asks the server what the status is now.
   */
  onRecheck?: () => void;
}) {
  const presentation = ORDER_STATUS_PRESENTATION[order.status];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <span className="bg-danger-bg border-danger-line grid size-8 shrink-0 place-items-center rounded-full border">
          <AlertCircle className="text-danger size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold">Payment wasn&apos;t completed</p>
          <p className="text-muted text-[12px]">
            {formatMinor(order.amount, order.currency)} was not collected
          </p>
        </div>
      </div>

      <PaymentSteps order={order} />

      <div className="rounded-control border-line bg-surface-sunken border px-3 py-2.5">
        <p className="text-muted text-xs leading-relaxed">
          The payment was not verified by Razorpay. No successful payment was recorded.{' '}
          <strong className="text-ink font-semibold">Nothing was charged.</strong>{' '}
          {reason ?? presentation.meaning}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onRecheck ? (
          <Button
            variant="secondary"
            size="md"
            onClick={onRecheck}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            className="sm:flex-1"
          >
            Check status again
          </Button>
        ) : null}
        <Link to="/products" className="sm:flex-1">
          <Button variant="secondary" size="md" fullWidth>
            Browse other products
          </Button>
        </Link>
      </div>

      <div className="rounded-control border-line bg-surface-sunken flex items-start gap-2.5 border px-3 py-2.5">
        <Info className="text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p className="text-muted text-xs leading-relaxed">
          There is no <strong className="text-ink font-semibold">Cancel order</strong> action here
          because the backend exposes no endpoint to cancel one. This order stays as{' '}
          <code className="text-ink">{order.status}</code> in the database until a cancel route
          exists — no button is shown that would only pretend to change it.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone="neutral">No retry was made automatically</Badge>
      </div>
      <p className="text-faint text-[11px] leading-relaxed">
        A failed payment is never retried on your behalf. Retrying is a money action, so it needs
        your authorisation like any other — which is why the only button here re-reads the status
        rather than attempting a second payment. To buy this again, start a fresh authorisation.
      </p>
    </div>
  );
}
