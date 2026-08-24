import { useState } from 'react';
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
function ProductImage({ product, className }: { product: Product; className?: string }) {
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
          className="size-full object-cover"
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
}: {
  product: Product;
  /** Rendered in the card footer. The card itself never initiates a purchase. */
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-card border-line bg-surface hover:border-line-strong group flex overflow-hidden border transition-all duration-200 hover:shadow-card',
        compact ? 'gap-3 p-3' : 'flex-col',
      )}
    >
      <ProductImage
        product={product}
        className={cn(
          compact ? 'size-16 shrink-0 rounded-lg' : 'aspect-4/3 w-full',
        )}
      />

      <div className={cn('flex min-w-0 flex-1 flex-col', compact ? '' : 'p-4')}>
        <div className="min-w-0 flex-1">
          {product.category ? (
            <p className="text-faint truncate text-[11px] font-medium tracking-wide uppercase">
              {product.category}
            </p>
          ) : null}
          <h3
            className={cn(
              'text-ink mt-0.5 leading-snug font-semibold',
              compact ? 'truncate text-[13px]' : 'line-clamp-2 text-sm',
            )}
            title={product.name}
          >
            {product.name}
          </h3>
          {!compact && product.description ? (
            <p className="text-muted mt-1.5 line-clamp-2 text-[12px] leading-relaxed">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className={cn('flex items-center justify-between gap-2', compact ? 'mt-1.5' : 'mt-3')}>
          {/* Minor units in, formatted once, in lib/money. */}
          <span className="text-ink nums text-[15px] font-semibold">
            {formatMinor(product.price, product.currency)}
          </span>
          <StockBadge stock={product.stock} />
        </div>

        {action ? <div className={compact ? 'mt-2.5' : 'mt-3.5'}>{action}</div> : null}
      </div>
    </article>
  );
}
