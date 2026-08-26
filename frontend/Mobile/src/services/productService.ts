import { get } from './api';
import { Product, ProductSearchParams } from '../types';

export const productService = {
  async getProducts(params?: ProductSearchParams): Promise<Product[]> {
    return get<Product[]>('/api/products', { params });
  },

  async getProductById(id: string): Promise<Product> {
    return get<Product>(`/api/products/${id}`);
  },

  async getCategories(): Promise<string[]> {
    return get<string[]>('/api/products/categories');
  },
};
