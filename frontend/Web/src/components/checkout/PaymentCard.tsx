import { useState } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { qk } from '@/lib/queryClient';
import { refreshPaymentStatus } from '@/services/paymentService';
import { Badge, Card, CardHeader, ErrorState, MockBadge, SkeletonText } from '@/components/ui';
import {
  ORDER_STATUS_PRESENTATION,
  OrderStatusBadge,
  orderStatusMeaning,
} from '@/components/orders/OrderStatus';
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
  onRefresh,
}: {
  orderId: string;
  fallbackOrder?: Order;
  product?: Product | null;
  fallbackPaymentUrl?: string | null;
  /**
   * Lets the parent re-read its own copy of the order alongside this card's poll.
   * The card owns `qk.orders.payment`; a page that also renders `qk.orders.detail`
   * has to refetch that itself, or the two disagree.
   */
  onRefresh?: () => void;
}) {
  const session = useCheckoutSession();
  const payment = usePaymentStatus(orderId);
  const queryClient = useQueryClient();

  const [simulateError, setSimulateError] = useState<unknown>(null);
  const [simulating, setSimulating] = useState(false);
  const [reconcileError, setReconcileError] = useState<unknown>(null);
  const [reconciling, setReconciling] = useState(false);

  const order = payment.data?.order ?? fallbackOrder;
  const paymentUrl = payment.data?.paymentUrl ?? fallbackPaymentUrl ?? null;
  // Whether a simulated payment actually exists for this order, which is not the
  // same question as whether the app is in mock mode. Gating the settle controls on
  // `config.useMock` offered them for orders that had no overlay at all, so pressing
  // one asked the app to settle a payment nothing had initiated.
  const isMock = payment.data?.mock ?? false;

  const simulate = async (outcome: 'success' | 'failure') => {
    if (!order || simulating) return;
    setSimulating(true);
    setSimulateError(null);
    try {
      await session.simulate(order.id, outcome);
    } catch (error) {
      setSimulateError(error);
    } finally {
      setSimulating(false);
    }
  };

  /**
   * Ask the backend to read this payment's state from Razorpay and apply it.
   *
   * Necessary rather than convenient: a webhook cannot reach a machine with no public
   * URL, so in local development this is the only way a genuinely paid order becomes
   * PAID. In a deployment it is the reconciliation path for a delivery that never
   * arrived, because an order stuck at PAYMENT_PENDING is not evidence nobody paid.
   *
   * It is not a way to make a payment succeed. The request body carries nothing - just
   * an order id in the URL - and every value it writes comes back from the provider
   * inside the handler. Pressing it repeatedly produces exactly what an honest client
   * gets: whatever Razorpay says.
   *
   * The response is written straight into the poll's cache key rather than triggering
   * another fetch, because it IS the fresher read; refetching afterwards would show
   * the same row a beat later.
   */
  const reconcile = async () => {
    if (!order || reconciling) return;
    setReconciling(true);
    setReconcileError(null);
    try {
      const view = await refreshPaymentStatus(order.id);
      queryClient.setQueryData(qk.orders.payment(order.id), view);
      void queryClient.invalidateQueries({ queryKey: qk.orders.detail(order.id) });
      onRefresh?.();
    } catch (error) {
      setReconcileError(error);
    } finally {
      setReconciling(false);
    }
  };

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

      {/* This status changes on a poll, with no user action to anchor the change, so
          it is announced. Without a live region the one user who most needs to know a
          payment settled has no way to find out short of re-reading the page. */}
      <p className="sr-only" role="status" aria-live="polite">
        Payment status: {ORDER_STATUS_PRESENTATION[order.status].label}.{' '}
        {orderStatusMeaning(order.status)}
        {isMock ? ' This state came from the labelled simulation, not a verified payment.' : ''}
      </p>

      <div className="space-y-4 p-4">
        <OrderTotals order={order} product={product ?? null} />

        <div className="border-line border-t pt-4">
          {terminalPaid ? (
            <PaymentSuccess
              order={order}
              paymentId={payment.data?.paymentId ?? order.razorpayPaymentId}
              isMock={isMock}
            />
          ) : terminalFailed ? (
            <PaymentFailure
              order={order}
              reason={payment.data?.failureReason ?? null}
              // The card's own poll is the query that feeds it, so a re-check has to
              // refetch that. The parent-supplied refresh is additional, not instead:
              // OrderDetailPage previously passed only its `qk.orders.detail` refetch,
              // which is a different key from the `qk.orders.payment` rendered here, so
              // pressing the button changed nothing visible on this card.
              // In real mode a re-check asks Razorpay, not the database: the point of
              // the button is the provider's verdict, and re-reading a row this app
              // already polls every three seconds would tell the user nothing new. In
              // mock mode there is no provider, so it refetches.
              onRecheck={() => {
                if (isMock) {
                  void payment.refetch();
                  onRefresh?.();
                  return;
                }
                void reconcile();
              }}
              rechecking={reconciling}
            />
          ) : order.status === 'PENDING_CONFIRMATION' && !isMock ? (
            // The order exists and nothing has been initiated against it. That is all
            // that can honestly be shown: no link is fabricated, and no settle control
            // is offered for a payment that was never started.
            <div className="space-y-3">
              <Badge tone="neutral" icon={<Info className="size-3" aria-hidden />}>
                No payment link issued
              </Badge>
              <p className="text-muted text-[13px] leading-relaxed">
                The order is recorded in the database at{' '}
                <code className="text-ink">PENDING_CONFIRMATION</code>.{' '}
                {config.useMock
                  ? 'No simulated payment link exists for it in this browser — the local overlay was reset, or the order was created before it. Nothing was charged, and there is no payment here to settle.'
                  : 'No Razorpay payment link has been issued against it, so nothing has been charged. A link is only created when a purchase is explicitly authorised, and the backend refuses to issue one without that approval.'}
              </p>
            </div>
          ) : (
            <PaymentPending
              order={order}
              paymentUrl={paymentUrl}
              isMock={isMock}
              simulateError={simulateError}
              simulating={simulating}
              {...(isMock ? { onSimulate: (outcome) => void simulate(outcome) } : {})}
              {...(isMock || config.useMock
                ? {}
                : {
                    onReconcile: () => void reconcile(),
                    reconciling,
                    reconcileError,
                  })}
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
