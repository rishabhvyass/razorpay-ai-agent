import { Copy } from 'lucide-react';
import { useState } from 'react';
import { formatMinor, formatMinorSpoken } from '@/lib/money';
import { formatDateTime, truncateId } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Order, Product } from '@/types';

function CopyableId({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted text-[12px]">{label}</dt>
        <dd className="text-faint text-[12px]">Not issued</dd>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted text-[12px]">{label}</dt>
      <dd className="min-w-0">
        <button
          type="button"
          title={value}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              },
              () => setCopied(false),
            );
          }}
          className="text-muted hover:text-ink nums group inline-flex items-center gap-1.5 font-mono text-[12px] transition-colors"
        >
          {truncateId(value, 14, 4)}
          <Copy
            className={cn(
              'size-3 shrink-0 transition-colors',
              copied ? 'text-success' : 'text-faint group-hover:text-muted',
            )}
            aria-hidden
          />
          <span className="sr-only">{copied ? 'Copied' : `Copy ${label}`}</span>
        </button>
      </dd>
    </div>
  );
}

/**
 * The order's own numbers, as returned by the backend.
 *
 * `order.amount` is displayed directly. It is deliberately NOT recomputed as
 * `product.price * quantity` - if the two ever differ, the server's figure is the
 * one that is real, and a UI that recomputes would hide exactly the discrepancy a
 * reviewer needs to see.
 */
export function OrderTotals({ order, product }: { order: Order; product?: Product | null }) {
  return (
    <div className="space-y-3">
      {product ? (
        <div className="min-w-0">
          <p className="text-ink truncate text-[13px] font-semibold">{product.name}</p>
          <p className="text-muted mt-0.5 text-[12px]">
            {formatMinor(product.price, product.currency)} × {order.quantity}
          </p>
        </div>
      ) : null}

      <div className="rounded-control border-line bg-surface-subtle flex items-baseline justify-between gap-3 border px-3.5 py-3">
        <span className="text-muted text-[12px] font-medium">Order total</span>
        <span
          className="text-ink nums text-base leading-none font-semibold"
          aria-label={formatMinorSpoken(order.amount, order.currency)}
        >
          {formatMinor(order.amount, order.currency)}
        </span>
      </div>
    </div>
  );
}

/** The provider and database identifiers, for tracing an order end to end. */
export function OrderIdentifiers({ order }: { order: Order }) {
  return (
    <dl className="space-y-2">
      <CopyableId label="Order ID" value={order.id} />
      <CopyableId label="Razorpay order" value={order.razorpayOrderId} />
      <CopyableId label="Payment link" value={order.razorpayPaymentLinkId} />
      <CopyableId label="Payment ID" value={order.razorpayPaymentId} />
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted text-[12px]">Created</dt>
        <dd className="text-muted nums text-[12px]">{formatDateTime(order.createdAt)}</dd>
      </div>
    </dl>
  );
}

export function OrderSummary({
  order,
  product,
  showIds = true,
}: {
  order: Order;
  product?: Product | null;
  showIds?: boolean;
}) {
  return (
    <div className="space-y-3">
      <OrderTotals order={order} product={product ?? null} />
      {showIds ? <OrderIdentifiers order={order} /> : null}
    </div>
  );
}
