import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Modal / drawer.
 *
 * Hand-rolled rather than pulled from a dependency (spec section 34: no unnecessary
 * packages), so it has to earn that by getting the accessibility right: Escape
 * closes, focus moves into the panel on open and returns to the trigger on close,
 * Tab is trapped inside, and the backdrop is inert to scroll.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Focus the panel itself rather than its first control: focusing a button can
    // mean Enter immediately activates something the user never chose.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="presentation">
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

        <div className="scrollbar-slim flex-1 overflow-y-auto">{children}</div>

        {footer ? <div className="border-line border-t px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
