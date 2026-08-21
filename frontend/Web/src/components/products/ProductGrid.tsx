import { PackageSearch } from 'lucide-react';
import { EmptyState, ErrorState, ProductCardSkeleton } from '@/components/ui';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

export function ProductGrid({
  products,
  isPending,
  error,
  onRetry,
  renderAction,
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
      <div className="rounded-card border-line bg-surface border">
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
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          {...(renderAction ? { action: renderAction(product) } : {})}
        />
      ))}
    </div>
  );
}
