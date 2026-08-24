import { AIMessage } from './AIMessage';
import { UserMessage } from './UserMessage';
import type { MessageBlockHandlers } from './MessageBlocks';
import type { ChatTurn } from '@/types';

/**
 * Role dispatch for one turn.
 *
 * This used to be one component with an `isUser` flag threaded through five
 * conditionals in its markup, and the flag was doing more work than it looked like:
 * the agent branch also owned the mock marker, the failure styling and the entire
 * block renderer, none of which a user turn can ever have. A user message that
 * rendered a payment card was one mistaken boolean away.
 *
 * So the two roles are two components - spec section 39 - and this is the single
 * place that maps a role to one of them. Shared geometry lives in MessageShell, so
 * the split cannot make the two sides of the conversation drift apart visually.
 */
export function ChatMessage({
  turn,
  ...handlers
}: MessageBlockHandlers & { turn: ChatTurn }) {
  if (turn.role === 'user') return <UserMessage turn={turn} />;
  return <AIMessage turn={turn} {...handlers} />;
}
