import { useState } from 'react';
import { CreditCard, Info, Link2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { describePurchase } from '@/lib/format';
import { qk } from '@/lib/queryClient';
import {
  refreshPaymentStatus,
  requestPaymentLink,
  type PaymentView,
} from '@/services/paymentService';
import {
  Badge,
  Button,
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
  const [linkError, setLinkError] = useState<unknown>(null);
  const [linkRequesting, setLinkRequesting] = useState(false);

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
  /**
   * The one place a fresher payment view is written, shared by every path that
   * produces one: the reconcile button, the payment-link request, and the verified
   * response from the checkout modal.
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
   * A Razorpay checkout session was created, so the order row moved to
   * PAYMENT_PENDING and gained a `razorpayOrderId` server-side. Refetch rather than
   * write: the session response is not a payment view, and inventing one here would
   * mean this card displaying a status no endpoint returned.
   */
  const sessionOpened = () => {
    if (!order) return;
    void queryClient.invalidateQueries({ queryKey: qk.orders.payment(order.id) });
    void queryClient.invalidateQueries({ queryKey: qk.orders.detail(order.id) });
    onRefresh?.();
  };

  /**
   * The other payment method: ask the backend to issue a Razorpay Payment Link.
   *
   * Offered beside the checkout modal rather than instead of it, because the two are
   * genuinely different products - a hosted page the customer can return to or
   * forward, versus an in-page modal - and a customer whose browser blocks
   * Razorpay's script still needs a way to pay.
   *
   * It is its own MONEY_ACTION with its own click, its own approval reason and its own
   * audit row. Nothing is issued because an order exists; it is issued because
   * someone pressed this.
   */
  const requestLink = async () => {
    if (!order || linkRequesting) return;
    setLinkRequesting(true);
    setLinkError(null);
    try {
      applyView(
        await requestPaymentLink(
          order.id,
          `Customer chose to pay ${order.amountFormatted} for ${describePurchase(order, product)} by Razorpay payment link.`,
        ),
      );
    } catch (error) {
      setLinkError(error);
    } finally {
      setLinkRequesting(false);
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

  /**
   * The preconditions both payment instruments share: a real payment provider, and an
   * order that has not already settled either way.
   *
   * Mock mode is excluded outright. Standard Checkout means Razorpay's own modal
   * collecting real card details against a real key, and there is no honest local
   * stand-in for it - a simulated card form is exactly the fabricated payment screen
   * this product must not contain.
   */
  const payable = !config.useMock && !isMock && !terminalPaid && !terminalFailed;

  /**
   * Which instruments are still available, mirroring the backend's own rule: an order
   * binds exactly ONE payment instrument, first come wins. These conditions exist so
   * the interface never renders a button whose only possible answer is 409.
   *
   * The two are not symmetrical, because the backend's two guards are not:
   *
   *   checkout  refused once a payment LINK id exists. A Razorpay order id is fine -
   *             `POST /api/create-order` returns the existing session rather than
   *             creating a second one, so pressing pay again after a dismissed modal
   *             reopens the same payment instead of opening a way to be charged twice.
   *   link      refused once EITHER id exists. There is nothing to re-issue and no
   *             second instrument to add.
   */
  const canCheckout = payable && order.razorpayPaymentLinkId === null;
  const canRequestLink =
    payable && order.razorpayPaymentLinkId === null && order.razorpayOrderId === null;

  const checkoutButton = canCheckout ? (
    <RazorpayCheckoutButton
      order={order}
      product={product ?? null}
      onSettled={applyView}
      onSessionOpened={sessionOpened}
    />
  ) : null;

  /**
   * The secondary instrument, offered under the modal.
   *
   * Deliberately secondary and deliberately present. Secondary because paying in-page
   * is fewer steps and does not lose the customer to another tab; present because
   * Razorpay's script is a third-party CDN request that an extension or a corporate
   * proxy can block, and "the pay button did nothing" must not be the end of the
   * story. Each is its own approved, audited MONEY_ACTION.
   */
  const linkFallback = canRequestLink ? (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void requestLink()}
        loading={linkRequesting}
        icon={<Link2 className="size-3.5" aria-hidden />}
        fullWidth
      >
        Get a Razorpay payment link instead
      </Button>
      <p className="text-faint text-[11px] leading-relaxed">
        Opens a Razorpay-hosted page in a new tab rather than a modal here. Useful if the checkout
        script is blocked in this browser, or to pay later from a different device. Razorpay issues
        the link server-side; this app never builds a payment URL.
      </p>
      {linkError ? <ErrorState error={linkError} compact /> : null}
    </div>
  ) : null;

  /**
   * Whichever instruments this order can still use, as one node.
   *
   * One node rather than two rendered separately, because the same pair belongs in two
   * places - the PENDING_CONFIRMATION branch below, and inside `PaymentPending` for an
   * order that reached ORDER_CREATED or PAYMENT_PENDING. Building it once is what stops
   * those two surfaces from offering different options for the same order, which is how
   * an order stuck at ORDER_CREATED after a failed provider call ended up with a retry
   * button and no way to fall back to a link.
   */
  const instrumentChoice =
    checkoutButton === null && linkFallback === null ? null : (
      <div className="space-y-3">
        {checkoutButton}
        {linkFallback}
      </div>
    );

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
            // The order exists and no payment instrument is bound to it. In real mode
            // that is not a dead end - it is the point at which the customer chooses
            // how to pay, and each choice is its own explicitly-approved MONEY_ACTION.
            // In mock mode there is no provider to choose, so it says so.
            <div className="space-y-3">
              <Badge tone="neutral" icon={<Info className="size-3" aria-hidden />}>
                {instrumentChoice ? 'Payment not started' : 'No payment link issued'}
              </Badge>
              <p className="text-muted text-[13px] leading-relaxed">
                The order is recorded in the database at{' '}
                <code className="text-ink">PENDING_CONFIRMATION</code>.{' '}
                {config.useMock
                  ? 'No simulated payment link exists for it in this browser — the local overlay was reset, or the order was created before it. Nothing was charged, and there is no payment here to settle.'
                  : instrumentChoice
                    ? 'Nothing has been charged and no payment has been started. Razorpay is contacted only when one of the options below is pressed, and the backend records that approval before it does.'
                    : 'No Razorpay payment instrument has been issued against it, so nothing has been charged. One is only created when a purchase is explicitly authorised, and the backend refuses to issue one without that approval.'}
              </p>
              {instrumentChoice}
            </div>
          ) : (
            <PaymentPending
              order={order}
              paymentUrl={paymentUrl}
              isMock={isMock}
              // Only when this order can actually use one. `PaymentPending` prefers a
              // provider-issued link when one exists, so passing this alongside would
              // offer two instruments for an order the backend allows exactly one of.
              {...(instrumentChoice === null ? {} : { checkout: instrumentChoice })}
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
