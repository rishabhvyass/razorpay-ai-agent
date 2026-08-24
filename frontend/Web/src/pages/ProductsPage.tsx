import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { ProductGrid } from '@/components/products/ProductGrid';
import {
  EMPTY_FILTERS,
  ProductSearch,
  type ProductFilters,
} from '@/components/products/ProductSearch';
import { Button } from '@/components/ui';
import { useProducts } from '@/hooks/useProducts';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { majorToMinor } from '@/lib/money';
import type { ProductSearchParams } from '@/types';

/**
 * The catalogue, browsable directly.
 *
 * Everything here comes from `GET /api/products` - the same endpoint the agent
 * calls. There is no separate hardcoded product list anywhere in this app, so what
 * the user browses and what the agent recommends cannot drift apart.
 */
export function ProductsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);

  // Debounce the text and price so typing does not fire a request per keystroke.
  const debouncedQuery = useDebouncedValue(filters.q, 300);
  const debouncedMaxPrice = useDebouncedValue(filters.maxPriceMajor, 400);

  const params: ProductSearchParams = {
    ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    // Rupees the user typed -> minor units for the API. Single conversion point.
    ...(debouncedMaxPrice.trim()
      ? { maxPrice: majorToMinor(Number(debouncedMaxPrice)) }
      : {}),
    ...(filters.inStock ? { inStock: true } : {}),
    limit: 24,
  };

  const products = useProducts(params);

  return (
    <Page
      title="Products"
      description="Structured catalog available to the AI commerce agent."
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void navigate('/checkout')}
          icon={<MessagesSquare className="size-3.5" aria-hidden />}
        >
          <span className="hidden sm:inline">Ask the agent</span>
          <span className="sm:hidden">Agent</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <ProductSearch
          filters={filters}
          onChange={setFilters}
          {...(products.data ? { resultCount: products.data.products.length } : {})}
        />

        <ProductGrid
          products={products.data?.products}
          isPending={products.isPending}
          error={products.error}
          onRetry={() => void products.refetch()}
          emptyAction={
            <Button size="sm" variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          }
          renderAction={(product) => (
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              disabled={product.stock < 1}
              onClick={() =>
                // Browsing hands off to the conversation rather than starting a
                // purchase. The authorisation step is not optional, and it lives in
                // the chat.
                void navigate('/checkout')
              }
            >
              {product.stock < 1 ? 'Out of stock' : 'Buy via the agent'}
            </Button>
          )}
        />
      </div>
    </Page>
  );
}
