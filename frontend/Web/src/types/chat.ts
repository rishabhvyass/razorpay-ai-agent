/**
 * Chat view model.
 *
 * This file defines the structured contract returned by the backend agent route.
 *
 * Two consequences, both deliberate:
 *
 *   1. A chat turn is a text body plus zero or more typed `blocks`. Rich content
 *      (a product, a confirmation gate, a payment card) is structured data the
 *      renderer switches on - never HTML or markdown smuggled through `content`.
 *      The backend returns this shape, and nothing in components/chat needs to
 *      know which provider answered.
 *
 *   2. Every turn carries `mock`. A mocked turn renders a visible marker. There
 *      is no way to display fabricated agent output that looks identical to real
 *      agent output, because the flag travels with the data rather than being
 *      checked once at the top of a component tree.
 */

import type { AgentAction, Order, Product } from './domain';

/** Discriminator for the rich blocks a turn can carry. See spec section 12. */
export type ChatBlock =
  | { kind: 'product'; products: Product[]; note?: string }
  | {
      /**
       * The approval gate. Rendering this does NOT create an order - it asks.
       * `PurchaseConfirmation` calls the backend only from its own click
       * handler, which is the single most important behaviour in the app.
       */
      kind: 'purchase-confirmation';
      product: Product;
      quantity: number;
      /** Minor units, quoted for display. The backend recomputes it on submit. */
      amountMinor: number;
      currency: string;
    }
  | {
      kind: 'payment';
      order: Order;
      product: Product | null;
      /** Provider-issued URL. Never constructed client-side. */
      paymentUrl: string | null;
    }
  | { kind: 'order-confirmation'; order: Order; product: Product | null }
  | { kind: 'activity-summary'; actions: AgentAction[] }
  | { kind: 'error'; code: string; message: string; hint?: string };

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  /** Plain text. Rich content belongs in `blocks`. */
  content: string;
  blocks?: ChatBlock[];
  createdAt: string;
  /** True when produced by src/services/mock/. Drives the visible marker. */
  mock?: boolean;
  /** Set when the turn is a failure the user should be able to act on. */
  failed?: boolean;
}

/** What `POST /api/chat` accepts. */
export interface ChatRequest {
  conversationId: string;
  message: string;
}

/** What `POST /api/chat` returns. */
export interface ChatResponse {
  turns: ChatTurn[];
  /** Actions the agent recorded while producing these turns. */
  actions?: AgentAction[];
  mock?: boolean;
}

/** Suggested opening prompts for the empty state (spec section 11). */
export const SUGGESTED_PROMPTS = [
  'Find a black hoodie under ₹2,000',
  'Show me running shoes',
  'Find something under ₹1,500',
  'Find a gift under ₹2,500',
] as const;
