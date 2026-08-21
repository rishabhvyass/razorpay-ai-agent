/**
 * Products. Backed by real, implemented endpoints:
 *
 *   GET /api/products             search / list the active catalogue
 *   GET /api/products/categories  distinct categories
 *   GET /api/products/:id         one product
 *
 * Price filters go over the wire in MINOR units (`maxPrice=200000`). The backend
 * also accepts `maxPriceRupees=2000` for URLs a human typed, but the frontend
 * always sends minor units - one unit convention, converted once, in lib/money.
 */

import { request, requestEnvelope } from './api';
import type { Product, ProductSearchParams } from '@/types';

export interface ProductSearchResult {
  products: Product[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export async function searchProducts(
  params: ProductSearchParams = {},
  signal?: AbortSignal,
): Promise<ProductSearchResult> {
  const envelope = await requestEnvelope<Product[]>('/api/products', {
    signal,
    query: {
      q: params.q,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      // Only send `inStock` when filtering. Sending `false` explicitly is
      // harmless but adds noise to the meta.filters echo the UI displays.
      inStock: params.inStock ? true : undefined,
      limit: params.limit,
      offset: params.offset,
    },
  });

  const meta = envelope.meta as ProductSearchResult['meta'] | undefined;

  return {
    products: envelope.data ?? [],
    meta: {
      count: meta?.count ?? envelope.data?.length ?? 0,
      limit: meta?.limit ?? 20,
      offset: meta?.offset ?? 0,
    },
  };
}

export function getCategories(signal?: AbortSignal): Promise<string[]> {
  return request<string[]>('/api/products/categories', { signal });
}

export function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return request<Product>(`/api/products/${id}`, { signal });
}
