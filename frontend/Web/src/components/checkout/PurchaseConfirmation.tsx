import { Check, Info, ShieldAlert, X } from 'lucide-react';
import { formatMinor, formatMinorSpoken } from '@/lib/money';
import { Badge, Button } from '@/components/ui';
import { StockBadge } from '@/components/products/ProductCard';
import type { ConfirmationState } from '@/hooks/useCheckoutSession';
import type { Product } from '@/types';

/**
 * The authorisation gate.
 *
 * This component is the boundary between "the agent suggested something" and "money
 * is involved". Three things about it are deliberate and should not be relaxed:
 *
 *   1. IT HAS NO SIDE EFFECTS. No effect hook, no query, no mutation on mount.
 *      Rendering this card cannot create an order. The only path to
 *      `POST /api/orders` is the user's click on Confirm, which calls the handler
 *      passed in from the session.
 *
 *   2. IT STATES THE AMOUNT BEFORE THE DECISION, not after. The user sees the exact
 *      total, the product, and the quantity, and the copy says plainly that
 *      confirming creates an order and that nothing is charged until payment is
 *      completed separately.
 *
 *   3. THE QUOTE IS NOT AUTHORITATIVE. `amountMinor` is what the agent displayed;
 *      the backend recomputes the total from the product row when the order is
 *      created, and the payment card that follows shows the backend's number. If
 *      they ever disagree, the backend's figure is the one that reaches the user.
 */
export function PurchaseConfirmation({
  product,
  quantity,
  amountMinor,
  currency,
  state,
  onConfirm,
  onDecline,
}: {
  product: Product;
  quantity: number;
  amountMinor: number;
  currency: string;
  state: ConfirmationState | undefined;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const resolved = state === 'confirmed' || state === 'declined';
  const busy = state === 'confirming';

  return (
    <section
      aria-label="Purchase authorisation"
      className="rounded-card border-accent-200 bg-accent-50/60 overflow-hidden border"
    >
      <div className="border-accent-200 flex items-center gap-2 border-b bg-white/70 px-4 py-2.5">
        <ShieldAlert className="text-accent size-3.5 shrink-0" aria-hidden />
        <h3 className="text-accent-900 text-[12px] font-semibold tracking-wide uppercase">
          Purchase confirmation
        </h3>
      </div>

      <div className="space-y-3.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink text-sm leading-snug font-semibold">{product.name}</p>
            <p className="text-muted mt-0.5 text-[12px]">
              {formatMinor(product.price, product.currency)} × {quantity}
              {product.category ? ` · ${product.category}` : ''}
            </p>
          </div>
          <StockBadge stock={product.stock} />
        </div>

        <div className="rounded-control border-line bg-surface divide-y divide-[var(--color-line)] border">
          <div className="flex items-baseline justify-between gap-3 px-3.5 py-2">
            <span className="text-muted text-[12px] font-medium">Quantity</span>
            <span className="text-ink nums text-[13px] font-medium">{quantity}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-3.5 py-2">
            <span className="text-muted text-[12px] font-medium">Environment</span>
            <span className="text-ink text-[13px] font-medium">Razorpay Test Mode</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-3.5 py-3">
          <span className="text-muted text-[12px] font-medium">Total</span>
          <span
            className="text-ink nums text-lg leading-none font-semibold"
            // Currency symbols are read inconsistently by screen readers, and this
            // is the number the user is authorising.
            aria-label={formatMinorSpoken(amountMinor, currency)}
          >
            {formatMinor(amountMinor, currency)}
          </span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Info className="text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p className="text-muted text-[12px] leading-relaxed">
            The agent is requesting permission to create this payment.{' '}
            <strong>Nothing is charged yet</strong> — you complete the payment yourself, and this app
            will only report success after Razorpay verifies it.
          </p>
        </div>

        {resolved ? (
          <div className="pt-0.5">
            {state === 'confirmed' ? (
              <Badge tone="success" icon={<Check className="size-3" aria-hidden />}>
                Authorised by you
              </Badge>
            ) : (
              <Badge tone="neutral" icon={<X className="size-3" aria-hidden />}>
                Declined — no order created
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-0.5 sm:flex-row">
            <Button
              variant="primary"
              size="md"
              onClick={onConfirm}
              loading={busy}
              disabled={product.stock < 1}
              className="sm:flex-1"
            >
              {busy ? 'Creating order…' : `Confirm ${formatMinor(amountMinor, currency)}`}
            </Button>
            <Button variant="secondary" size="md" onClick={onDecline} disabled={busy}>
              Cancel
            </Button>
          </div>
        )}

        {state === 'failed' ? (
          <p className="text-danger text-[12px] leading-relaxed">
            The order was not created and nothing was charged. Details are in the message below.
          </p>
        ) : null}

        {product.stock < 1 ? (
          <p className="text-danger text-[12px]">
            This product is out of stock, so it cannot be purchased.
          </p>
        ) : null}
      </div>
    </section>
  );
}
