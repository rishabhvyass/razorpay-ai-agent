import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info, ReceiptText } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button, EmptyState, ErrorState, RowSkeleton } from '@/components/ui';
import { useKnownOrders } from '@/hooks/useKnownOrders';
import { useProducts } from '@/hooks/useProducts';
import { useIsMobile } from '@/hooks/useMediaQuery';

export function OrdersPage() {
  const isMobile = useIsMobile();
  const { orders, isPending, error, scope, missingCount, refetch } = useKnownOrders();

  // One catalogue read resolves every product id in the list. Cheaper and less
  // chatty than a request per row, and it is the same real endpoint either way.
  const catalogue = useProducts({ limit: 100 });
  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of catalogue.data?.products ?? []) map.set(product.id, product.name);
    return map;
  }, [catalogue.data?.products]);

  const productName = (productId: string) => namesById.get(productId) ?? null;

  return (
    <Page
      title="Orders"
      description={
        scope.kind === 'user'
          ? 'Order history for the configured user id'
          : 'Orders created from this browser'
      }
    >
      <div className="space-y-4">
        {/*
          The scope note is not boilerplate. The backend has no auth and no
          "list all orders" route, so this page genuinely cannot show every order -
          and a history page that silently shows a subset is misleading.
        */}
        <div className="rounded-card border-info-line bg-info-bg flex items-start gap-2.5 border px-3.5 py-3">
          <Info className="text-info mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-muted text-[12px] leading-relaxed">
            {scope.kind === 'user' ? (
              <>
                Showing <code className="text-ink">GET /api/users/{scope.userId}/orders</code> plus
                any orders created in this browser. The backend has no endpoint that lists all
                orders, so this is the full extent of what can be shown.
              </>
            ) : (
              <>
                The backend exposes no route that lists all orders and has no auth layer, so this
                page shows the orders created from this browser, each fetched by id. Set a user id in{' '}
                <Link to="/settings" className="text-accent font-medium">
                  Settings
                </Link>{' '}
                to load a real per-user history.
              </>
            )}
          </p>
        </div>

        {missingCount > 0 ? (
          <p className="text-faint text-[12px]">
            {missingCount} recorded {missingCount === 1 ? 'order' : 'orders'} could not be loaded —
            usually because the database was reset since it was created.
          </p>
        ) : null}

        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <div className="rounded-card border-line bg-surface overflow-hidden border">
            {Array.from({ length: 4 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-card border-line bg-surface border">
            <EmptyState
              icon={<ReceiptText className="size-5" aria-hidden />}
              title="No orders yet"
              description="Orders appear here after you authorise a purchase in the conversation. Nothing is created until you explicitly confirm an amount."
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
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} productName={productName(order.productId)} />
            ))}
          </div>
        ) : (
          <OrderTable orders={orders} productName={productName} />
        )}
      </div>
    </Page>
  );
}
