import { AlertTriangle } from 'lucide-react';
import { PurchaseConfirmation } from '@/components/checkout/PurchaseConfirmation';
import { PaymentCard } from '@/components/checkout/PaymentCard';
import { AgentActivityTimeline } from '@/components/agent/AgentActivityTimeline';
import { ProductMessage } from './ProductMessage';
import type { ConfirmationState } from '@/hooks/useCheckoutSession';
import type { ChatBlock, Product } from '@/types';

/**
 * The rich content a turn can carry, rendered from typed blocks.
 *
 * Rich content is never markup inside the message text, so there is no path by which
 * model output becomes markup. Every block kind is handled explicitly; an unknown
 * kind renders nothing rather than guessing at it.
 *
 * Only assistant turns have blocks - a user turn is text - which is why this lives
 * beside AIMessage rather than inside a component shared with UserMessage.
 */
export interface MessageBlockHandlers {
  confirmationState: ConfirmationState | undefined;
  onConfirm: (turnId: string, args: { product: Product; quantity: number }) => void;
  onDecline: (turnId: string) => void;
  onSelectProduct: (product: Product) => void;
  onNewOrder: (product: Product | null) => void;
  /** True while any request is in flight, so a second one cannot be started. */
  busy: boolean;
}

function Block({
  block,
  turnId,
  confirmationState,
  onConfirm,
  onDecline,
  onSelectProduct,
  onNewOrder,
  busy,
}: MessageBlockHandlers & { block: ChatBlock; turnId: string }) {
  switch (block.kind) {
    case 'product':
      return (
        <ProductMessage
          products={block.products}
          {...(block.note ? { note: block.note } : {})}
          onSelect={onSelectProduct}
          disabled={busy}
        />
      );

    case 'purchase-confirmation':
      return (
        <PurchaseConfirmation
          product={block.product}
          quantity={block.quantity}
          amountMinor={block.amountMinor}
          currency={block.currency}
          state={confirmationState}
          onConfirm={() => onConfirm(turnId, { product: block.product, quantity: block.quantity })}
          onDecline={() => onDecline(turnId)}
        />
      );

    case 'payment':
      return (
        <PaymentCard
          orderId={block.order.id}
          fallbackOrder={block.order}
          product={block.product}
          onNewOrder={() => onNewOrder(block.product ?? null)}
        />
      );

    case 'order-confirmation':
      return (
        <PaymentCard
          orderId={block.order.id}
          fallbackOrder={block.order}
          product={block.product}
          onNewOrder={() => onNewOrder(block.product ?? null)}
        />
      );

    case 'activity-summary':
      return (
        <div className="rounded-card border-line bg-surface border p-3.5">
          <AgentActivityTimeline actions={block.actions} />
        </div>
      );

    case 'error':
      return (
        <div
          role="alert"
          className="rounded-card border-danger-line bg-danger-bg flex items-start gap-2.5 border px-3.5 py-3"
        >
          <AlertTriangle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-ink text-[13px] font-semibold">{block.message}</p>
            {block.hint ? (
              <p className="text-muted mt-1 text-[12px] leading-relaxed">{block.hint}</p>
            ) : null}
            <p className="text-faint mt-1.5 font-mono text-[11px]">{block.code}</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function MessageBlocks({
  blocks,
  turnId,
  ...handlers
}: MessageBlockHandlers & { blocks: ChatBlock[]; turnId: string }) {
  if (blocks.length === 0) return null;

  return (
    <div className="w-full max-w-[min(38rem,100%)] space-y-2.5">
      {blocks.map((block, index) => (
        <Block
          key={`${turnId}-${block.kind}-${index}`}
          block={block}
          turnId={turnId}
          {...handlers}
        />
      ))}
    </div>
  );
}
