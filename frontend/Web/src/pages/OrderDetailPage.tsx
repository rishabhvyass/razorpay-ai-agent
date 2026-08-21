import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ListTree, Package, Route } from 'lucide-react';
import { Page, Section } from '@/components/layout/PageContainer';
import { Card, CardHeader, ErrorState, SkeletonText } from '@/components/ui';
import { OrderStatusBadge, orderStatusMeaning } from '@/components/orders/OrderStatus';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { PaymentCard } from '@/components/checkout/PaymentCard';
import { AgentActivityTimeline } from '@/components/agent/AgentActivityTimeline';
import { ProductCard } from '@/components/products/ProductCard';
import { useOrder, useOrderActivity } from '@/hooks/useOrders';
import { useProduct } from '@/hooks/useProducts';

/**
 * One order, end to end.
 *
 * Everything on this page is read from the backend by id — the status, the amount,
 * the provider identifiers, and the audit trail of the actions that produced it.
 * Nothing is passed in through navigation state, so the page tells the truth even on
 * a hard refresh or a shared link.
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = useOrder(id);
  const activity = useOrderActivity(id);
  const product = useProduct(order.data?.product_id);

  if (order.isPending) {
    return (
      <Page title="Order" description="Loading">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <SkeletonText lines={5} />
          </Card>
          <Card>
            <SkeletonText lines={4} />
          </Card>
        </div>
      </Page>
    );
  }

  if (order.isError || !order.data) {
    return (
      <Page title="Order" description="Could not be loaded">
        <div className="space-y-4">
          <ErrorState error={order.error} onRetry={() => void order.refetch()} />
          <Link
            to="/orders"
            className="text-accent inline-flex items-center gap-1.5 text-[13px] font-medium"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to orders
          </Link>
        </div>
      </Page>
    );
  }

  const row = order.data;

  return (
    <Page title="Order" description={orderStatusMeaning(row.status)}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/orders"
            className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All orders
          </Link>
          <OrderStatusBadge status={row.status} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            <Section title="Lifecycle" description="Where this order actually is">
              <Card>
                <OrderTimeline order={row} />
              </Card>
            </Section>

            <Section
              title="Agent actions"
              description="Every tool call recorded against this order"
              action={
                <Link
                  to="/activity"
                  className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-[12px] transition-colors"
                >
                  <ListTree className="size-3.5" aria-hidden />
                  Full trail
                </Link>
              }
            >
              <Card>
                <AgentActivityTimeline
                  actions={activity.data?.actions ?? []}
                  isPending={activity.isPending}
                  error={activity.error}
                  onRetry={() => void activity.refetch()}
                  emptyTitle="No recorded actions"
                  emptyDescription="Nothing was written to the agent_actions table for this order. In the current build the conversation layer is simulated, so tool calls are shown live in the checkout panel but not persisted."
                />
              </Card>
            </Section>
          </div>

          <div className="min-w-0 space-y-5">
            <PaymentCard
              orderId={row.id}
              fallbackOrder={row}
              product={product.data ?? null}
              onRetry={() => void order.refetch()}
            />

            {product.data ? (
              <Section title="Product" description="Resolved from the order's product id">
                <ProductCard product={product.data} compact />
              </Section>
            ) : product.isError ? (
              <Card tone="info">
                <CardHeader
                  title="Product unavailable"
                  description="The product row this order points at could not be read. The order's own amount is unaffected — it is stored on the order."
                  icon={<Package className="size-4" aria-hidden />}
                />
              </Card>
            ) : null}

            <Card tone="info">
              <CardHeader
                title="How this page stays honest"
                description="The status, amount and payment identifiers are read from the backend on a poll. No value here is computed in the browser, and no state is assumed after an action — the page waits for the server to say it happened."
                icon={<Route className="size-4" aria-hidden />}
              />
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
