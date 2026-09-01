import { useState } from 'react';
import { Bot, Copy } from 'lucide-react';
import { AGENT_PHASE_LABEL, useCheckoutSession } from '@/hooks/useCheckoutSession';
import { truncateId } from '@/lib/format';
import { config } from '@/lib/config';
import { cn } from '@/lib/cn';

/**
 * Who you are talking to, and what it is doing right now. Spec section 9.
 *
 * The status is derived from `session.phase`, the same value the chat's own
 * indicator uses, so the top bar and the conversation cannot disagree about whether
 * the agent is working. When no phase is set the agent is genuinely idle and the
 * badge says so - it is not a decorative "online" light. The backend's reachability
 * is a different claim and is reported by the Topbar's own health badge.
 *
 * The conversation id is shown because it is the handle a reviewer needs to find
 * this session's rows in Supabase, and because its absence is informative: when the
 * backend refused to open a conversation, nothing in this chat is being persisted,
 * and this is where that is stated rather than left to be inferred from an empty
 * activity feed.
 *
 * Nothing secret appears here. A conversation id is a row identifier the backend
 * hands to the client; spec section 17's list - API keys, secrets, authorization
 * headers, the Supabase service role key, the Razorpay secret - is not in scope for
 * this component and must never be added to it.
 */
export function AgentIdentity() {
  const session = useCheckoutSession();
  const [copied, setCopied] = useState(false);

  const busy = session.isThinking || session.isConfirming;
  const phase = session.phase;
  const working = busy || phase !== null;

  const status = working
    ? AGENT_PHASE_LABEL[phase ?? (session.isConfirming ? 'creating-order' : 'thinking')]
    : 'Ready';

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-control border',
          working ? 'bg-accent-50 border-accent-100' : 'border-line bg-surface-sunken',
        )}
        aria-hidden
      >
        <Bot className={cn('size-3.5', working ? 'text-accent' : 'text-muted')} />
      </span>

      <div className="min-w-0 leading-tight">
        <p className="text-ink text-[12px] font-semibold">
          AI Agent
          {config.useMock ? <span className="text-faint font-normal"> · simulated</span> : null}
        </p>
        {/* Deliberately NOT a live region. It says the same word at the same moment
            as the chat's own thinking indicator, which is already `role="status"`, so
            announcing both made a screen reader say "Thinking" twice per turn - I
            confirmed two live regions holding "Thinking" simultaneously by driving a
            turn in a real browser. The indicator beside the transcript is the right
            owner of that announcement, because it sits next to the turn it describes.
            This line stays a visible, readable status for anyone looking at it. */}
        <p className="text-muted text-[11px]">{status}</p>
      </div>

      {session.conversationId ? (
        <button
          type="button"
          title={session.conversationId}
          onClick={() => {
            const id = session.conversationId;
            if (!id) return;
            void navigator.clipboard?.writeText(id).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              },
              () => setCopied(false),
            );
          }}
          className="border-line bg-surface-sunken text-muted hover:text-ink hidden shrink-0 items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] transition-colors lg:inline-flex"
        >
          {truncateId(session.conversationId, 10, 4)}
          <Copy
            className={cn('size-3 shrink-0', copied ? 'text-success' : 'text-faint')}
            aria-hidden
          />
          <span className="sr-only">
            {copied ? 'Conversation ID copied' : 'Copy conversation ID'}
          </span>
        </button>
      ) : (
        // Not a blank space: no conversation id means POST /api/conversations did not
        // succeed, so this transcript exists only in this tab.
        <span className="border-line bg-surface-sunken text-faint hidden shrink-0 border px-2.5 py-1 text-[11px] lg:inline">
          {session.transcriptRecording ? 'No conversation yet' : 'Transcript not recorded'}
        </span>
      )}
    </div>
  );
}
