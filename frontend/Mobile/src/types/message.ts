import { AgentAction } from './agentAction';
import { Order } from './order';
import { Product } from './product';

export const MESSAGE_ROLES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type ChatBlock =
  | { kind: 'product'; products: Product[]; note?: string }
  | {
      kind: 'purchase-confirmation';
      product: Product;
      quantity: number;
      amountMinor: number;
      currency: string;
    }
  | {
      kind: 'payment';
      order: Order;
      product: Product | null;
      paymentUrl: string | null;
    }
  | { kind: 'order-confirmation'; order: Order; product: Product | null }
  | { kind: 'activity-summary'; actions: AgentAction[] }
  | { kind: 'error'; code: string; message: string; hint?: string };

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: ChatBlock[];
  createdAt: string;
  mock?: boolean;
  failed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  product?: Product | null;
  products?: Product[];
  actions?: AgentAction[];
  createdAt?: string;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
}

export interface ChatResponse {
  turns: ChatTurn[];
  actions?: AgentAction[];
  mock?: boolean;
}

export const SUGGESTED_PROMPTS = [
  'Track this order',
  'Show similar items',
  'Find running shoes',
  'Find something under ₹1,500',
];
