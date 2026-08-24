import { useEffect, useRef } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { AGENT_PHASE_LABEL, useCheckoutSession } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { SUGGESTED_PROMPTS } from '@/types';
import { Button, MockNotice } from '@/components/ui';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';
import { SuggestedPrompt } from './SuggestedPrompt';
import { ThinkingIndicator } from './ThinkingIndicator';

function EmptyConversation({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center">
      <span className="bg-accent-50 border-accent-100 mb-4 grid size-11 place-items-center rounded-full border">
        <Sparkles className="text-accent size-5" aria-hidden />
      </span>
      <h2 className="text-ink text-base font-semibold">Your AI shopping assistant</h2>
      <p className="text-muted mt-1.5 text-[13px] leading-relaxed">
        Tell me what you&apos;re looking for and I&apos;ll help you find it.
      </p>
      <p className="text-faint mt-2 text-[12px] leading-relaxed">
        I search the real catalogue, and I will always ask before anything involving money.
      </p>

      <div className="mt-6 w-full space-y-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <SuggestedPrompt
            key={prompt}
            prompt={prompt}
            onSelect={onSelect}
            disabled={disabled}
          />
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

  const busy = session.isThinking || session.isConfirming;

  // `busy`, not `isThinking` alone: the indicator appears for either mutation, and
  // keying the scroll to only one of them left the confirm-flow bubble below the fold.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.turns.length, busy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {config.useMock && session.turns.length === 0 ? (
            <MockNotice>
              <code>POST /api/chat</code> is not implemented on the backend yet, so replies come
              from a local keyword agent labelled <strong>Simulated</strong>. Product data and order
              creation are real backend calls.
            </MockNotice>
          ) : null}

          {session.turns.length === 0 ? (
            <EmptyConversation onSelect={session.send} disabled={busy} />
          ) : (
            session.turns.map((turn) => (
              <ChatMessage
                key={turn.id}
                turn={turn}
                confirmationState={session.confirmations[turn.id]}
                onConfirm={session.confirmPurchase}
                onDecline={session.declinePurchase}
                onSelectProduct={(product) =>
                  // Intent goes back through the agent, which replies with the
                  // authorisation card. Selecting a product never starts a purchase.
                  session.send(`I'd like to buy the ${product.name}`)
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

      {session.turns.length > 0 ? (
        <div className="border-line flex justify-end border-t px-4 py-1.5 md:px-6">
          <Button
            size="sm"
            variant="ghost"
            onClick={session.reset}
            disabled={busy}
            icon={<Trash2 className="size-3.5" aria-hidden />}
          >
            New conversation
          </Button>
        </div>
      ) : null}

      <MessageInput onSend={session.send} disabled={busy} autoFocus />
    </div>
  );
}
