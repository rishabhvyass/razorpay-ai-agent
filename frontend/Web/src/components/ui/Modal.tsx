import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration } from '@/lib/motion';

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
  side = 'right',
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
  /** Drawers can enter from the edge where their trigger lives. */
  side?: 'left' | 'right';
  labelledBy?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  /**
   * Closing is a state, not just the absence of open (spec section 21).
   *
   * `open: false` used to return `null` on the next render, so a dialog vanished on the
   * frame the user dismissed it - the one moment when a little continuity is worth
   * having, because it shows where the panel went and hands the page back rather than
   * cutting to it. So the panel is held in the DOM for exactly the length of the exit
   * animation and plays it, then unmounts.
   *
   * The length comes from `duration('micro')`, which reads the same token the CSS
   * animation uses, so the timer cannot drift from the keyframes. Under reduced motion
   * that token reads 0 and this collapses back to the old immediate unmount, which is
   * the correct behaviour there rather than a compromise.
   *
   * Everything else - focus restoration, un-inerting the page, the scroll lock - stays
   * keyed to `open` and therefore happens immediately. A leaving panel must not hold
   * the keyboard, so the pointer is taken off it below.
   *
   * Only one piece of state, and `closing` is derived rather than stored: a panel is
   * leaving exactly when it is still mounted and no longer open. The one transition
   * that cannot be derived - dropping out of the DOM once the animation is over - is
   * made from the timer callback, which is the only place a state change belongs in an
   * effect.
   */
  const [rendered, setRendered] = useState(open);

  // Opening is adjusted during render, not in an effect: an effect would paint one
  // frame with the panel absent and start the entrance animation on the frame after,
  // which is a visible hitch at the exact moment the reader asked for the dialog.
  if (open && !rendered) setRendered(true);
  const closing = rendered && !open;

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(() => setRendered(false), duration('micro'));
    return () => window.clearTimeout(timer);
  }, [closing]);

  /**
   * Where focus was before the panel took it.
   *
   * This used to be read at the top of the open/close effect below, which is one commit
   * too late. A child rendered with `autoFocus` - the assistant drawer's composer is one
   * - is focused by React while the panel is still being committed, and every effect runs
   * after that. So the element recorded as "the trigger" was a control inside the dialog,
   * and closing handed focus back to something that was about to unmount, which dropped
   * the keyboard on `<body>`: Tab then restarted from the top of the page instead of
   * carrying on beside the launcher.
   *
   * Watching `focusin` records the answer before the panel exists to overwrite it. Three
   * targets are deliberately not treated as triggers: `<body>`, which is where the browser
   * parks focus when `inertOutside` blurs the real trigger a moment later; anything inside
   * this dialog's own overlay; and anything inside any open dialog panel, which is what
   * actually catches the `autoFocus` case - `overlayRef` is attached later in the same
   * commit than a child's `autoFocus` runs, so the containment check alone cannot see the
   * one event that started this. `[aria-modal]` is in the DOM by then either way.
   *
   * The cost of reading it that way is that a dialog opened by a control inside another
   * dialog has no trigger recorded for it. Nothing in this app nests dialogs, and the
   * restore below degrades to leaving focus where it is rather than throwing it somewhere
   * wrong.
   */
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === document.body) return;
      if (overlayRef.current?.contains(target)) return;
      if (target.closest('[aria-modal="true"]')) return;

      restoreFocusTo.current = target;
    };

    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  // Open and close: scroll lock, the inert background, and the focus handover. Keyed on
  // `open` alone, deliberately - callers pass an inline arrow for `onClose`, so listing
  // it here would tear this down and set it up again on every parent render, each time
  // throwing focus out to the trigger and back to the panel mid-interaction.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const overlay = overlayRef.current;
    const restoreInert = overlay ? inertOutside(overlay) : null;

    // Focus the panel itself rather than its first control: focusing a button can
    // mean Enter immediately activates something the user never chose. A child that
    // asks for focus outright, like the drawer's composer, still gets it - a text
    // field carries none of that hazard.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      // Undo inert before restoring focus, never after: focus() on an element inside an
      // inert subtree does nothing at all, and the trigger is one of the things that was
      // just inerted.
      restoreInert?.();
      // A trigger can also be gone by now - a table row that has since re-rendered, an
      // item in a menu that closed behind the dialog - and focusing a detached node does
      // nothing at all, which reads as focus vanishing rather than returning. Better to
      // leave it where it is than to move it nowhere.
      const trigger = restoreFocusTo.current;
      if (trigger?.isConnected) trigger.focus();
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

  if (!rendered) return null;

  return (
    <div
      ref={overlayRef}
      className={cn('fixed inset-0 z-50 flex', closing && 'pointer-events-none')}
      role="presentation"
    >
      {/* A flat scrim. No backdrop blur: the point is to remove the page behind from
          consideration, not to render frosted glass over it. */}
      <div
        className={cn(
          'absolute inset-0 bg-[rgb(17_24_39/0.45)]',
          closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
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
          'bg-surface border-line relative flex flex-col border shadow-none outline-none',
          variant === 'center'
            ? // Below 640px a centred dialog is a bottom sheet: full width, pinned to
              // the bottom edge, square at the bottom because there is no canvas
              // beneath it to round against. This is the approval gate's mobile form.
              // `animate-dialog-*` carries that same split in its motion - a sheet
              // slides, a panel scales - so this element only says which direction
              // the dialog is going.
              cn(
                'mt-auto max-h-[88vh] w-full rounded-t-2xl sm:m-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-card',
                closing ? 'animate-dialog-out' : 'animate-dialog-in',
              )
            : cn(
                'h-full w-[min(26rem,100%)]',
                side === 'left'
                  ? cn('mr-auto', closing ? 'animate-slide-out-left' : 'animate-slide-in-left')
                  : cn('ml-auto', closing ? 'animate-slide-out-right' : 'animate-slide-in-right'),
              ),
        )}
      >
        <div className="border-line flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id={labelledBy} className="text-ink text-[15px] font-bold">
              {title}
            </h2>
            {description ? (
              <p className="text-muted mt-1 text-[13px] leading-relaxed">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-faint hover:bg-surface-sunken hover:text-ink rounded-control motion-fast -mr-2 -mt-1 grid size-11 shrink-0 place-items-center transition-colors"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-slim flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer ? <div className="border-line border-t px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
