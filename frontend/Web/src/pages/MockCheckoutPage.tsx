import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CircleSlash,
  FlaskConical,
  Info,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { Badge, Button, Card, ErrorState, MockNotice, SkeletonText } from '@/components/ui';
import { OrderStatusBadge, orderStatusMeaning } from '@/components/orders/OrderStatus';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { truncateId } from '@/lib/format';
import { formatMinor } from '@/lib/money';
import { isTerminalStatus } from '@/services/orderService';

/**
 * The simulated checkout.
 *
 * Reachable only while VITE_USE_MOCK is on. The backend's payments layer is built -
 * real Payment Links, a signature-verified `POST /api/webhooks/razorpay`, and a
 * reconcile endpoint - so with the mock adapter off an order reaches PAID because
 * Razorpay said so, and this page has no part in it. It stays because the flow has to
 * be walkable with no keys configured, and because the Razorpay challenge asks for both
 * a successful payment and a gracefully handled failure, on demand rather than by
 * chance.
 *
 * Two things it deliberately is not:
 *
 *   - It is not a Razorpay page and does not pretend to be one. No provider branding,
 *     no card form, no constructed provider URL. Impersonating a payment surface to
 *     make a demo look finished is the exact opposite of what this app is arguing for.
 *   - It is not a payment. Nothing is charged, no card is collected, and the outcome
 *     is whichever button is pressed.
 *
 * The amount shown is read from the order row through the backend, not passed in
 * through the link, so this page cannot display a figure the server did not compute.
 */
export function MockCheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const session = useCheckoutSession();
  const payment = usePaymentStatus(orderId);

  const [settling, setSettling] = useState<'success' | 'failure' | null>(null);
  const [settleError, setSettleError] = useState<unknown>(null);
  // Set only when a press on THIS page produced the outcome. The settled panel also
  // renders on a plain visit to an already-settled order, and yanking focus then
  // would be moving the keyboard for a change the user did not just make.
  const [settledHere, setSettledHere] = useState(false);
  const outcomeRef = useRef<HTMLDivElement | null>(null);

  const order = payment.data?.order;
  const settled = order ? isTerminalStatus(order.status) : false;

  // The buttons that had focus are unmounted the moment the outcome lands, which
  // dropped focus to the document body - the one user who most needs to know what
  // just happened was left with no position on the page. Focus moves to the panel
  // that replaced them; `role="status"` on it announces the change either way.
  useEffect(() => {
    if (settled && settledHere) outcomeRef.current?.focus();
  }, [settled, settledHere]);

  const settle = async (outcome: 'success' | 'failure') => {
    if (!orderId || settling) return;
    setSettling(outcome);
    setSettleError(null);
    try {
      await session.simulate(orderId, outcome);
      setSettledHere(true);
    } catch (error) {
      setSettleError(error);
    } finally {
      setSettling(null);
    }
  };

  // Real mode: this route has no reason to exist, and saying so is better than
  // rendering controls that would throw the moment they were pressed.
  if (!config.useMock) {
    return (
      <Page title="Simulated checkout" description="Not available in this mode">
        <div className="max-w-xl">
          <Card>
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0 space-y-2">
                <h2 className="text-ink text-[13px] font-semibold">
                  The simulated checkout is disabled
                </h2>
                <p className="text-muted text-[13px] leading-relaxed">
                  This page only stands in for the payment provider while{' '}
                  <code className="text-ink">VITE_USE_MOCK</code> is on. With the mock adapter off
                  there is nothing honest for it to do: the real payments layer runs instead, and
                  only a signature-verified Razorpay webhook can change an order's status.
                </p>
                <Link to="/orders" className="text-accent inline-block text-[13px] font-medium">
                  Back to orders
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </Page>
    );
  }

  if (!orderId) {
    return (
      <Page title="Simulated checkout">
        <Card>
          <p className="text-muted text-[13px]">No order id in the URL.</p>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Simulated checkout"
      description="Stands in for the payment provider — nothing is charged"
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate(`/orders/${orderId}`)}
          icon={<ArrowLeft className="size-3.5" aria-hidden />}
        >
          Order
        </Button>
      }
    >
      <div className="mx-auto max-w-xl space-y-4">
        <MockNotice>
          This is not Razorpay and not a payment. The mock adapter is on, so no Razorpay order and
          no payment link were ever created, and there is no provider here to confirm anything.
          Whichever button you press below writes that outcome to a local, clearly-labelled
          overlay: no card is collected and no money moves.
        </MockNotice>

        <Card padded={false} className="overflow-hidden">
          <div className="border-line bg-surface-sunken flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="bg-warning-bg text-warning grid size-7 shrink-0 place-items-center rounded-lg">
                <FlaskConical className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-ink text-[13px] leading-tight font-semibold">
                  Simulated payment provider
                </p>
                <p className="text-faint text-[11px] leading-tight">Local only. Not a gateway.</p>
              </div>
            </div>
            {order ? <OrderStatusBadge status={order.status} /> : null}
          </div>

          <div className="space-y-4 p-4">
            {payment.isError && !order ? (
              <ErrorState error={payment.error} onRetry={() => void payment.refetch()} compact />
            ) : !order ? (
              <SkeletonText lines={4} />
            ) : (
              <>
                {/* The amount is the backend's number, re-read on every poll. */}
                <div className="rounded-card border-line bg-surface-sunken border px-4 py-3.5">
                  <p className="text-faint text-[11px] font-semibold tracking-wide uppercase">
                    Amount due
                  </p>
                  <p className="text-ink nums mt-0.5 text-2xl font-semibold tracking-tight">
                    {formatMinor(order.amount, order.currency)}
                  </p>
                  <p className="text-faint mt-1.5 text-[11px] leading-relaxed">
                    Read from <code>GET /api/orders/{truncateId(order.id, 8, 4)}</code>. Computed
                    server-side from the catalogue when the order was created — this page cannot
                    change it, and never sends an amount anywhere.
                  </p>
                </div>

                <dl className="divide-line divide-y text-[13px]">
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-muted">Quantity</dt>
                    <dd className="text-ink nums">{order.quantity}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-muted">Order</dt>
                    <dd className="text-ink" title={order.id}>
                      <code>{truncateId(order.id, 14, 6)}</code>
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-muted">Current status</dt>
                    <dd className="text-ink text-right">{orderStatusMeaning(order.status)}</dd>
                  </div>
                </dl>

                {/* The error is a banner ABOVE the controls, not a replacement for
                    them. Rendering it instead of the buttons removed the only way to
                    try again, so a failed settle became a dead end on a page whose
                    entire purpose is reaching an outcome. */}
                {settleError ? (
                  <ErrorState error={settleError} compact />
                ) : null}

                {settled ? (
                  <div
                    ref={outcomeRef}
                    tabIndex={-1}
                    role="status"
                    aria-live="polite"
                    className={
                      order.status === 'PAID'
                        ? 'rounded-control border-success-line bg-success-bg flex items-start gap-2.5 border px-3.5 py-3'
                        : 'rounded-control border-danger-line bg-danger-bg flex items-start gap-2.5 border px-3.5 py-3'
                    }
                  >
                    {order.status === 'PAID' ? (
                      <BadgeCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    ) : (
                      <CircleSlash className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 space-y-2">
                      <p className="text-ink text-[13px] font-medium">
                        {order.status === 'PAID'
                          ? 'Settled as verified — simulated'
                          : 'Settled as failed — simulated'}
                      </p>
                      <p className="text-muted text-[12px] leading-relaxed">
                        {order.status === 'PAID'
                          ? 'In a real deployment this state would only appear after Razorpay sent a webhook whose signature the backend verified. Here it appeared because you pressed a button, which is why it stays labelled as simulated everywhere it shows.'
                          : 'The failure is handled the same way a real one would be: the order records the outcome, nothing was charged, and the customer can retry. No successful payment exists.'}
                      </p>
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-accent inline-block text-[12px] font-medium"
                      >
                        See the order and its audit trail
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted text-[13px] leading-relaxed">
                      Choose the outcome. Both paths are here on purpose — a payment flow that can
                      only be demonstrated succeeding has not been demonstrated.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="success"
                        size="lg"
                        className="flex-1"
                        loading={settling === 'success'}
                        disabled={settling !== null}
                        onClick={() => void settle('success')}
                        icon={<Lock className="size-4" aria-hidden />}
                      >
                        Pay {formatMinor(order.amount, order.currency)}
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                        loading={settling === 'failure'}
                        disabled={settling !== null}
                        onClick={() => void settle('failure')}
                      >
                        Fail the payment
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <p className="text-faint flex items-start gap-2 text-[11px] leading-relaxed">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Turn the mock adapter off and this route is unreachable. The order page observes the same
          transition through the same poll against{' '}
          <code>GET /api/orders/:id</code> — written there by the verified webhook instead of by a
          button here.
        </p>

        <div className="flex items-center gap-2">
          <Badge tone="razorpay">Razorpay Test Mode</Badge>
          <span className="text-faint text-[11px]">No live payments. No real money moves.</span>
        </div>
      </div>
    </Page>
  );
}
