import { Order } from './order';

export const AGENT_ACTION_STATUSES = ['started', 'success', 'failed', 'blocked'] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

export const AGENT_ACTION_TYPES = [
  'READ_ACTION',
  'WRITE_ACTION',
  'MONEY_ACTION',
  'SYSTEM_ACTION',
] as const;
export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

export interface AgentAction {
  id: string;
  conversationId?: string | null;
  orderId?: string | null;
  toolName: string;
  actionType?: string;
  reason?: string | null;
  input?: unknown;
  toolInput?: Record<string, any>;
  output?: unknown;
  status: AgentActionStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  timestamp?: string;
  createdAt?: string;
}

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

export type OrderActivityFeed = ActivityFeed;
