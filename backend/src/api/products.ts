/**
 * Product routes. Mounted at `/api/products`.
 *
 *   GET /api/products              search / list the active catalogue
 *   GET /api/products/categories   distinct categories
 *   GET /api/products/:id          one product by id
 *
 * `/categories` is declared before `/:id` because Express matches in declaration
 * order - the other way round, "categories" would be captured as an id.
 *
 * Every query parameter is validated by Zod before it reaches a repository.
 * Rejecting a malformed `maxPrice` at the edge is what keeps the repositories
 * free of defensive parsing, and it means the deterministic search receives
 * numbers rather than strings that happen to look like numbers.
 */

import { Router } from 'express';
import { z } from 'zod';

import { getCategories, getProductById, searchProducts } from '../repositories/productRepo.js';
import { badRequest, notFound } from '../utils/errors.js';
import { MAX_AMOUNT_MINOR, parseMajorToMinor } from '../utils/money.js';

export const productsRouter = Router();

/** `?inStock=true` and `?inStock=1` both mean true. Anything else is an error. */
const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/**
 * Price filters accept minor units (`maxPrice=200000`) or, for convenience from a
 * URL a human typed, major units (`maxPriceRupees=2000`).
 *
 * Both are offered because the mismatch between them is the single easiest way to
 * be wrong by a factor of 100, and a filter that is silently 100x off returns a
 * plausible-looking wrong answer rather than an error. Naming the unit in the
 * parameter makes the intent explicit at the call site.
 *
 * The minor-unit filters are capped at MAX_AMOUNT_MINOR, not merely at
 * `.int().min(0)`. Zod's `.int()` accepts anything up to Number.MAX_SAFE_INTEGER,
 * but `products.price` is a Postgres INTEGER: a larger value reaches PostgREST as
 * a filter literal Postgres cannot cast, raising an unmapped SQLSTATE that becomes
 * a 500 for what is plainly a bad request. Bounding it here keeps the fault where
 * it belongs, at the edge, as a 400.
 */
const searchQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    search: z.string().trim().max(200).optional(),
    category: z.string().trim().max(60).optional(),
    minPrice: z.coerce.number().int().min(0).max(MAX_AMOUNT_MINOR).optional(),
    maxPrice: z.coerce.number().int().min(0).max(MAX_AMOUNT_MINOR).optional(),
    minPriceRupees: z.string().trim().max(20).optional(),
    maxPriceRupees: z.string().trim().max(20).optional(),
    inStock: booleanish.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const idParamSchema = z.object({
  id: z.uuid({ error: 'Product id must be a UUID.' }),
});

function rupeesToMinor(value: string | undefined, field: string): number | undefined {
  if (value === undefined) return undefined;
  try {
    return parseMajorToMinor(value, 'INR');
  } catch {
    throw badRequest('VALIDATION_ERROR', `${field} is not a valid rupee amount.`, { field, value });
  }
}

productsRouter.get('/', async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid search parameters.', {
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
  }

  const query = parsed.data;

  // `q` is the short form; `search` is accepted as an alias so a caller does not
  // have to guess which one this API chose.
  const text = query.q ?? query.search;

  const minPrice = query.minPrice ?? rupeesToMinor(query.minPriceRupees, 'minPriceRupees');
  const maxPrice = query.maxPrice ?? rupeesToMinor(query.maxPriceRupees, 'maxPriceRupees');

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw badRequest('VALIDATION_ERROR', 'minPrice cannot be greater than maxPrice.', {
      minPrice,
      maxPrice,
    });
  }

  const products = await searchProducts({
    query: text,
    category: query.category,
    minPrice,
    maxPrice,
    inStockOnly: query.inStock,
    limit: query.limit,
    offset: query.offset,
  });

  res.json({
    data: products,
    meta: {
      count: products.length,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      filters: {
        query: text ?? null,
        category: query.category ?? null,
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
        inStockOnly: query.inStock ?? false,
      },
    },
    requestId: req.requestId,
  });
});

productsRouter.get('/categories', async (req, res) => {
  const categories = await getCategories();
  res.json({ data: categories, requestId: req.requestId });
});

productsRouter.get('/:id', async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw badRequest('INVALID_UUID', 'Product id must be a UUID.');
  }

  const product = await getProductById(parsed.data.id);

  if (product === null) {
    // Also the answer for an inactive product: a withdrawn item should be
    // indistinguishable from one that never existed.
    throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
  }

  res.json({ data: product, requestId: req.requestId });
});
