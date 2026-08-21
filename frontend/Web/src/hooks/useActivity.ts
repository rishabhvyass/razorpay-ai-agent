import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getConversationActivity } from '@/services/conversationService';

/**
 * The agent audit trail for one conversation.
 *
 * `refetchInterval` is deliberate: agent actions are written by the backend as it
 * works, so a static fetch would show a trace that stops updating halfway through
 * the flow. Polling every few seconds while a conversation is open keeps the trace
 * honest without a socket.
 */
export function useConversationActivity(
  conversationId: string | null | undefined,
  options: { live?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.conversations.activity(conversationId ?? ''),
    queryFn: ({ signal }) => getConversationActivity(conversationId!, { limit: 200 }, signal),
    enabled: Boolean(conversationId),
    refetchInterval: options.live ? 4000 : false,
    staleTime: 2000,
  });
}
