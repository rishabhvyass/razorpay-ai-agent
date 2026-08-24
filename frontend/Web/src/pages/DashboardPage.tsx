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
      description="Agentic commerce, end to end — conversation to verified payment"
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Orders"
              value={stats.total}
              source={scopeNote}
              icon={<ReceiptText className="size-4" aria-hidden />}
              isPending={isPending}
            />
            <MetricCard
              label="Verified revenue"
              value={formatMinor(stats.revenueMinor, stats.currency)}
              source="Sum of order.amount for PAID orders only. Pending orders are excluded."
              icon={<IndianRupee className="size-4" aria-hidden />}
              tone="success"
              isPending={isPending}
            />
            <MetricCard
              label="Payments verified"
              value={stats.paidCount}
              source="Orders at status PAID, set by the webhook handler after signature verification."
              icon={<BadgeCheck className="size-4" aria-hidden />}
              tone="success"
              isPending={isPending}
            />
            <MetricCard
              label="Payments failed"
              value={stats.failedCount}
              source="Orders at PAYMENT_FAILED or PAYMENT_EXPIRED. Nothing was charged in either case."
              icon={<CircleSlash className="size-4" aria-hidden />}
              tone={stats.failedCount > 0 ? 'danger' : 'default'}
              isPending={isPending}
            />
            <MetricCard
              label="Authorisation → paid"
              value={stats.conversion === null ? '—' : `${stats.conversion}%`}
              source="Verified payments as a share of authorised orders."
              icon={<Activity className="size-4" aria-hidden />}
              tone="accent"
              isPending={isPending}
              unavailable={stats.conversion === null}
            />
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
              unavailable={!session.conversationId}
            />
          </div>
        </Section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Section
            title="Recent orders"
            description="The most recent five"
            action={
              orders.length > 0 ? (
                <Link
                  to="/orders"
                  className="text-muted hover:text-ink inline-flex items-center gap-1 text-[12px] transition-colors"
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
                    productName={namesById.get(order.product_id) ?? null}
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
                <ConversionFunnel orders={orders} />
              </Card>
            </Section>

            <Card>
              <CardHeader
                title="Catalogue"
                description={
                  catalogue.isError
                    ? 'The catalogue could not be read. Product surfaces will show an error state until the backend responds.'
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
