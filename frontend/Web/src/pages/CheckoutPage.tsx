import { useState } from 'react';
import { PanelRightOpen } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { AgentActivityPanel } from '@/components/agent/AgentActivityPanel';
import { Button, Modal } from '@/components/ui';
import { useIsCompact } from '@/hooks/useMediaQuery';

/**
 * The main surface: conversation on the left, agent trace on the right.
 *
 * Below 1100px the trace becomes a drawer rather than stacking beneath the chat.
 * Stacking would push the composer off-screen, and on a narrow viewport the
 * conversation is what the user came for - the audit trail is something they open
 * when they want to check the agent's work.
 */
export function CheckoutPage() {
  const isCompact = useIsCompact();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <Page
      title="Checkout Concierge"
      description="Conversational shopping with an explicit authorisation step before anything involving money"
      fill
      actions={
        isCompact ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPanelOpen(true)}
            icon={<PanelRightOpen className="size-3.5" aria-hidden />}
          >
            <span className="hidden sm:inline">Agent activity</span>
            <span className="sm:hidden">Activity</span>
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1">
        <ChatWindow />

        {!isCompact ? (
          <aside className="border-line bg-surface-subtle flex w-[22rem] shrink-0 flex-col border-l">
            <AgentActivityPanel className="flex-1" />
          </aside>
        ) : null}
      </div>

      {isCompact ? (
        <Modal
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title="Agent activity"
          description="Every tool call, with its reason"
          variant="drawer"
          labelledBy="agent-panel-title"
        >
          <AgentActivityPanel className="h-full" showHeader={false} />
        </Modal>
      ) : null}
    </Page>
  );
}
