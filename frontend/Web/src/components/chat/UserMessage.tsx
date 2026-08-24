import { User } from 'lucide-react';
import { MessageBubble, MessageShell } from './MessageShell';
import type { ChatTurn } from '@/types';

/**
 * A turn the user sent. Spec section 39.
 *
 * Text and a timestamp - nothing else, deliberately. A user turn carries no blocks,
 * no confirmation gate and no mock marker, because the user's own words are never
 * generated. Keeping it a separate component from AIMessage is what stops agent
 * affordances from being reachable on this side of the conversation by accident.
 */
export function UserMessage({ turn }: { turn: ChatTurn }) {
  return (
    <MessageShell
      align="end"
      label="Your message"
      createdAt={turn.createdAt}
      avatar={
        <span className="border-line bg-surface-sunken text-muted mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border">
          <User className="size-3.5" aria-hidden />
        </span>
      }
    >
      {turn.content ? (
        <MessageBubble className="bg-accent text-white">{turn.content}</MessageBubble>
      ) : null}
    </MessageShell>
  );
}
