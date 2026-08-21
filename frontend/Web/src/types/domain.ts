/**
 * Domain types.
 *
 * These mirror `backend/src/db/types.ts` and the response envelopes the Express
 * routes actually return. They are hand-copied rather than generated because the
 * backend is a separate package - so when the backend changes, this file is the
 * one place that has to change with it.
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
// Rows
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
  stock: number;
  image_url: string | null;
  active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string | null;
  status: ConversationStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Json;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  conversation_id: string | null;
  product_id: string;
  quantity: number;
  /** Total in minor units, computed server-side. Never client-supplied. */
  amount: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_link_id: string | null;
  razorpay_payment_id: string | null;
  idempotency_key: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: string;
  conversation_id: string | null;
  order_id: string | null;
  tool_name: string;
  action_type: string;
  reason: string | null;
  input: Json | null;
  output: Json | null;
  status: AgentActionStatus;
  error_code: string | null;
  error_message: string | null;
  request_id: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Composite payloads
// -----------------------------------------------------------------------------

/** `GET /api/conversations/:id/activity` -> data */
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
