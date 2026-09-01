import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { config } from '@/lib/config';
import { qk } from '@/lib/queryClient';
import { refreshPaymentStatus, type PaymentView } from '@/services/paymentService';
import {
  Card,
  CardHeader,
  ErrorState,
  MockBadge,
  SkeletonText,
} from '@/components/ui';
import {
  ORDER_STATUS_PRESENTATION,
  OrderStatusBadge,
  orderStatusMeaning,
} from '@/components/orders/OrderStatus';
import { OrderIdentifiers, OrderTotals } from './OrderSummary';
import { PaymentPending } from './PaymentPending';
import { PaymentSuccess } from './PaymentSuccess';
import { PaymentFailure } from './PaymentFailure';
import { RazorpayCheckoutButton } from './RazorpayCheckoutButton';
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
  onRefresh,
}: {
  orderId: string;
  fallbackOrder?: Order;
  product?: Product | null;
  /**
   * Lets the parent re-read its own copy of the order alongside this card's poll.
   * The card owns `qk.orders.payment`; a page that also renders `qk.orders.detail`
   * has to refetch that itself, or the two disagree.
   */
  onRefresh?: () => void;
}) {
  const payment = usePaymentStatus(orderId);
  const queryClient = useQueryClient();

  const [reconcileError, setReconcileError] = useState<unknown>(null);
  const [reconciling, setReconciling] = useState(false);

  const order = payment.data?.order ?? fallbackOrder;
  const isMock = payment.data?.mock ?? false;

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
  /**
   * The one place a fresher payment view is written: the provider reconciliation
   * action. The payment card itself never initiates a payment.
   *
   * Note what it is not. It does not set a status, or merge a status in - the whole
   * object is the backend's answer and this card renders it as given. A verified
   * signature for an authorised-but-uncaptured payment, or for the wrong amount,
   * comes back as a view that still says PAYMENT_PENDING, and that is what appears.
   * Being verified and being paid are different claims, and only the server makes
   * the second one.
   *
   * Written into the poll's cache key rather than triggering a refetch, because it
   * IS the fresher read; fetching again would show the same row a beat later.
   */
  const applyView = (view: PaymentView) => {
    queryClient.setQueryData(qk.orders.payment(view.order.id), view);
    void queryClient.invalidateQueries({ queryKey: qk.orders.detail(view.order.id) });
    onRefresh?.();
  };

  const reconcile = async () => {
    if (!order || reconciling) return;
    setReconciling(true);
    setReconcileError(null);
    try {
      applyView(await refreshPaymentStatus(order.id));
    } catch (error) {
      setReconcileError(error);
    } finally {
      setReconciling(false);
    }
  };

  /**
   * A checkout session changes the order on the server to PAYMENT_PENDING. Re-read
   * both caches instead of constructing a local payment view from the session response.
   */
  const sessionOpened = () => {
    if (!order) return;
    void queryClient.invalidateQueries({ queryKey: qk.orders.payment(order.id) });
    void queryClient.invalidateQueries({ queryKey: qk.orders.detail(order.id) });
    onRefresh?.();
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

  // The backend permits one provider instrument per order. Existing payment-link
  // orders remain status-only; new orders get the single Standard Checkout action.
  const canCheckout =
    !config.useMock &&
    !isMock &&
    !terminalPaid &&
    !terminalFailed &&
    order.razorpayPaymentLinkId === null;

  const paymentDescription = terminalPaid || terminalFailed
    ? orderStatusMeaning(order.status)
    : order.status === 'PENDING_CONFIRMATION'
      ? 'No payment has been started.'
      : 'Payment status is read from the backend.';

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="border-line flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <CardHeader
          title="Payment"
          description={paymentDescription}
          icon={<CreditCard className="size-4" aria-hidden />}
        />
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
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

      <div className="space-y-5 p-5">
        <OrderTotals order={order} product={product ?? null} />

        <div className="border-line border-t pt-5">
          {terminalPaid ? (
            <PaymentSuccess
              order={order}
              paymentId={payment.data?.paymentId ?? order.razorpayPaymentId}
              isMock={isMock}
            />
          ) : terminalFailed ? (
            <>
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
              {reconcileError ? <ErrorState error={reconcileError} compact /> : null}
            </>
          ) : (
            <div className="space-y-5">
              {canCheckout ? (
                <RazorpayCheckoutButton
                  order={order}
                  product={product ?? null}
                  onSettled={applyView}
                  onSessionOpened={sessionOpened}
                />
              ) : null}
              <PaymentPending order={order} />
            </div>
          )}
        </div>

        <div className="border-line border-t pt-5">
          <details className="group">
            <summary className="text-muted hover:text-ink motion-fast cursor-pointer list-none text-[12px] font-semibold transition-colors">
              Order details
            </summary>
            <div className="pt-3">
              <OrderIdentifiers order={order} />
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}
