import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { formatMinor } from '@/lib/money';
import { truncateId } from '@/lib/format';
import { OrderStatusBadge } from './OrderStatus';
import type { Order } from '@/types';

/**
 * Order history table (>=768px). Below that the same rows render as OrderCard,
 * because a five-column table on a phone either scrolls sideways or truncates the
 * amount - and the amount is the column that matters.
 */
export function OrderTable({
  orders,
  productName,
}: {
  orders: Order[];
  /** Resolves a product id to a name using the real catalogue, or null if unknown. */
  productName: (productId: string) => string | null;
}) {
  return (
    <div className="rounded-card border-line bg-surface overflow-hidden border">
      <table className="w-full text-left">
        <caption className="sr-only">Order history</caption>
        <thead>
          <tr className="border-line bg-surface-subtle border-b">
            {['Order', 'Product', 'Amount', 'Status', 'Created', ''].map((heading, index) => (
              <th
                key={heading || index}
                scope="col"
                className="text-faint px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-line hover:bg-surface-subtle border-b transition-colors last:border-b-0"
            >
              <td className="px-4 py-3">
                <span className="text-muted nums font-mono text-[12px]" title={order.id}>
                  {truncateId(order.id, 8, 4)}
                </span>
              </td>
              <td className="max-w-[16rem] px-4 py-3">
                <span className="text-ink block truncate text-[13px] font-medium">
                  {productName(order.productId) ?? (
                    <span className="text-faint font-mono text-[12px]">
                      {truncateId(order.productId, 8, 4)}
                    </span>
                  )}
                </span>
                {order.quantity > 1 ? (
                  <span className="text-faint text-[11px]">Qty {order.quantity}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {/* The backend's amount. Never recomputed here from price x quantity. */}
                <span className="text-ink nums text-[13px] font-semibold">
                  {formatMinor(order.amount, order.currency)}
                </span>
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3">
                <span className="text-muted nums text-[12px]">
                  {formatDateTime(order.createdAt)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/orders/${order.id}`}
                  className="text-accent hover:text-accent-700 inline-flex items-center gap-0.5 text-[12px] font-medium"
                >
                  View
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
