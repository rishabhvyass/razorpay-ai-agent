export * from './product';
export * from './order';
export * from './conversation';
export * from './message';
export * from './agentAction';

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
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
