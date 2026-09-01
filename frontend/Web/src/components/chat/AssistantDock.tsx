import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui';
import { ChatWindow } from './ChatWindow';

/**
 * The drop-in assistant: one element, any page.
 *
 * Spec section 21's DROP-IN mode, made real inside this app. A merchant surface that
 * already has its own pages does not want to send customers to a separate screen to
 * ask a question, so the assistant travels with the shell instead - collapsed to a
 * launcher until someone asks for it, and carrying the whole flow when they do.
 *
 * What it does NOT do is fork the conversation. It renders the same `ChatWindow` the
 * AI Assistant page renders, against the same `CheckoutSessionProvider`, so a turn
 * started in the dock is the same turn the full page shows - one transcript, one
 * conversation id, one audit trail. A second chat implementation here would be a
 * second place for the approval gate to be got wrong.
 *
 * The panel is `Modal`'s drawer, not a bespoke floating card: Escape closing, focus
 * moving in and back to the launcher, Tab trapped inside, and the page behind inert
 * are already solved there and worth more than a custom shape.
 */
export function AssistantDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bottom right, square-ish, flat. No shadow and no glass: it is a block of
          brand colour sitting on the page, which is how every other primary action
          in this app announces itself.

          Mounted whether or not the drawer is open. Unmounting it while open read as
          the obvious tidy-up - it is covered by the panel anyway - but it broke the
          one promise this component leans on `Modal` for: `Modal` records the element
          that had focus at open and focuses it again on close, and a launcher that no
          longer exists is a `focus()` on a detached node, which silently does nothing
          and leaves focus on `<body>`. A keyboard user then had to Tab in from the top
          of the page to get back to where they were. Held in the DOM it is inerted with
          the rest of the page behind the drawer, so it is neither a Tab stop nor
          clickable while the panel is up, and it is revealed as the panel slides off
          it rather than fading in over the top. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="bg-brand-blue hover:bg-brand-blue-deep rounded-control animate-fade-in motion-micro fixed right-4 bottom-4 z-40 flex min-h-12 items-center gap-2.5 px-4 text-[13.5px] font-bold tracking-[-0.01em] text-white transition-[background-color,transform] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99] md:right-6 md:bottom-6"
      >
        <Sparkles className="size-4.5 shrink-0" strokeWidth={2.25} aria-hidden />
        Ask Mercora
      </button>

      {/* Mounted whether or not it is open, so `Modal` can play its own exit before
          unmounting. Rendering it conditionally cut the closing animation off at the
          first frame - the panel was gone before it could leave. */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mercora assistant"
        description="It searches, proposes and states the total. It cannot pay without your approval."
        variant="drawer"
        side="right"
        labelledBy="assistant-dock-title"
        footer={
          <Link
            to="/checkout"
            onClick={() => setOpen(false)}
            className="text-brand-blue hover:text-brand-blue-deep motion-fast inline-flex items-center gap-1.5 text-[12.5px] font-bold transition-colors"
          >
            Open the full assistant, with the activity panel
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        }
      >
        {/* The drawer body is a bounded column, so the transcript scrolls inside it
            and the composer stays on screen - the same arrangement the page uses. */}
        <div className="flex h-full flex-col">
          <ChatWindow />
        </div>
      </Modal>
    </>
  );
}
