/**
 * Domain types.
 *
 * MONEY: every amount is an integer in MINOR UNITS (paise for INR).
 * 149900 = Rs 1,499.00. There is no float anywhere in this file, and nothing in
 * the app divides by 100 except lib/money.ts. Getting this wrong is a silent
 * 100x error that still renders plausibly, which is why the unit is in the name
 * of every helper that touches it.
 */

// -----------------------------------------------------------------------------
// Response envelopes
//
// Success: { data, meta?, requestId }
// Failure: { error: { code, message, requestId, details? } }
// -----------------------------------------------------------------------------

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface ApiListEnvelope<T> {
  data: T[];
  meta: {
    count: number;
    limit: number;
    offset: number;
    filters?: Record<string, unknown>;
  };
  requestId: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

// -----------------------------------------------------------------------------
// Status unions - mirror the CHECK constraints in
// backend/supabase/migrations/001_initial_schema.sql
// -----------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'PENDING_CONFIRMATION',
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CONVERSATION_STATUSES = ['active', 'completed', 'archived'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const AGENT_ACTION_STATUSES = ['started', 'success', 'failed', 'blocked'] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

/** MONEY_ACTION is the class that requires explicit user approval. */
export const AGENT_ACTION_TYPES = [
  'READ_ACTION',
  'WRITE_ACTION',
  'MONEY_ACTION',
  'SYSTEM_ACTION',
] as const;
export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

// -----------------------------------------------------------------------------
// Entities, as the backend actually serialises them
//
// CRITICAL: these mirror the `Public*` interfaces in backend/src/repositories/,
// NOT the Postgres row types in backend/src/db/types.ts. The table columns are
// snake_case; every route serialises through a `toPublic*` function that renames
// them to camelCase and drops the columns that must not leave the server.
//
// Typing against the row shape instead of the wire shape is a defect that renders
// as a page full of em-dashes rather than as an error, because every renamed field
// simply arrives `undefined` and every `?? '-'` fallback absorbs it. That is why
// services/decode.ts checks these shapes at runtime: a mismatch has to be loud,
// because a UI that quietly reports "no value" for a field the server did send is
// misrepresenting the server.
//
// Source of truth, field for field:
//   Product      backend/src/repositories/productRepo.ts      -> PublicProduct
//   Conversation backend/src/repositories/conversationRepo.ts -> PublicConversation
//   Message      backend/src/repositories/messageRepo.ts      -> PublicMessage
//   Order        backend/src/repositories/orderRepo.ts        -> PublicOrder
//   AgentAction  backend/src/repositories/agentActionRepo.ts  -> PublicAgentAction
// -----------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  /** Minor units. 149900 = Rs 1,499.00. */
  price: number;
  currency: string;
  /** The backend's own formatted string, for display and for the agent to quote. */
  priceFormatted: string;
  stock: number;
  /** Server-derived (`stock > 0`). Not recomputed here - the server decides. */
  inStock: boolean;
  imageUrl: string | null;
  /** Open JSONB bag. Typed `unknown` because the server types it `unknown`. */
  metadata: unknown;
}

/**
 * Note what is absent: `metadata`. The conversations table has the column, but
 * `toPublicConversation` does not serialise it, so it is not on the wire and
 * declaring it here would be inventing a field.
 */
export interface Conversation {
  id: string;
  userId: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: unknown;
  createdAt: string;
}

/**
 * An order as the API returns it.
 *
 * Two columns exist on the table and are deliberately NOT serialised, so they are
 * deliberately not declared here either:
 *
 *   idempotency_key - a caller-chosen dedup token. Echoing it back would let one
 *                     client discover another caller's key.
 *   metadata        - an open JSONB bag the payments layer fills with provider
 *                     detail, read through a service-role query. Not safe to expose
 *                     wholesale.
 *
 * `amount` is the authoritative figure, in minor units, computed server-side from
 * the product row. `amountFormatted` is the server's own rendering of it.
 */
export interface Order {
  id: string;
  userId: string | null;
  conversationId: string | null;
  productId: string;
  quantity: number;
  /** Total in minor units, computed server-side. Never client-supplied. */
  amount: number;
  currency: string;
  /** The trusted backend's own formatted total. */
  amountFormatted: string;
  status: OrderStatus;
  razorpayOrderId: string | null;
  razorpayPaymentLinkId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAction {
  id: string;
  conversationId: string | null;
  orderId: string | null;
  toolName: string;
  actionType: string;
  reason: string | null;
  /** Re-redacted server-side on the way out. Still passed through lib/redact here. */
  input: unknown;
  output: unknown;
  status: AgentActionStatus;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Composite payloads
// -----------------------------------------------------------------------------

/**
 * `GET /api/conversations/:id/activity` -> data
 *
 * The summary is computed by the route (backend/src/api/conversations.ts), not here.
 */
export interface ActivityFeed {
  actions: AgentAction[];
  orders: Order[];
  summary: {
    total: number;
    started: number;
    success: number;
    failed: number;
    blocked: number;
  };
}

/**
 * `GET /api/orders/:id/activity` -> data
 *
 * A DIFFERENT shape from ActivityFeed: the order-scoped route returns the order's
 * own id and status alongside the actions, and returns no `orders` array and no
 * `summary`. Typing it as an ActivityFeed - as this file previously did - meant
 * every consumer read `.summary.total` off `undefined`.
 */
export interface OrderActivityFeed {
  orderId: string;
  status: OrderStatus;
  actions: AgentAction[];
}

/** `GET /health` */
export interface HealthReport {
  status: string;
  service?: string;
  environment?: string;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Request payloads
// -----------------------------------------------------------------------------

export interface ProductSearchParams {
  q?: string;
  category?: string;
  /** Minor units. */
  minPrice?: number;
  /** Minor units. */
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/orders`.
 *
 * Note what is absent: amount, price, currency, total. The backend schema is
 * `.strict()` and reads the price from the database itself, so sending one is a
 * 400 rather than a silently trusted number. That is the whole point - there is
 * no code path where a client, or an agent, names its own price.
 */
export interface CreateOrderPayload {
  productId: string;
  quantity?: number;
  conversationId?: string | null;
  userId?: string | null;
  idempotencyKey?: string;
}
