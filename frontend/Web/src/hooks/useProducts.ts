import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getCategories, getProduct, searchProducts } from '@/services/productService';
import type { ProductSearchParams } from '@/types';

export function useProducts(params: ProductSearchParams = {}) {
  return useQuery({
    queryKey: qk.products.list(params),
    queryFn: ({ signal }) => searchProducts(params, signal),
    // Keep the previous page visible while the next one loads, so a filter change
    // does not blank the grid.
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: qk.products.categories,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 5 * 60_000,
  });
}

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.products.detail(id ?? ''),
    queryFn: ({ signal }) => getProduct(id!, signal),
    enabled: Boolean(id),
  });
}
