import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatDateTime, truncateId } from '@/lib/format';
import { formatMinor } from '@/lib/money';
import { OrderStatusBadge } from './OrderStatus';
import type { Order } from '@/types';

/** The mobile rendering of an order row. Same data, single column. */
export function OrderCard({
  order,
  productName,
}: {
  order: Order;
  productName: string | null;
}) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="rounded-card border-line bg-surface hover:border-line-strong block border p-3.5 transition-all hover:shadow-subtle"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink truncate text-[13px] font-semibold">
            {productName ?? truncateId(order.product_id, 10, 4)}
          </p>
          <p className="text-faint nums mt-0.5 font-mono text-[11px]" title={order.id}>
            {truncateId(order.id, 10, 4)}
          </p>
        </div>
        <ChevronRight className="text-faint mt-0.5 size-4 shrink-0" aria-hidden />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-ink nums text-sm font-semibold">
          {formatMinor(order.amount, order.currency)}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="text-faint nums mt-2 text-[11px]">{formatDateTime(order.created_at)}</p>
    </Link>
  );
}
