/**
 * Database types.
 *
 * Hand-written to mirror supabase/migrations/001_initial_schema.sql exactly, in
 * the shape `supabase gen types typescript` produces - so this file can be
 * regenerated later without changing any calling code:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/db/types.ts
 *
 * Nullability here is not decoration. It is copied column-by-column from the
 * migration, which is what makes `noUncheckedIndexedAccess` and strict null
 * checks catch real bugs instead of inventing them.
 *
 * Row    - what a SELECT returns
 * Insert - what an INSERT accepts (columns with defaults are optional)
 * Update - what an UPDATE accepts (everything optional)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// -----------------------------------------------------------------------------
// Status unions
//
// These mirror the CHECK constraints in the migration. Keeping them as string
// unions rather than Postgres ENUMs means adding a state is a code change plus a
// CHECK update, with no `ALTER TYPE` migration and no enum-ordering surprises.
// -----------------------------------------------------------------------------

export const CONVERSATION_STATUSES = ['active', 'completed', 'archived'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/**
 * The order lifecycle.
 *
 *   PENDING_CONFIRMATION  the agent has proposed a purchase; the user has not
 *                         approved it yet. Nothing has been sent to Razorpay.
 *   ORDER_CREATED         a Razorpay order exists.
 *   PAYMENT_PENDING       a payment link has been issued and shared.
 *   PAID                  a signature-verified webhook confirmed capture.
 *   PAYMENT_FAILED        the provider reported failure.
 *   PAYMENT_EXPIRED       the payment link lapsed unused.
 *   CANCELLED             abandoned before payment.
 *
 * The only transition that may set PAID is a webhook whose HMAC signature
 * verified. That rule lives in the payments phase; the type just names the states.
 */
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

export const AGENT_ACTION_STATUSES = ['started', 'success', 'failed', 'blocked'] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

/**
 * Classification of what an agent action touches. Convention only - not
 * CHECK-constrained, so new tool classes need no migration.
 *
 * MONEY_ACTION is the one that requires explicit user approval.
 */
export const AGENT_ACTION_TYPES = [
  'READ_ACTION',
  'WRITE_ACTION',
  'MONEY_ACTION',
  'SYSTEM_ACTION',
] as const;
export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          category: string | null;
          /** Minor units (paise for INR). 149900 = Rs 1,499.00. */
          price: number;
          currency: string;
          stock: number;
          image_url: string | null;
          active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          category?: string | null;
          price: number;
          currency?: string;
          stock?: number;
          image_url?: string | null;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          category?: string | null;
          price?: number;
          currency?: string;
          stock?: number;
          image_url?: string | null;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          /** Null for an anonymous conversation started before sign-in. */
          user_id: string | null;
          status: ConversationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: MessageRole;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
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
          /** Hash of the request parameters an idempotency key was first used with. */
          idempotency_fingerprint: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          product_id: string;
          quantity: number;
          amount: number;
          currency: string;
          status?: OrderStatus;
          razorpay_order_id?: string | null;
          razorpay_payment_link_id?: string | null;
          razorpay_payment_id?: string | null;
          idempotency_key?: string | null;
          idempotency_fingerprint?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          product_id?: string;
          quantity?: number;
          amount?: number;
          currency?: string;
          status?: OrderStatus;
          razorpay_order_id?: string | null;
          razorpay_payment_link_id?: string | null;
          razorpay_payment_id?: string | null;
          idempotency_key?: string | null;
          idempotency_fingerprint?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      agent_actions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          order_id?: string | null;
          tool_name: string;
          action_type: string;
          reason?: string | null;
          input?: Json | null;
          output?: Json | null;
          status: AgentActionStatus;
          error_code?: string | null;
          error_message?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          order_id?: string | null;
          tool_name?: string;
          action_type?: string;
          reason?: string | null;
          input?: Json | null;
          output?: Json | null;
          status?: AgentActionStatus;
          error_code?: string | null;
          error_message?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      payment_events: {
        Row: {
          id: string;
          order_id: string | null;
          provider: string;
          event_type: string;
          provider_event_id: string | null;
          payload: Json | null;
          signature_verified: boolean;
          processed: boolean;
          processing_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          provider?: string;
          event_type: string;
          provider_event_id?: string | null;
          payload?: Json | null;
          signature_verified?: boolean;
          processed?: boolean;
          processing_error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          provider?: string;
          event_type?: string;
          provider_event_id?: string | null;
          payload?: Json | null;
          signature_verified?: boolean;
          processed?: boolean;
          processing_error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

// -----------------------------------------------------------------------------
// Row / Insert / Update aliases
//
// So repositories read `ProductRow` instead of
// `Database['public']['Tables']['products']['Row']`.
// -----------------------------------------------------------------------------

type Tables = Database['public']['Tables'];

export type ProfileRow = Tables['profiles']['Row'];

export type ProductRow = Tables['products']['Row'];
export type ProductInsert = Tables['products']['Insert'];

export type ConversationRow = Tables['conversations']['Row'];
export type ConversationInsert = Tables['conversations']['Insert'];

export type MessageRow = Tables['messages']['Row'];
export type MessageInsert = Tables['messages']['Insert'];

export type OrderRow = Tables['orders']['Row'];
export type OrderInsert = Tables['orders']['Insert'];
export type OrderUpdate = Tables['orders']['Update'];

export type AgentActionRow = Tables['agent_actions']['Row'];
export type AgentActionInsert = Tables['agent_actions']['Insert'];
export type AgentActionUpdate = Tables['agent_actions']['Update'];

export type PaymentEventRow = Tables['payment_events']['Row'];
export type PaymentEventInsert = Tables['payment_events']['Insert'];
