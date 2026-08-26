import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Everything inside the panel that a Tab press may land on.
 *
 * `[tabindex="-1"]` is excluded deliberately: it matches the panel itself, which is
 * focusable by script but must never be a Tab stop. Disabled controls are excluded for
 * the same practical reason - the trap moves focus itself, so a dead entry in this list
 * is a Tab press that visibly does nothing.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mark every subtree outside `element` as inert while the dialog is open, returning the
 * undo.
 *
 * Trapping Tab is not enough on its own: the panel claims `aria-modal`, but browsers do
 * not act on it, so the page behind stays in the accessibility tree and stays reachable
 * by pointer and by a screen reader's own cursor.
 *
 * The dialog renders inline in the page rather than through a portal, which rules out
 * the obvious move of inerting the app root: the dialog lives inside that root and would
 * go inert with it. Walking up from the overlay and inerting each ancestor's siblings
 * reaches the same place from the inside out - the ancestor chain stays live, so the
 * panel and its backdrop keep working, while every subtree the dialog covers leaves both
 * the tab order and the accessibility tree.
 *
 * What that deliberately cannot reach is content owned directly by one of those
 * ancestors rather than by one of their other children. In this app they are layout
 * wrappers (`#root`, the shell, the page column), so nothing interactive is left behind;
 * a future ancestor that renders its own controls would need rethinking here.
 *
 * A subtree an outer dialog has already marked is left alone, so that dialog's own undo
 * is still correct once this one has unwound.
 */
function inertOutside(element: HTMLElement): () => void {
  const marked: HTMLElement[] = [];
  let node: HTMLElement = element;

  while (node !== document.body) {
    const parent = node.parentElement;
    if (!parent) break;

    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.hasAttribute('inert')) continue;
      // Nodes that render nothing - the module <script> beside #root, for one - cannot
      // be interacted with anyway, so marking them is inspector noise, not safety.
      if (sibling.matches('script, style, link, template, noscript')) continue;
      sibling.setAttribute('inert', '');
      marked.push(sibling);
    }

    node = parent;
  }

  return () => {
    for (const el of marked) {
      el.removeAttribute('inert');
    }
  };
}

/**
 * Modal / drawer.
 *
 * Hand-rolled rather than pulled from a dependency (spec section 34: no unnecessary
 * packages), so it has to earn that by getting the accessibility right: Escape
 * closes, focus moves into the panel on open and returns to the trigger on close,
 * Tab is trapped inside, the page behind is inert to both pointer and assistive
 * tech, and the body cannot scroll.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  labelledBy = 'modal-title',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** `drawer` slides in from the right - used for the agent panel below 1100px. */
  variant?: 'center' | 'drawer';
  labelledBy?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Open and close: scroll lock, the inert background, and the focus handover. Keyed on
  // `open` alone, deliberately - callers pass an inline arrow for `onClose`, so listing
  // it here would tear this down and set it up again on every parent render, each time
  // throwing focus out to the trigger and back to the panel mid-interaction, and
  // recapturing "where focus came from" while it is already inside the dialog.
  useEffect(() => {
    if (!open) return;

    // Read the trigger before anything is inerted: inerting an ancestor of the focused
    // element blurs it, and then there is nothing left to hand focus back to on close.
    const trigger = document.activeElement;
    restoreFocusTo.current = trigger instanceof HTMLElement ? trigger : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const overlay = overlayRef.current;
    const restoreInert = overlay ? inertOutside(overlay) : null;

    // Focus the panel itself rather than its first control: focusing a button can
    // mean Enter immediately activates something the user never chose.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      // Undo inert before restoring focus, never after: focus() on an element inside an
      // inert subtree does nothing at all, and the trigger is one of the things that was
      // just inerted.
      restoreInert?.();
      restoreFocusTo.current?.focus();
    };
  }, [open]);

  // Escape and the Tab trap, kept separate from the lifecycle above so that a fresh
  // `onClose` identity only rebinds a listener instead of redoing focus management.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      // Recomputed on every press because the panel's contents shift underneath it:
      // buttons disable while a request is in flight, rows arrive as activity streams in.
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

      if (items.length === 0) {
        // Nothing inside to land on, so hold the panel rather than let the browser walk
        // out into the page the dialog is covering.
        event.preventDefault();
        panel.focus();
        return;
      }

      // Step by index rather than special-casing the two ends, because focus is often on
      // neither and is not in the list at all: it starts on the panel, which
      // FOCUSABLE_SELECTOR excludes, and a click on the backdrop drops it outside the
      // panel entirely. Both of those read as -1, treated here as sitting one step past
      // whichever end the current direction starts from, so the next step lands inside
      // the dialog either way. Special-casing first and last is what let the very first
      // Shift+Tab after opening escape into the obscured page.
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? items.indexOf(active) : -1;
      const from = index === -1 ? (event.shiftKey ? items.length : -1) : index;
      const next = (from + (event.shiftKey ? -1 : 1) + items.length) % items.length;

      event.preventDefault();
      items[next]?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex" role="presentation">
      <div
        className="animate-fade-in absolute inset-0 bg-[rgb(17_19_24/0.32)] backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'bg-surface relative flex flex-col shadow-lifted outline-none',
          variant === 'center'
            ? 'animate-fade-up rounded-card m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg'
            : 'animate-slide-in-right ml-auto h-full w-[min(26rem,100%)] border-line border-l',
        )}
      >
        <div className="border-line flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id={labelledBy} className="text-ink text-sm font-semibold">
              {title}
            </h2>
            {description ? <p className="text-muted mt-0.5 text-[13px]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-faint hover:text-ink hover:bg-surface-sunken -mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-slim flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer ? <div className="border-line border-t px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
