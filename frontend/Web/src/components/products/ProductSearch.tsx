import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { cn } from '@/lib/cn';
import { Button, Input } from '@/components/ui';

export interface ProductFilters {
  q: string;
  category: string;
  /** Rupees as typed by the user. Converted to minor units at the call site. */
  maxPriceMajor: string;
  inStock: boolean;
}

export const EMPTY_FILTERS: ProductFilters = {
  q: '',
  category: '',
  maxPriceMajor: '',
  inStock: false,
};

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.q.trim() !== '' ||
    filters.category !== '' ||
    filters.maxPriceMajor.trim() !== '' ||
    filters.inStock
  );
}

export function ProductSearch({
  filters,
  onChange,
  resultCount,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
  resultCount?: number;
}) {
  const categories = useCategories();

  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          value={filters.q}
          onChange={(event) => set('q', event.target.value)}
          placeholder="Search the catalogue"
          leading={<Search className="size-4" aria-hidden />}
          aria-label="Search products"
          className="flex-1"
          trailing={
            filters.q ? (
              <button
                type="button"
                onClick={() => set('q', '')}
                aria-label="Clear search"
                className="hover:text-ink transition-colors"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : undefined
          }
        />

        <Input
          value={filters.maxPriceMajor}
          onChange={(event) =>
            // Digits only. The API takes an integer in minor units, and letting a
            // stray character through would send `maxPrice=NaN`.
            set('maxPriceMajor', event.target.value.replace(/[^\d]/g, ''))
          }
          placeholder="Max price"
          inputMode="numeric"
          leading={<span className="text-[13px]">₹</span>}
          aria-label="Maximum price in rupees"
          className="sm:w-40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="text-faint size-3.5 shrink-0" aria-hidden />

        <button
          type="button"
          onClick={() => set('category', '')}
          aria-pressed={filters.category === ''}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
            filters.category === ''
              ? 'border-accent-200 bg-accent-50 text-accent-700'
              : 'border-line text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          All
        </button>

        {(categories.data ?? []).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => set('category', category)}
            aria-pressed={filters.category === category}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12px] font-medium capitalize transition-colors',
              filters.category === category
                ? 'border-accent-200 bg-accent-50 text-accent-700'
                : 'border-line text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {category}
          </button>
        ))}

        <label className="text-muted ml-1 flex cursor-pointer items-center gap-1.5 text-[12px] font-medium select-none">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => set('inStock', event.target.checked)}
            className="accent-accent size-3.5 rounded"
          />
          In stock only
        </label>

        <div className="ml-auto flex items-center gap-2">
          {typeof resultCount === 'number' ? (
            <span className="text-faint nums text-[12px]">
              {resultCount} {resultCount === 1 ? 'product' : 'products'}
            </span>
          ) : null}
          {hasActiveFilters(filters) ? (
            <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
