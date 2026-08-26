import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { ProductSearchParams } from '../types';

export function useProducts(params?: ProductSearchParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getProducts(params),
    staleTime: 60 * 1000,
  });
}

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => (id ? productService.getProductById(id) : null),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}
