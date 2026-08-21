/**
 * Product repository.
 *
 * Deterministic catalogue search. No embeddings, no model call, no ranking by
 * anything a model produced.
 *
 * That is a deliberate architectural choice, not a placeholder. When the MCP
 * layer arrives, the agent will *call* this function rather than search on its
 * own. Which means:
 *
 *   - The same query returns the same products every time, so a demo is
 *     reproducible and a test can assert on results.
 *   - The agent cannot invent a product or a price. It can only report rows this
 *     function returned.
 *
 * Semantic search can be layered on later as a separate ranking pass over these
 * results. It should not replace them.
 */

import { supabaseAdmin } from '../db/supabase.js';
import type { ProductRow } from '../db/types.js';
import { fromPostgrestError } from '../utils/errors.js';
import { formatMinorUnits } from '../utils/money.js';

const PRODUCT_COLUMNS =
  'id, name, slug, description, category, price, currency, stock, image_url, active, metadata, created_at, updated_at';

export interface ProductSearchFilters {
  /** Free text, matched against name, description and category. */
  query?: string | undefined;
  category?: string | undefined;
  /** Inclusive, minor units. */
  minPrice?: number | undefined;
  /** Inclusive, minor units. */
  maxPrice?: number | undefined;
  /** When true, only rows with stock > 0. */
  inStockOnly?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 100;

/**
 * The shape sent over HTTP and, later, handed to the agent as a tool result.
 *
 * An explicit allowlist rather than a spread of the row. Two reasons: the query
 * runs through the service-role client, so a column added to the table must not
 * appear in a public response by default; and this is the contract the agent will
 * be prompted against, so it should not drift every time the schema does.
 */
export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  /** Minor units. 179900 = Rs 1,799.00. */
  price: number;
  currency: string;
  /** Human-readable, for display and for the agent to quote. */
  priceFormatted: string;
  stock: number;
  inStock: boolean;
  imageUrl: string | null;
  metadata: unknown;
}

export function toPublicProduct(row: ProductRow): PublicProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: row.price,
    currency: row.currency,
    priceFormatted: formatMinorUnits(row.price, row.currency),
    stock: row.stock,
    inStock: row.stock > 0,
    imageUrl: row.image_url,
    metadata: row.metadata,
  };
}

/**
 * Reduce free text to safe search tokens.
 *
 * PostgREST's `or=(...)` parameter is a filter *expression* parsed server-side,
 * not a bound parameter. Interpolating raw user text into it is an injection
 * primitive in the same family as SQL injection: a `,` ends a condition, and
 * `()` nests one. A query of `%,name.neq.zzz` would rewrite the filter.
 *
 * So: lowercase, discard everything that is not a letter, digit or space, and
 * tokenise. Nothing PostgREST or LIKE treats as special survives - including `%`
 * and `_`, which would otherwise be caller-controlled wildcards.
 *
 * Single characters are dropped because `%a%` matches nearly the whole catalogue
 * and contributes no signal.
 */
export function toSearchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 6); // cap the number of ANDed conditions per request
}

/**
 * Escape the three characters SQL LIKE treats as special, for a value that must
 * match literally.
 *
 * `toSearchTokens` protects the free-text path by discarding everything that is
 * not alphanumeric, but a value used as an exact `ilike` pattern keeps its
 * original characters and needs escaping instead. PostgREST honours the SQL
 * standard `ESCAPE '\'`, so `\%`, `\_` and `\\` match those characters literally.
 *
 * Backslash must be replaced first, or it would double-escape the escapes added
 * after it.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT);
}

/**
 * Search active products.
 *
 * Text tokens are ANDed, columns are ORed: "black hoodie" requires both "black"
 * and "hoodie" to appear somewhere in name/description/category. Matching either
 * word alone would return every hoodie and every black item, which reads to a
 * user as the agent ignoring half of what they said.
 *
 * Inactive products are excluded unconditionally. There is no flag to include
 * them - an unsold catalogue row should be unreachable through the agent, not
 * reachable via an option someone might set.
 */
export async function searchProducts(filters: ProductSearchFilters = {}): Promise<PublicProduct[]> {
  const limit = clampLimit(filters.limit);
  const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);

  let request = supabaseAdmin.from('products').select(PRODUCT_COLUMNS).eq('active', true);

  // Branch on the TOKENS, not on the raw string. Those two disagree for any input
  // that is non-empty after trimming but yields no usable tokens - "%", "***",
  // a single character, or a query in a non-Latin script. Testing the raw string
  // would enter this block, loop zero times, attach no predicate, and silently
  // return the entire active catalogue as if it matched. A search that quietly
  // becomes "everything" is worse than one that returns nothing, because the
  // caller cannot tell the difference from a genuine result set.
  if (filters.query !== undefined) {
    const tokens = toSearchTokens(filters.query);

    if (tokens.length === 0 && filters.query.trim() !== '') {
      // Asked for something specific, and nothing searchable survived. The honest
      // answer is no matches.
      return [];
    }

    for (const token of tokens) {
      // Each .or() is a separate `or=` parameter, and PostgREST ANDs top-level
      // parameters - which gives token-AND / column-OR without a raw SQL string.
      request = request.or(
        `name.ilike.%${token}%,description.ilike.%${token}%,category.ilike.%${token}%`,
      );
    }
  }

  if (filters.category !== undefined && filters.category.trim() !== '') {
    // Exact, case-insensitive match on a controlled vocabulary.
    //
    // The pattern is escaped first. postgrest-js interpolates the value into
    // `category=ilike.<value>` verbatim, and PostgREST hands it to SQL LIKE - so
    // an unescaped `%` or `_` from the caller is a live wildcard, and `?category=%`
    // would match every category rather than none. Escaping keeps the promise the
    // signature makes: "shoes" matches "shoes", never "dress shoes accessories".
    request = request.ilike('category', escapeLikePattern(filters.category.trim()));
  }

  if (filters.minPrice !== undefined) {
    request = request.gte('price', Math.max(Math.trunc(filters.minPrice), 0));
  }

  if (filters.maxPrice !== undefined) {
    request = request.lte('price', Math.max(Math.trunc(filters.maxPrice), 0));
  }

  if (filters.inStockOnly === true) {
    request = request.gt('stock', 0);
  }

  // Stable ordering. price first because the common query is budget-shaped
  // ("under Rs 2,000"); id breaks ties so pagination cannot repeat or skip a row.
  const { data, error } = await request
    .order('price', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'searchProducts' });
  }

  return (data ?? []).map(toPublicProduct);
}

/** All active products, price ascending. */
export async function getActiveProducts(limit?: number, offset = 0): Promise<PublicProduct[]> {
  return searchProducts({ limit, offset });
}

/**
 * Look up one product by id.
 *
 * Returns null rather than throwing when the row is absent: "not found" is an
 * expected answer to a lookup, and it is the caller - the route, or the MCP tool -
 * that knows whether that deserves a 404 or a "we do not carry that" sentence.
 *
 * Inactive products are excluded here too, so a stale link cannot be used to
 * order something withdrawn from sale.
 */
export async function getProductById(id: string): Promise<PublicProduct | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getProductById', notFoundCode: 'PRODUCT_NOT_FOUND' });
  }

  return data === null ? null : toPublicProduct(data);
}

/** Look up one active product by slug. */
export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'getProductBySlug',
      notFoundCode: 'PRODUCT_NOT_FOUND',
    });
  }

  return data === null ? null : toPublicProduct(data);
}

/**
 * Full row, including `active` and `stock`, for trusted internal callers.
 *
 * Order creation must use this rather than `getProductById`, because the price
 * that goes onto an order has to come from the database at that moment - never
 * from a client, and never from something the agent typed into a tool argument.
 */
export async function getProductRowForOrder(id: string): Promise<ProductRow | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, {
      operation: 'getProductRowForOrder',
      notFoundCode: 'PRODUCT_NOT_FOUND',
    });
  }

  return data;
}

/** Distinct categories present in the active catalogue, for filter UIs. */
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('category')
    .eq('active', true)
    .not('category', 'is', null);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getCategories' });
  }

  const unique = new Set<string>();
  for (const row of data ?? []) {
    if (row.category !== null) unique.add(row.category);
  }

  return [...unique].sort();
}
