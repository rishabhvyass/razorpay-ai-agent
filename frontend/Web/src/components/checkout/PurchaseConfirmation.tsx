import { Check, ShieldCheck, X } from 'lucide-react';
import { formatMinor, formatMinorSpoken } from '@/lib/money';
import { Badge, Button } from '@/components/ui';
import { StockBadge } from '@/components/products/ProductCard';
import type { ConfirmationState } from '@/hooks/useCheckoutSession';
import type { Product } from '@/types';

/**
 * SCREEN 07. The authorisation gate.
 *
 * This component is the boundary between "the agent suggested something" and "money
 * is involved". Three things about it are deliberate and should not be relaxed:
 *
 *   1. IT HAS NO SIDE EFFECTS. No effect hook, no query, no mutation on mount.
 *      Rendering this card cannot create an order. The only path to
 *      `POST /api/orders` is the user's click on Approve, which calls the handler
 *      passed in from the session.
 *
 *   2. IT STATES THE AMOUNT BEFORE THE DECISION, not after. The total is the largest
 *      thing on the card and it is repeated inside the button, so the control that
 *      spends money names the sum it spends.
 *
 *   3. THE QUOTE IS NOT AUTHORITATIVE. `amountMinor` is what the agent displayed;
 *      the backend recomputes the total from the product row when the order is
 *      created, and the payment card that follows shows the backend's number. If
 *      they ever disagree, the backend's figure is the one that reaches the user.
 *
 * Visually it is a blue block, not a bordered panel: this is the one card in the
 * conversation that must not be skimmable, and colour blocking is how this system
 * raises something without a shadow.
 */

/** Spec section 34. Facts about this specific decision, not reassurance. */
const CHECKS = [
  'The amount above is the exact total',
  'Nothing is charged by approving',
  'Razorpay collects the payment, not Mercora',
] as const;

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
      // Spec sections 20 and 21: the one card in the conversation that has to announce
      // itself does so by arriving at 0.98 and settling, rather than by sliding in from
      // somewhere it never was. Everything else in a turn simply rises 8px.
      className="rounded-card bg-brand-blue-subtle animate-scale-in w-full max-w-[min(38rem,100%)] overflow-hidden"
    >
      <div className="bg-brand-blue flex items-center gap-2 px-5 py-2.5 text-white">
        <ShieldCheck className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase">Purchase confirmation</h3>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink text-[15px] leading-snug font-bold tracking-[-0.01em]">
              {product.name}
            </p>
            <p className="text-muted mt-1 text-[12px] font-medium">
              {formatMinor(product.price, product.currency)} × {quantity}
              {product.category ? ` · ${product.category}` : ''}
            </p>
          </div>
          <StockBadge stock={product.stock} />
        </div>

        {/* The number, set as the largest thing on the card. */}
        <div className="border-brand-blue/20 mt-5 flex items-end justify-between gap-4 border-t pt-5">
          <span className="text-muted text-[11px] font-bold tracking-[0.08em] uppercase">
            Total to approve
          </span>
          <span
            className="text-ink nums text-[30px] leading-none font-extrabold tracking-[-0.02em]"
            // Currency symbols are read inconsistently by screen readers, and this
            // is the number the user is authorising.
            aria-label={formatMinorSpoken(amountMinor, currency)}
          >
            {formatMinor(amountMinor, currency)}
          </span>
        </div>

        <ul className="mt-5 space-y-2">
          {CHECKS.map((check) => (
            <li key={check} className="flex items-start gap-2.5">
              <Check className="text-brand-blue mt-px size-4 shrink-0" strokeWidth={3} aria-hidden />
              <span className="text-ink text-[12.5px] leading-relaxed font-medium">{check}</span>
            </li>
          ))}
        </ul>

        {resolved ? (
          // Spec section 23: the tick draws itself and the badge settles from 0.98. No
          // confetti and no bounce - this is a receipt for a decision the user made, and
          // it appears because `state` came back `confirmed` from a completed request,
          // not because a click was registered.
          <div className="animate-scale-in mt-5">
            {state === 'confirmed' ? (
              <Badge
                tone="success"
                icon={<Check className="animate-check-draw size-3" strokeWidth={3} aria-hidden />}
              >
                Authorised by you
              </Badge>
            ) : (
              <Badge tone="neutral" icon={<X className="size-3" aria-hidden />}>
                Declined. No order created
              </Badge>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={onConfirm}
              loading={busy}
              disabled={product.stock < 1}
              className="sm:flex-1"
            >
              {busy ? 'Creating order…' : `Approve ${formatMinor(amountMinor, currency)}`}
            </Button>
            <Button variant="secondary" size="lg" onClick={onDecline} disabled={busy}>
              Cancel
            </Button>
          </div>
        )}

        <p className="text-muted mt-4 text-[12px] leading-relaxed">
          <strong className="text-ink font-bold">Your approval is the final gate.</strong> The agent
          cannot pass it, and it cannot be granted on your behalf. Payment is collected by Razorpay
          afterwards, and this app reports success only once Razorpay&apos;s signed webhook confirms
          it.
        </p>

        {state === 'failed' ? (
          <p className="text-danger mt-3 text-[12px] leading-relaxed font-semibold">
            The order was not created and nothing was charged. Details are in the message below.
          </p>
        ) : null}

        {product.stock < 1 ? (
          <p className="text-danger mt-3 text-[12px] font-semibold">
            This product is out of stock, so it cannot be purchased.
          </p>
        ) : null}
      </div>
    </section>
  );
}
