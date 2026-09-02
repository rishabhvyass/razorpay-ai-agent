import { useEffect, useMemo, useRef } from 'react';
import { AGENT_PHASE_LABEL, useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { SUGGESTED_PROMPTS } from '@/types';
import { MockNotice } from '@/components/ui';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';
import { SuggestedPrompt } from './SuggestedPrompt';
import { ThinkingIndicator } from './ThinkingIndicator';

/** What the agent may do, and the one thing it may not. Spec sections 03 and 41. */
const BOUNDS = [
  'Searches the real catalogue',
  'States the exact total first',
  'Cannot pay without your approval',
] as const;

/**
 * SCREEN 03. The question, then four ways to answer it.
 *
 * Set large and left-aligned rather than centred under an icon: this is the first
 * thing on the hero screen, and a headline is a better invitation than a decorated
 * empty box. The three bounds underneath are the product's argument stated before the
 * agent has said anything, so the first thing a new user reads is what it cannot do.
 *
 * The two size steps are container queries, not viewport ones. The same component
 * renders in a 355px drawer and in a 768px column on a 1280px screen, so a `md:`
 * breakpoint would give the drawer the wide layout - a 38px headline over three lines
 * and two prompt cards squeezed into one card's width. `@md` asks the only question
 * that matters here: how much room did my parent give me.
 */
function EmptyConversation({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="py-8 md:py-12">
      <h2 className="text-ink @md:text-[38px] text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em]">
        What are you looking for?
      </h2>
      <p className="text-muted mt-3 max-w-lg text-[14px] leading-relaxed">
        Describe it the way you would to a shop assistant - a category, a colour, a budget.
        Mercora searches the catalogue and proposes; you decide.
      </p>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
        {BOUNDS.map((bound) => (
          <li key={bound} className="text-faint flex items-center gap-2 text-[12px] font-semibold">
            <span className="bg-brand-blue size-1.5 shrink-0 rounded-full" aria-hidden />
            {bound}
          </li>
        ))}
      </ul>

      <div className="@md:grid-cols-2 mt-7 grid gap-2.5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <SuggestedPrompt key={prompt} prompt={prompt} onSelect={onSelect} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

/**
 * The conversation surface.
 *
 * Auto-scroll follows new turns, but only the list scrolls - the composer stays put.
 * A chat that scrolls the whole page loses the input the moment the agent replies.
 */
export function ChatWindow() {
  const session = useCheckoutSession();
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const busy = session.isThinking || session.isConfirming;

  /**
   * Authorisation cards that have already been answered somewhere else.
   *
   * The backend emits a `purchase-confirmation` block from a SUCCESSFUL `create_order`
   * tool call, which means a user who approved in prose ("yes, go ahead") gets the card
   * and the payment card for the same order in the same turn. Leaving the card's
   * Approve button live would offer a second, duplicate order for a purchase that is
   * already waiting to be paid.
   *
   * So a confirmation block is treated as settled when a payment block follows it -
   * later in the same turn, or in any later turn. This reads the transcript the UI has
   * already been given; it does not decide anything about the order, and the session's
   * own state still wins where it exists.
   */
  const answered = useMemo(() => {
    const ids = new Set<string>();
    let paymentSeen = false;

    for (let i = session.turns.length - 1; i >= 0; i -= 1) {
      const turn = session.turns[i];
      if (!turn) continue;
      const blocks = turn.blocks ?? [];
      for (let j = blocks.length - 1; j >= 0; j -= 1) {
        const kind = blocks[j]?.kind;
        if (kind === 'payment' || kind === 'order-confirmation') {
          paymentSeen = true;
        } else if (kind === 'purchase-confirmation' && paymentSeen) {
          ids.add(turn.id);
        }
      }
    }

    return ids;
  }, [session.turns]);

  /**
   * Nothing to follow before the first turn.
   *
   * Both effects below chase the bottom of the transcript, which is right once there
   * is a transcript and wrong before there is one: on a surface shorter than the empty
   * state - the dock drawer - scrolling to the bottom of "What are you looking for?"
   * opens the panel halfway down its own invitation. `busy` counts as content because
   * the thinking bubble is the thing being waited for.
   */
  const empty = session.turns.length === 0 && !busy;

  // `busy`, not `isThinking` alone: the indicator appears for either mutation, and
  // keying the scroll to only one of them left the confirm-flow bubble below the fold.
  useEffect(() => {
    if (empty) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [empty, session.turns.length, busy]);

  /**
   * Stay at the bottom while the turn is still growing.
   *
   * Scrolling once per new turn is not enough: a reply carrying a payment card grows
   * after it mounts - the product thumbnail loads, the step tracker resolves - and the
   * one-shot scroll fires against the height the turn had a frame earlier. The card
   * with the pay button then sits below the fold on the screen the whole flow leads to.
   *
   * Only pins when the reader is already near the bottom, so scrolling up to re-read
   * an earlier turn is not yanked back by the next image that loads.
   */
  useEffect(() => {
    if (empty) return;
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;

    const observer = new ResizeObserver(() => {
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (distance < 260) viewport.scrollTop = viewport.scrollHeight;
    });

    observer.observe(list);
    return () => observer.disconnect();
  }, [empty]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6"
      >
        <div ref={listRef} className="@container mx-auto w-full max-w-3xl space-y-5">
          {config.useMock && session.turns.length === 0 ? (
            <MockNotice>
              <code>POST /api/chat</code> is running in local mode, so replies come from a keyword
              agent labelled <strong>Simulated</strong>. Product data and order creation are real
              backend calls.
            </MockNotice>
          ) : null}

          {session.turns.length === 0 ? (
            <EmptyConversation onSelect={session.send} disabled={busy} />
          ) : (
            session.turns.map((turn) => (
              <ChatMessage
                key={turn.id}
                turn={turn}
                confirmationState={
                  session.confirmations[turn.id] ??
                  (answered.has(turn.id) ? 'confirmed' : undefined)
                }
                onConfirm={session.confirmPurchase}
                onDecline={session.declinePurchase}
                // Intent goes back through the agent, which replies with the
                // authorisation card. Selecting a product never starts a purchase.
                onSelectProduct={session.selectProduct}
                onNewOrder={(product) =>
                  session.send(
                    product === null
                      ? 'I want to buy the product again. Please create a new order.'
                      : `I want to buy ${product.name} again. Please create a new order.`,
                  )
                }
                busy={busy}
              />
            ))
          )}

          {/* One bubble, relabelled as the work moves, rather than one bubble per
              mutation: both flags could be pending at once and the surface would then
              show two agents thinking. The label comes from `session.phase`, which is
              set immediately before each await and cleared when it settles, so it
              always names a request that is genuinely in flight. Falling back to the
              pending mutation's own phase covers the instant between a mutation
              starting and its first phase being set. */}
          {busy ? (
            <ThinkingIndicator
              label={
                AGENT_PHASE_LABEL[
                  session.phase ?? (session.isConfirming ? 'creating-order' : 'thinking')
                ]
              }
            />
          ) : null}

          <div ref={bottomRef} className="h-px" />
        </div>
      </div>

      <MessageInput onSend={session.send} disabled={busy} autoFocus />
    </div>
  );
}
