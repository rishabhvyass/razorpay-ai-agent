import { PackageSearch } from 'lucide-react';
import { EmptyState, ErrorState, ProductCardSkeleton } from '@/components/ui';
import { SlideUp } from '@/components/motion';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

export function ProductGrid({
  products,
  isPending,
  error,
  onRetry,
  renderAction,
  linkTo,
  emptyTitle = 'No products match those filters',
  emptyDescription = 'Try widening the price range, clearing the category, or searching for a different term.',
  emptyAction,
  skeletonCount = 6,
}: {
  products: Product[] | undefined;
  isPending: boolean;
  error?: unknown;
  onRetry?: () => void;
  renderAction?: (product: Product) => React.ReactNode;
  /** Where each card opens. Omitted, the cards are inert blocks. */
  linkTo?: (product: Product) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  skeletonCount?: number;
}) {
  if (error) {
    return <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />;
  }

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-card bg-surface-sunken">
        <EmptyState
          icon={<PackageSearch className="size-5" aria-hidden />}
          title={emptyTitle}
          description={emptyDescription}
          {...(emptyAction ? { action: emptyAction } : {})}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        /*
          Spec section 14: the grid arrives in sequence rather than all at once, stepped
          by the shared 50ms and capped in CSS so the tenth card is not still waiting.

          The entrance is on a wrapper rather than on the card, which is the one case the
          motion primitives' own note allows. A finished CSS animation with
          `animation-fill-mode: both` keeps its final `transform` applied, and an animated
          transform outranks every declaration - so an entrance on the article itself
          would permanently win over the card's `hover:scale-[1.01]` and silently kill it.
          The wrapper animates, the card keeps its hover, and `h-full` on both preserves
          the equal-height rows the grid had when the article was the grid item.

          Section 19 is handled a layer up rather than here: `useProducts` holds the
          previous page of results as placeholder data, so a new search keeps `isPending`
          false and the grid never blinks through the skeleton state. Cards already on
          screen keep the animation they finished; only genuinely new keys animate.
        */
        <SlideUp key={product.id} index={index} className="h-full [&>article]:h-full">
          <ProductCard
            product={product}
            {...(renderAction ? { action: renderAction(product) } : {})}
            {...(linkTo ? { to: linkTo(product) } : {})}
          />
        </SlideUp>
      ))}
    </div>
  );
}
