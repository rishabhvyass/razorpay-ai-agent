import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
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
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border',
            turn.failed
              ? 'border-danger-line bg-danger-bg text-danger'
              : 'border-accent-100 bg-accent-50 text-accent',
          )}
        >
          <Sparkles className="size-3.5" aria-hidden />
        </span>
      }
    >
      {turn.content ? (
        <MessageBubble
          className={cn(
            'border',
            turn.failed
              ? 'border-danger-line bg-danger-bg text-ink'
              : 'border-line bg-surface text-ink',
          )}
        >
          {turn.content}
        </MessageBubble>
      ) : null}

      <MessageBlocks blocks={blocks} turnId={turn.id} {...handlers} />
    </MessageShell>
  );
}
