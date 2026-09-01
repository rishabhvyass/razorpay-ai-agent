import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * The Mercora mark.
 *
 * A filled blue square with an angular M and a single vertical bar beside it. The bar
 * is the product's argument compressed into the logo: the agent proposes, and then it
 * stops at a gate. Geometric strokes only - no gradient, no glyph made of a webfont
 * letter that shifts if Outfit fails to load.
 */
export function MercoraGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-full', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      <path d="M4 18V6.5L9.5 12.5L15 6.5V18" />
      <path d="M19.5 6.5V18" strokeWidth={2.5} />
    </svg>
  );
}

export function MercoraMark({
  tagline = true,
  to = '/dashboard',
  className,
  labelClassName,
}: {
  /** The rail shows it; a 375px top bar does not have the room. */
  tagline?: boolean;
  to?: string | null;
  className?: string;
  /**
   * Applied to the wordmark block only. The collapsing rail uses it to fade and
   * narrow the words while the glyph stays exactly where it is, which is why this
   * exists instead of a second, glyph-only copy of the mark.
   */
  labelClassName?: string;
}) {
  const content = (
    <>
      <span className="bg-brand-blue grid size-9 shrink-0 place-items-center rounded-control p-1.5 text-white">
        <MercoraGlyph />
      </span>
      <span className={cn('min-w-0', labelClassName)}>
        {/* 800 and -0.02em: the wordmark is set the way the spec sets headings, so the
            brand and the product's typography are the same decision. */}
        <span className="text-ink block text-[17px] leading-none font-extrabold tracking-[-0.02em]">
          Mercora
        </span>
        {tagline ? (
          // Not truncated: a tagline cut to "Make merchants AI-transacta…" reads as a
          // layout bug, and the rail has the room for it at this size.
          <span className="text-muted mt-1 block text-[10px] leading-[1.25] font-semibold">
            Make merchants AI-transactable
          </span>
        ) : null}
      </span>
    </>
  );

  if (!to) {
    return <span className={cn('flex items-center gap-2.5', className)}>{content}</span>;
  }

  return (
    <Link
      to={to}
      aria-label="Mercora — home"
      className={cn(
        'motion-fast flex items-center gap-2.5 rounded-control transition-opacity hover:opacity-80',
        className,
      )}
    >
      {content}
    </Link>
  );
}
