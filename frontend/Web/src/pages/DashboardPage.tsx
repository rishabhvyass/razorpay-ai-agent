import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CircleSlash,
  IndianRupee,
  MessagesSquare,
  Package,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { Page, Section } from '@/components/layout/PageContainer';
import { SlideUp } from '@/components/motion';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button, Card, CardHeader, EmptyState, ErrorState, RowSkeleton } from '@/components/ui';
import { useKnownOrders } from '@/hooks/useKnownOrders';
import { useProducts } from '@/hooks/useProducts';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { useConversationActivity } from '@/hooks/useActivity';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { formatMinor } from '@/lib/money';
import { stagger } from '@/lib/motion';

/**
 * Lightweight overview.
 *
 * Every figure here is computed from rows the backend returned, and every card names
 * its own source. Where a number cannot be derived from a real endpoint the card says
 * "Not available" rather than showing a zero - a dashboard is precisely where a made-up
 * figure looks most like a fact.
 *
 * Deliberately not built: revenue over time, retention, session counts. There is no
 * endpoint behind any of them, and the spec asks for a lightweight overview rather
 * than invented analytics.
 */
export function DashboardPage() {
  const isMobile = useIsMobile();
  const session = useCheckoutSession();
  const { orders, isPending, error, scope, refetch } = useKnownOrders();
  const catalogue = useProducts({ limit: 100 });
  const activity = useConversationActivity(session.conversationId);

  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of catalogue.data?.products ?? []) map.set(product.id, product.name);
    return map;
  }, [catalogue.data?.products]);

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.status === 'PAID');
    const failed = orders.filter(
      (order) => order.status === 'PAYMENT_FAILED' || order.status === 'PAYMENT_EXPIRED',
    );

    return {
      total: orders.length,
      paidCount: paid.length,
      failedCount: failed.length,
      // Only verified payments count as revenue. A PAYMENT_PENDING order is not
      // money the merchant has, and counting it would be the same lie as showing
      // "Payment successful" before the webhook lands.
      revenueMinor: paid.reduce((sum, order) => sum + order.amount, 0),
      currency: paid[0]?.currency ?? orders[0]?.currency ?? 'INR',
      conversion: orders.length === 0 ? null : Math.round((paid.length / orders.length) * 100),
    };
  }, [orders]);

  const recent = orders.slice(0, 5);
  const scopeNote =
    scope.kind === 'user'
      ? `Computed from GET /api/users/${scope.userId}/orders`
      : 'Computed from orders created in this browser';

  return (
    <Page
      title="Overview"
      description="Agentic commerce, end to end: conversation to verified payment"
      actions={
        <Link to="/checkout">
          <Button size="sm" variant="primary" icon={<MessagesSquare className="size-3.5" aria-hidden />}>
            <span className="hidden sm:inline">Start a checkout</span>
            <span className="sm:hidden">Checkout</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/*
          The product principle, stated once at the top. It is the thing being
          demonstrated, so it belongs on the landing surface rather than buried in
          a tooltip.
        */}
        <Card tone="accent">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-ink text-[13px] font-semibold">
                The agent recommends. You authorise. Razorpay verifies.
              </h2>
              <p className="text-muted mt-1 text-[13px] leading-relaxed">
                Nothing financial happens without an explicit confirmation, amounts are computed
                server-side from the catalogue, and an order is only reported as paid once a signed
                Razorpay webhook says so.
              </p>
              <ol className="text-faint mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
                {[
                  'Conversation',
                  'Recommendation',
                  'Explicit authorisation',
                  'Order',
                  'Payment',
                  'Verified webhook',
                  'Completed order',
                ].map((step, index, all) => (
                  <li key={step} className="flex items-center gap-2">
                    <span>{step}</span>
                    {index < all.length - 1 ? (
                      <ArrowRight className="size-3 shrink-0" aria-hidden />
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>

        <Section title="Metrics" description={scopeNote}>
          {/*
            Spec section 9: the row arrives in sequence rather than all at once, on the
            same 50ms step and the same 300ms ceiling as every other staggered list in
            the app.

            The entrance is on a wrapper for the reason recorded in ProductGrid: a
            finished animation with `animation-fill-mode: both` keeps its final
            transform applied and would permanently outrank the card's own
            `hover:scale-[1.01]`. `h-full` on both keeps the equal-height row the grid
            had before the wrapper existed.
          */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SlideUp index={0} className="h-full [&>div]:h-full">
              <MetricCard
                label="Orders"
                value={stats.total}
                source={scopeNote}
                icon={<ReceiptText className="size-4" aria-hidden />}
                isPending={isPending}
                error={error}
              />
            </SlideUp>
            <SlideUp index={1} className="h-full [&>div]:h-full">
              <MetricCard
                label="Revenue"
                value={formatMinor(stats.revenueMinor, stats.currency)}
                source="Sum of order.amount for verified (PAID) orders only. Pending orders are excluded because that money is not the merchant's yet."
                icon={<IndianRupee className="size-4" aria-hidden />}
                tone="success"
                isPending={isPending}
                error={error}
              />
            </SlideUp>
            <SlideUp index={2} className="h-full [&>div]:h-full">
              <MetricCard
                label="Successful payments"
                value={stats.paidCount}
                source="Orders at status PAID, set by the webhook handler after signature verification."
                icon={<BadgeCheck className="size-4" aria-hidden />}
                tone="success"
                isPending={isPending}
                error={error}
              />
            </SlideUp>
            <SlideUp index={3} className="h-full [&>div]:h-full">
              <MetricCard
                label="Failed payments"
                value={stats.failedCount}
                source="Orders at PAYMENT_FAILED or PAYMENT_EXPIRED. Nothing was charged in either case."
                icon={<CircleSlash className="size-4" aria-hidden />}
                tone={stats.failedCount > 0 ? 'danger' : 'default'}
                isPending={isPending}
                error={error}
              />
            </SlideUp>
            <SlideUp index={4} className="h-full [&>div]:h-full">
              <MetricCard
                label="Conversion rate"
                value={stats.conversion === null ? 'Not available' : `${stats.conversion}%`}
                source="Verified payments as a share of authorised orders. Conversations that never reached an order cannot be counted, so this is authorisation-to-paid."
                icon={<Activity className="size-4" aria-hidden />}
                tone="accent"
                isPending={isPending}
                error={error}
                unavailable={stats.conversion === null}
              />
            </SlideUp>
            <SlideUp index={5} className="h-full [&>div]:h-full">
              <MetricCard
                label="Agent actions"
                value={activity.data?.summary.total ?? 0}
                source={
                  session.conversationId
                    ? 'Audit trail for the current conversation. The backend has no endpoint that totals actions across all conversations.'
                    : 'Recorded per conversation. Start a checkout to populate the audit trail.'
                }
                icon={<Activity className="size-4" aria-hidden />}
                isPending={Boolean(session.conversationId) && activity.isPending}
                // Its own query, not the orders one. A failed activity read was
                // rendering as "0 agent actions" - the audit-trail total is the last
                // figure on this page that should be allowed to fail silently.
                error={activity.error}
                unavailable={!session.conversationId}
              />
            </SlideUp>
          </div>
        </Section>

        {/* Last in the sequence: the ceiling in CSS holds this at 300ms, so the two
            columns below the metrics arrive just after the final card rather than
            drifting further out the longer the page gets. */}
        <div
          className="animate-fade-up grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
          style={stagger(6)}
        >
          <Section
            title="Recent orders"
            description="The most recent five"
            action={
              orders.length > 0 ? (
                <Link
                  to="/orders"
                  className="text-muted hover:text-ink motion-fast inline-flex items-center gap-1 text-[12px] transition-colors"
                >
                  View all
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : undefined
            }
          >
            {error ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : isPending ? (
              <div className="rounded-card border-line bg-surface overflow-hidden border">
                {Array.from({ length: 3 }).map((_, index) => (
                  <RowSkeleton key={index} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="rounded-card border-line bg-surface border">
                <EmptyState
                  icon={<Package className="size-5" aria-hidden />}
                  title="No orders yet"
                  description="Ask the agent for something, authorise the purchase, and it will appear here."
                  action={
                    <Link to="/checkout">
                      <Button variant="primary" size="md">
                        Start a conversation
                      </Button>
                    </Link>
                  }
                />
              </div>
            ) : isMobile ? (
              <div className="space-y-2.5">
                {recent.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    productName={namesById.get(order.productId) ?? null}
                  />
                ))}
              </div>
            ) : (
              <OrderTable
                orders={recent}
                productName={(productId) => namesById.get(productId) ?? null}
              />
            )}
          </Section>

          <div className="space-y-5">
            <Section title="Funnel" description="Derived from order status, not modelled">
              <Card>
                <ConversionFunnel
                  orders={orders}
                  isPending={isPending}
                  error={error}
                  onRetry={refetch}
                />
              </Card>
            </Section>

            <Card>
              <CardHeader
                title="Catalogue"
                description={
                  catalogue.isError
                    ? 'The catalogue could not be read. Product surfaces will show an error state until the backend responds.'
                    : catalogue.isPending
                      ? 'Reading the catalogue…'
                      : `${catalogue.data?.meta.count ?? 0} products available to the agent.`
                }
                icon={<Package className="size-4" aria-hidden />}
              />
              <Link
                to="/products"
                className="text-accent mt-3 inline-flex items-center gap-1 text-[12px] font-medium"
              >
                Browse the catalogue
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
