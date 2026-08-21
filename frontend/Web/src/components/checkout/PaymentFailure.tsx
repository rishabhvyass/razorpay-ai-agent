import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { formatMinor } from '@/lib/money';
import { ORDER_STATUS_PRESENTATION } from '@/components/orders/OrderStatus';
import type { Order } from '@/types';

/**
 * Payment did not go through.
 *
 * Spec section 24 / 33: a failure is a first-class state, not an error toast. It
 * says what happened, states clearly that nothing was charged, and offers the two
 * things a user might actually want - try again, or look at something else.
 *
 * It never blames the user and never suggests the payment "might" have gone through.
 * The order row says it did not.
 */
export function PaymentFailure({
  order,
  reason,
  onRetry,
}: {
  order: Order;
  reason: string | null;
  /** Starts a fresh authorisation. Never silently re-submits the previous one. */
  onRetry?: () => void;
}) {
  const presentation = ORDER_STATUS_PRESENTATION[order.status];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <span className="bg-danger-bg border-danger-line grid size-8 shrink-0 place-items-center rounded-full border">
          <AlertCircle className="text-danger size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-ink text-sm font-semibold">{presentation.label}</p>
          <p className="text-muted text-[12px]">
            {formatMinor(order.amount, order.currency)} was not collected
          </p>
        </div>
      </div>

      <div className="rounded-control border-line bg-surface-sunken border px-3 py-2.5">
        <p className="text-muted text-xs leading-relaxed">
          <strong className="text-ink font-semibold">Nothing was charged.</strong>{' '}
          {reason ?? presentation.meaning}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onRetry ? (
          <Button
            variant="primary"
            size="md"
            onClick={onRetry}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            className="sm:flex-1"
          >
            Try a new payment
          </Button>
        ) : null}
        <Link to="/products" className="sm:flex-1">
          <Button variant="secondary" size="md" fullWidth>
            Browse other products
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone="neutral">No retry was made automatically</Badge>
      </div>
      <p className="text-faint text-[11px] leading-relaxed">
        A failed payment is never retried on your behalf. Retrying is a money action, so it needs
        your authorisation like any other.
      </p>
    </div>
  );
}
