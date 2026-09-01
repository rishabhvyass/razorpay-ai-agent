import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, PackageX } from 'lucide-react';
import { formatMinor } from '@/lib/money';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import type { Product } from '@/types';

/**
 * Product image with a graceful fallback.
 *
 * Catalogue rows have a nullable `imageUrl`, and seeded demo data often points at
 * URLs that no longer resolve. A broken-image glyph in a card that otherwise looks
 * finished reads as a bug; a deliberate placeholder reads as missing data.
 */
export function ProductImage({
  product,
  className,
  hoverZoom = false,
}: {
  product: Product;
  className?: string;
  /**
   * Enlarge by 3% while an ancestor `group` is hovered (spec sections 15 and 17).
   *
   * Opt-in rather than automatic, because it is a signal that the card leads somewhere
   * - an image that moves under the cursor on a card with nothing to open is decoration.
   * It is a scale on the image inside a clipped box, not a shared-element transition:
   * the image does not travel to the next screen, because it would have to be the same
   * element in both, and it is not.
   */
  hoverZoom?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !failed;

  return (
    <div className={cn('bg-surface-sunken relative overflow-hidden', className)}>
      {showImage ? (
        <img
          src={product.imageUrl ?? ''}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            'size-full object-cover',
            hoverZoom &&
              'motion-normal transition-transform motion-safe:group-hover:scale-[1.03]',
          )}
        />
      ) : (
        <div className="text-faint grid size-full place-items-center">
          <ImageOff className="size-5" aria-hidden />
          <span className="sr-only">No image available</span>
        </div>
      )}
    </div>
  );
}

/** Stock is a real constraint on whether a purchase can proceed, so it is explicit. */
export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <Badge tone="danger" icon={<PackageX className="size-3" aria-hidden />}>
        Out of stock
      </Badge>
    );
  }
  if (stock <= 5) {
    return <Badge tone="warning">Only {stock} left</Badge>;
  }
  return <Badge tone="neutral">In stock</Badge>;
}

export function ProductCard({
  product,
  action,
  compact = false,
  to,
}: {
  product: Product;
  /** Rendered in the card footer. The card itself never initiates a purchase. */
  action?: React.ReactNode;
  compact?: boolean;
  /**
   * Makes the whole card open a destination. Opt-in, because the same card renders
   * inside the conversation, where a stray click must not take the user out of it.
   */
  to?: string;
}) {
  return (
    <article
      className={cn(
        // A colour block that intensifies on hover. No shadow: depth is not what tells
        // you a card is interactive here, the colour shift and the 1% scale are. The
        // scale is `motion-safe:` because it is decoration; the colour shift is not, and
        // a reader who asked for less movement still gets the hover feedback.
        'rounded-card border-line bg-surface motion-micro group relative flex overflow-hidden border transition-[background-color,border-color,transform]',
        to && 'hover:border-line-strong hover:bg-surface-subtle motion-safe:hover:scale-[1.01]',
        compact ? 'gap-3 p-3' : 'flex-col',
      )}
    >
      <ProductImage
        product={product}
        hoverZoom={Boolean(to)}
        className={cn(compact ? 'rounded-control size-16 shrink-0' : 'aspect-4/3 w-full')}
      />

      <div className={cn('flex min-w-0 flex-1 flex-col', compact ? '' : 'p-5')}>
        <div className="min-w-0 flex-1">
          {product.category ? (
            <p className="text-faint truncate text-[10px] font-bold tracking-[0.1em] uppercase">
              {product.category}
            </p>
          ) : null}
          <h3
            className={cn(
              'text-ink mt-1 leading-snug font-bold tracking-[-0.01em]',
              compact ? 'truncate text-[13px]' : 'line-clamp-2 text-[15px]',
            )}
            title={product.name}
          >
            {to ? (
              // The pseudo-element covers the card so the whole block is the target,
              // while the real link stays on the title - which is what a screen reader
              // should read out, and what the status bar should show.
              <Link
                to={to}
                className="rounded-control after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
              >
                {product.name}
              </Link>
            ) : (
              product.name
            )}
          </h3>
          {!compact && product.description ? (
            <p className="text-muted mt-2 line-clamp-2 text-[12px] leading-relaxed">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className={cn('flex items-center justify-between gap-2', compact ? 'mt-2' : 'mt-4')}>
          {/* Minor units in, formatted once, in lib/money. The price is the largest
              thing in the card after the image: it is what the decision turns on. */}
          <span
            className={cn('text-ink nums font-bold tracking-[-0.02em]', compact ? 'text-[15px]' : 'text-[19px]')}
          >
            {formatMinor(product.price, product.currency)}
          </span>
          <StockBadge stock={product.stock} />
        </div>

        {/* Above the overlay, so a button in the footer still receives its own click. */}
        {action ? <div className={cn('relative z-10', compact ? 'mt-3' : 'mt-4')}>{action}</div> : null}
      </div>
    </article>
  );
}
