/**
 * Product domain types matching backend `PublicProduct`.
 *
 * All prices are integers in minor units (paise for INR).
 * 149900 = ₹1,499.00
 */

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  /** Minor units (e.g. 149900 for ₹1,499.00) */
  price: number;
  currency: string;
  /** Server formatted string (e.g. "₹1,499.00") */
  priceFormatted?: string;
  stock?: number;
  inStock: boolean;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProductSearchParams {
  q?: string;
  category?: string;
  minPrice?: number; // minor units
  maxPrice?: number; // minor units
  inStock?: boolean;
  limit?: number;
  offset?: number;
}
