import { CreditCard, Info } from 'lucide-react';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { Badge, Card, CardHeader, ErrorState, MockBadge, SkeletonText } from '@/components/ui';
import { OrderStatusBadge, orderStatusMeaning } from '@/components/orders/OrderStatus';
import { OrderIdentifiers, OrderTotals } from './OrderSummary';
import { PaymentPending } from './PaymentPending';
import { PaymentSuccess } from './PaymentSuccess';
import { PaymentFailure } from './PaymentFailure';
import type { Order, Product } from '@/types';

/**
 * The payment surface for one order.
 *
 * It renders whatever the backend currently says, and nothing else. The order comes
 * from `GET /api/orders/:id` on a poll (usePaymentStatus), so the status shown is
 * always the server's - there is no local "optimistically paid" state to get out of
 * sync with reality.
 *
 * `fallbackOrder` is the row returned when the order was created, used only until
 * the first poll resolves so the card is not blank for a moment. It is replaced by
 * the polled value as soon as one exists.
 */
export function PaymentCard({
  orderId,
  fallbackOrder,
  product,
  fallbackPaymentUrl,
  onRetry,
}: {
  orderId: string;
  fallbackOrder?: Order;
  product?: Product | null;
  fallbackPaymentUrl?: string | null;
  onRetry?: () => void;
}) {
  const session = useCheckoutSession();
  const payment = usePaymentStatus(orderId);

  const order = payment.data?.order ?? fallbackOrder;
  const paymentUrl = payment.data?.paymentUrl ?? fallbackPaymentUrl ?? null;
  const isMock = payment.data?.mock ?? false;

  if (payment.isError && !order) {
    return (
      <Card padded={false}>
        <div className="p-4">
          <ErrorState error={payment.error} onRetry={() => void payment.refetch()} compact />
        </div>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <SkeletonText lines={4} />
      </Card>
    );
  }

  const terminalPaid = order.status === 'PAID';
  const terminalFailed =
    order.status === 'PAYMENT_FAILED' ||
    order.status === 'PAYMENT_EXPIRED' ||
    order.status === 'CANCELLED';

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="border-line flex items-start justify-between gap-3 border-b px-4 py-3">
        <CardHeader
          title="Payment"
          description={orderStatusMeaning(order.status)}
          icon={<CreditCard className="size-4" aria-hidden />}
        />
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <OrderStatusBadge status={order.status} />
          {isMock ? <MockBadge /> : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <OrderTotals order={order} product={product ?? null} />

        <div className="border-line border-t pt-4">
          {terminalPaid ? (
            <PaymentSuccess
              order={order}
              paymentId={payment.data?.paymentId ?? order.razorpay_payment_id}
              isMock={isMock}
            />
          ) : terminalFailed ? (
            <PaymentFailure
              order={order}
              reason={payment.data?.failureReason ?? null}
              {...(onRetry ? { onRetry } : {})}
            />
          ) : order.status === 'PENDING_CONFIRMATION' && !config.useMock ? (
            // Real mode with no payments layer: the order exists, and that is all
            // that can honestly be shown. No link is fabricated.
            <div className="space-y-3">
              <Badge tone="neutral" icon={<Info className="size-3" aria-hidden />}>
                Payments layer not implemented
              </Badge>
              <p className="text-muted text-[13px] leading-relaxed">
                The order is recorded in the database at{' '}
                <code className="text-ink">PENDING_CONFIRMATION</code>. Creating the Razorpay order
                and issuing a payment link happen server-side, and those endpoints have not shipped
                yet — so no link was created and nothing was charged.
              </p>
            </div>
          ) : (
            <PaymentPending
              order={order}
              paymentUrl={paymentUrl}
              isMock={config.useMock}
              {...(config.useMock
                ? { onSimulate: (outcome) => void session.simulate(order.id, outcome) }
                : {})}
            />
          )}
        </div>

        <div className="border-line border-t pt-4">
          <OrderIdentifiers order={order} />
        </div>
      </div>
    </Card>
  );
}
