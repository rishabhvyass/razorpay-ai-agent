import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api';

/**
 * One QueryClient for the app.
 *
 * The retry policy is the interesting part: a 4xx from this backend means the
 * request was wrong (bad UUID, validation failure, route absent), and retrying a
 * wrong request three times just delays the error by a second while looking like
 * a hang. Only genuinely transient classes are retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {
      // Never auto-retry a mutation. `POST /api/orders` is idempotent only when
      // the caller supplies a key, and a silent retry of a money action is
      // precisely the behaviour this product is built to avoid.
      retry: false,
    },
  },
});

/**
 * Query keys, centralised.
 *
 * Invalidation is only correct if the key that writes and the key that reads agree
 * on their shape, so both come from here rather than from string literals scattered
 * across hooks.
 */
export const qk = {
  health: ['health'] as const,

  products: {
    all: ['products'] as const,
    list: (params: unknown) => ['products', 'list', params] as const,
    categories: ['products', 'categories'] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },

  conversations: {
    detail: (id: string) => ['conversations', id] as const,
    messages: (id: string) => ['conversations', id, 'messages'] as const,
    activity: (id: string) => ['conversations', id, 'activity'] as const,
  },

  orders: {
    all: ['orders'] as const,
    detail: (id: string) => ['orders', id] as const,
    activity: (id: string) => ['orders', id, 'activity'] as const,
    byUser: (userId: string) => ['orders', 'user', userId] as const,
    payment: (id: string) => ['orders', id, 'payment'] as const,
  },
} as const;
