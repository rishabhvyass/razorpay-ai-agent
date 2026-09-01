import { cn } from '@/lib/cn';
import { plainText } from '@/lib/text';
import { MercoraGlyph } from '@/components/layout/MercoraMark';
import { MessageBlocks, type MessageBlockHandlers } from './MessageBlocks';
import { MessageBubble, MessageShell } from './MessageShell';
import type { ChatTurn } from '@/types';

/**
 * A turn the agent produced. Spec section 39.
 *
 * Everything that distinguishes agent output from user input lives here: the mock
 * marker, the failure styling, and the typed blocks - product results, the
 * authorisation gate, the payment card. A failed turn is styled as a failure rather
 * than dropped, because a reply the agent could not produce is information.
 *
 * The avatar is the Mercora glyph rather than a sparkle. A sparkle says "AI magic";
 * this product's claim is the opposite one, that the thing talking to you is a bounded
 * system with a gate in it.
 */
export function AIMessage({
  turn,
  ...handlers
}: MessageBlockHandlers & { turn: ChatTurn }) {
  const blocks = turn.blocks ?? [];

  return (
    <MessageShell
      align="start"
      label="Agent message"
      createdAt={turn.createdAt}
      {...(turn.mock ? { mock: true } : {})}
      avatar={
        <span
          className={cn(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-control p-1',
            turn.failed ? 'bg-danger-bg text-danger' : 'bg-brand-blue text-white',
          )}
        >
          <MercoraGlyph />
        </span>
      }
    >
      {turn.content ? (
        <MessageBubble
          className={cn(
            turn.failed ? 'bg-danger-bg text-ink' : 'bg-surface-sunken text-ink',
          )}
        >
          {plainText(turn.content)}
        </MessageBubble>
      ) : null}

      <MessageBlocks blocks={blocks} turnId={turn.id} {...handlers} />
    </MessageShell>
  );
}
