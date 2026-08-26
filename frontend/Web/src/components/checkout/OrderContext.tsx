import { Link } from 'react-router-dom';
import { ArrowUpRight, Package, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useProduct } from '@/hooks/useProducts';
import { formatMinor } from '@/lib/money';
import { truncateId } from '@/lib/format';
import { cn } from '@/lib/cn';
import { MockBadge, SkeletonText } from '@/components/ui';
import { OrderStatusBadge } from '@/components/orders/OrderStatus';

/**
 * "Current Order" - the persistent order context from spec section 18.
 *
 * The payment card lives inside the conversation, which means it scrolls away. Once
 * the transcript is a few turns long, the answer to "what am I actually buying, and
 * has it been paid for" is somewhere above the fold. This panel keeps that answer in
 * view, reading the same polled query the card does (`qk.orders.payment`), so the two
 * cannot show different statuses - React Query serves both from one cache entry and
 * one request.
 *
 * THE VERIFICATION LINE. It has exactly two states and they are not symmetrical.
 * `PAID` is the only status the backend writes from a signature-verified Razorpay
 * webhook, so it is the only status this panel will describe as verified. Everything
 * else - including PAYMENT_PENDING, where the customer may well have just completed
 * a payment the webhook has not delivered yet - reads "Not verified". That is not
 * pessimism; it is the difference between what the system knows and what it hopes.
 * There is no elapsed-time branch and no optimistic case.
 *
 * `mock` travels with the payment data, not from `config.useMock`: an order can exist
 * with no simulated payment attached to it, and in that case there is nothing
 * simulated to label.
 */
export function OrderContext({ className }: { className?: string }) {
  const session = useCheckoutSession();
  const orderId = session.activeOrderId;
  const payment = usePaymentStatus(orderId);
  const order = payment.data?.order ?? null;
  const product = useProduct(order?.productId);

  // Nothing has been ordered in this conversation. Rendering an empty "Current
  // Order" frame would suggest an order exists in some unreadable state.
  if (!orderId) return null;

  const verified = order?.status === 'PAID';
  const isMock = payment.data?.mock ?? false;

  return (
    <section
      className={cn('border-line bg-surface shrink-0 border-t px-4 py-3.5', className)}
      aria-labelledby="order-context-heading"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Package className="text-faint size-4 shrink-0" aria-hidden />
          <h2
            id="order-context-heading"
            className="text-ink text-[13px] leading-tight font-semibold"
          >
            Current Order
          </h2>
        </div>
        {order ? <OrderStatusBadge status={order.status} /> : null}
      </div>

      {payment.isError && !order ? (
        // The order id is real - it came back from POST /api/orders - so the absence
        // of a row here is a failed read, not a missing order. Said plainly, because
        // a blank panel would read as "no order".
        <p className="text-danger text-[12px] leading-relaxed">
          This order could not be read from the backend just now. Its status is unknown — not
          failed, and not paid.
        </p>
      ) : !order ? (
        <SkeletonText lines={2} />
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-ink min-w-0 truncate text-[13px] font-medium">
              {product.data?.name ?? (
                <span className="text-muted font-normal">
                  Product {truncateId(order.productId, 8, 4)}
                </span>
              )}
            </p>
            <p className="nums text-ink shrink-0 text-[13px] font-semibold">
              {formatMinor(order.amount, order.currency)}
            </p>
          </div>

          <p className="text-faint text-[11px]">
            Quantity {order.quantity} · {truncateId(order.id, 10, 4)}
          </p>

          {/* Icon, wording and colour all carry the state - spec section 37. The
              sentence is the primary carrier, so it survives a greyscale screenshot
              and a screen reader alike. */}
          <div
            className={cn(
              'rounded-control flex items-start gap-2 border px-2.5 py-2',
              verified ? 'border-success-line bg-success-bg' : 'border-line bg-surface-sunken',
            )}
          >
            {verified ? (
              <ShieldCheck className="text-success mt-px size-3.5 shrink-0" aria-hidden />
            ) : (
              <ShieldQuestion className="text-muted mt-px size-3.5 shrink-0" aria-hidden />
            )}
            <p className="text-muted text-[11px] leading-relaxed">
              <strong className={cn('font-semibold', verified ? 'text-success' : 'text-ink')}>
                {verified ? 'Payment verified' : 'Not verified'}
              </strong>{' '}
              {verified
                ? isMock
                  ? '— by the labelled simulation standing in for the Razorpay webhook, not by Razorpay.'
                  : '— Razorpay confirmed this payment with a signed webhook.'
                : '— no verified payment has been recorded for this order. Nothing has been charged.'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/orders/${order.id}`}
              className="text-accent hover:text-accent-700 inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
            >
              Order details
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
            {isMock ? <MockBadge /> : null}
          </div>
        </div>
      )}
    </section>
  );
}
