import { AlertTriangle, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { MockBadge } from '@/components/ui';
import { PurchaseConfirmation } from '@/components/checkout/PurchaseConfirmation';
import { PaymentCard } from '@/components/checkout/PaymentCard';
import { AgentActivityTimeline } from '@/components/agent/AgentActivityTimeline';
import { ProductMessage } from './ProductMessage';
import type { ConfirmationState } from '@/hooks/useCheckoutSession';
import type { ChatBlock, ChatTurn, Product } from '@/types';

/**
 * One turn in the conversation.
 *
 * Rich content is rendered from typed blocks, never from markup inside the message
 * text - so there is no path by which model output becomes markup. Every block kind
 * is handled explicitly below; an unknown kind renders nothing rather than guessing.
 */
function BlockRenderer({
  block,
  turnId,
  confirmationState,
  onConfirm,
  onDecline,
  onSelectProduct,
  busy,
}: {
  block: ChatBlock;
  turnId: string;
  confirmationState: ConfirmationState | undefined;
  onConfirm: (turnId: string, args: { product: Product; quantity: number }) => void;
  onDecline: (turnId: string) => void;
  onSelectProduct: (product: Product) => void;
  busy: boolean;
}) {
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
          onConfirm={() =>
            onConfirm(turnId, { product: block.product, quantity: block.quantity })
          }
          onDecline={() => onDecline(turnId)}
        />
      );

    case 'payment':
      return (
        <PaymentCard
          orderId={block.order.id}
          fallbackOrder={block.order}
          product={block.product}
          fallbackPaymentUrl={block.paymentUrl}
        />
      );

    case 'order-confirmation':
      return (
        <PaymentCard
          orderId={block.order.id}
          fallbackOrder={block.order}
          product={block.product}
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

export function ChatMessage({
  turn,
  confirmationState,
  onConfirm,
  onDecline,
  onSelectProduct,
  busy,
}: {
  turn: ChatTurn;
  confirmationState: ConfirmationState | undefined;
  onConfirm: (turnId: string, args: { product: Product; quantity: number }) => void;
  onDecline: (turnId: string) => void;
  onSelectProduct: (product: Product) => void;
  busy: boolean;
}) {
  const isUser = turn.role === 'user';
  const hasBlocks = (turn.blocks?.length ?? 0) > 0;

  return (
    <article
      className={cn('animate-fade-up flex gap-2.5', isUser && 'flex-row-reverse')}
      aria-label={isUser ? 'Your message' : 'Agent message'}
    >
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border',
          isUser
            ? 'border-line bg-surface-sunken text-muted'
            : turn.failed
              ? 'border-danger-line bg-danger-bg text-danger'
              : 'border-accent-100 bg-accent-50 text-accent',
        )}
      >
        {isUser ? (
          <User className="size-3.5" aria-hidden />
        ) : (
          <Sparkles className="size-3.5" aria-hidden />
        )}
      </span>

      <div className={cn('flex min-w-0 flex-col gap-2.5', isUser ? 'items-end' : 'items-start', 'max-w-full flex-1')}>
        {turn.content ? (
          <div
            className={cn(
              'rounded-card max-w-[min(38rem,100%)] px-3.5 py-2.5 text-[13px] leading-relaxed',
              isUser
                ? 'bg-accent text-white'
                : turn.failed
                  ? 'border-danger-line bg-danger-bg text-ink border'
                  : 'border-line bg-surface text-ink border',
            )}
          >
            {/* Plain text. Model output is never interpreted as markup. */}
            <p className="whitespace-pre-wrap break-words">{turn.content}</p>
          </div>
        ) : null}

        {hasBlocks ? (
          <div className="w-full max-w-[min(38rem,100%)] space-y-2.5">
            {turn.blocks?.map((block, index) => (
              <BlockRenderer
                key={`${turn.id}-${block.kind}-${index}`}
                block={block}
                turnId={turn.id}
                confirmationState={confirmationState}
                onConfirm={onConfirm}
                onDecline={onDecline}
                onSelectProduct={onSelectProduct}
                busy={busy}
              />
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-center gap-2 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <time className="text-faint nums text-[11px]" dateTime={turn.createdAt}>
            {formatTime(turn.createdAt)}
          </time>
          {/* The marker travels with the turn - a simulated reply cannot render
              without it. */}
          {turn.mock ? <MockBadge /> : null}
        </div>
      </div>
    </article>
  );
}
