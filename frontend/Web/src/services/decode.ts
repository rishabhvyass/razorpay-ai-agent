/**
 * Wire-shape checks at the HTTP boundary.
 *
 * WHY THIS EXISTS. `request<T>()` in api.ts parses JSON and casts it to `T`. A cast
 * is a promise the compiler cannot check, and this project has already been bitten
 * by breaking it: the domain types were written against the backend's Postgres row
 * shape (snake_case) while every route serialises through a `toPublic*` function
 * that renames to camelCase. Nothing failed. `order.product_id` was simply
 * `undefined`, `productName(undefined) ?? '-'` rendered an em-dash, and the order
 * pages looked sparse rather than broken. It survived a full typecheck, lint, build
 * and render pass, because the mock fixtures were written to agree with the same
 * wrong types.
 *
 * A UI whose whole argument is "we only show what the trusted backend actually
 * said" cannot quietly report "no value" for a field the backend did send. So every
 * response is checked against the shape it claims to be, and a mismatch throws an
 * ApiError naming the offending keys instead of flowing onward as undefined.
 *
 * WHAT IT IS NOT. This is not a validation framework and adds no dependency. It
 * checks presence and primitive kind, plus the closed status enums whose members
 * index into presentation lookups. It deliberately ignores EXTRA keys, so the
 * backend can add fields without breaking a deployed frontend.
 *
 * SECURITY. The error carries key NAMES only, never values. A response body can
 * contain user data, and this error text reaches a UI surface.
 */

import { ApiError } from './api';
import {
  AGENT_ACTION_STATUSES,
  CONVERSATION_STATUSES,
  MESSAGE_ROLES,
  ORDER_STATUSES,
} from '@/types';
import type {
  ActivityFeed,
  AgentAction,
  Conversation,
  Message,
  Order,
  OrderActivityFeed,
  Product,
} from '@/types';

/**
 * `'unknown'` means "must be present, may hold anything" - the JSONB bags. It is
 * not the same as optional: a missing key is still a mismatch, because the server
 * always serialises it.
 */
type Kind = 'string' | 'number' | 'boolean' | 'string|null' | 'unknown' | { oneOf: readonly string[] };

type Shape = Readonly<Record<string, Kind>>;

// Each shape mirrors one `Public*` interface. Keep them in the same order as the
// serialiser so a diff against the backend is a straight read.

/** backend/src/repositories/productRepo.ts -> PublicProduct */
const PRODUCT: Shape = {
  id: 'string',
  name: 'string',
  slug: 'string',
  description: 'string|null',
  category: 'string|null',
  price: 'number',
  currency: 'string',
  priceFormatted: 'string',
  stock: 'number',
  inStock: 'boolean',
  imageUrl: 'string|null',
  metadata: 'unknown',
};

/** backend/src/repositories/conversationRepo.ts -> PublicConversation */
const CONVERSATION: Shape = {
  id: 'string',
  userId: 'string|null',
  status: { oneOf: CONVERSATION_STATUSES },
  createdAt: 'string',
  updatedAt: 'string',
};

/** backend/src/repositories/messageRepo.ts -> PublicMessage */
const MESSAGE: Shape = {
  id: 'string',
  conversationId: 'string',
  role: { oneOf: MESSAGE_ROLES },
  content: 'string',
  metadata: 'unknown',
  createdAt: 'string',
};

/** backend/src/repositories/orderRepo.ts -> PublicOrder */
const ORDER: Shape = {
  id: 'string',
  userId: 'string|null',
  conversationId: 'string|null',
  productId: 'string',
  quantity: 'number',
  // The money fields are kind-checked, not just presence-checked. A string "1499"
  // where an integer is expected would format as garbage rather than fail, and
  // amounts are the one thing in this app that must never render plausibly wrong.
  amount: 'number',
  currency: 'string',
  amountFormatted: 'string',
  status: { oneOf: ORDER_STATUSES },
  razorpayOrderId: 'string|null',
  razorpayPaymentLinkId: 'string|null',
  razorpayPaymentId: 'string|null',
  createdAt: 'string',
  updatedAt: 'string',
};

/** backend/src/repositories/agentActionRepo.ts -> PublicAgentAction */
const AGENT_ACTION: Shape = {
  id: 'string',
  conversationId: 'string|null',
  orderId: 'string|null',
  toolName: 'string',
  actionType: 'string',
  reason: 'string|null',
  input: 'unknown',
  output: 'unknown',
  status: { oneOf: AGENT_ACTION_STATUSES },
  errorCode: 'string|null',
  errorMessage: 'string|null',
  requestId: 'string|null',
  createdAt: 'string',
};

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Key names and expected kinds only. Never a value from the response body. */
function problems(value: unknown, shape: Shape): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [`expected a JSON object, received ${describe(value)}`];
  }

  const record = value as Record<string, unknown>;
  const found: string[] = [];

  for (const [key, kind] of Object.entries(shape)) {
    if (!(key in record)) {
      found.push(`${key} is missing`);
      continue;
    }

    const actual = record[key];

    if (kind === 'unknown') continue;

    if (typeof kind === 'object') {
      if (typeof actual !== 'string' || !kind.oneOf.includes(actual)) {
        // The value IS included here, deliberately and safely: a closed enum's
        // members are backend constants, not user data, and knowing which
        // unrecognised status arrived is the whole diagnostic.
        found.push(
          `${key} is not one of ${kind.oneOf.join(' | ')} (received ${describe(actual)})`,
        );
      }
      continue;
    }

    if (kind === 'string|null') {
      if (actual !== null && typeof actual !== 'string') {
        found.push(`${key} should be a string or null, received ${describe(actual)}`);
      }
      continue;
    }

    if (typeof actual !== kind) {
      found.push(`${key} should be a ${kind}, received ${describe(actual)}`);
    }
  }

  return found;
}

function shapeError(what: string, found: string[]): ApiError {
  return new ApiError({
    status: 0,
    code: 'RESPONSE_SHAPE_MISMATCH',
    // Retrying cannot help: the same request returns the same shape. Marking it
    // non-retryable is what stops the UI offering a "Try again" that never will.
    retryable: false,
    message:
      `The backend's ${what} response did not match the shape this app expects. ` +
      'Nothing was displayed, because displaying a partly-understood response would ' +
      'mean guessing at fields the server may or may not have sent.',
    details: {
      entity: what,
      mismatches: found,
      hint:
        'src/types/domain.ts must mirror the toPublic* serialisers in ' +
        'backend/src/repositories/, not the row types in backend/src/db/types.ts.',
    },
  });
}

function one<T>(value: unknown, shape: Shape, what: string): T {
  const found = problems(value, shape);
  if (found.length > 0) throw shapeError(what, found);
  return value as T;
}

function many<T>(value: unknown, shape: Shape, what: string): T[] {
  if (!Array.isArray(value)) {
    throw shapeError(`${what} list`, [`expected a JSON array, received ${describe(value)}`]);
  }
  // Report every bad element at once rather than only the first: a systematic
  // rename shows up as the same complaint on all of them, which is the signal.
  const found = value.flatMap((item, index) =>
    problems(item, shape).map((problem) => `[${index}] ${problem}`),
  );
  if (found.length > 0) throw shapeError(`${what} list`, found.slice(0, 12));
  return value as T[];
}

/** `GET /api/products/categories` returns a bare string array. */
export function decodeStrings(value: unknown, what: string): string[] {
  if (!Array.isArray(value)) {
    throw shapeError(what, [`expected a JSON array, received ${describe(value)}`]);
  }
  const bad = value.flatMap((item, index) =>
    typeof item === 'string' ? [] : [`[${index}] should be a string, received ${describe(item)}`],
  );
  if (bad.length > 0) throw shapeError(what, bad.slice(0, 12));
  return value as string[];
}

export const decodeProduct = (value: unknown): Product => one<Product>(value, PRODUCT, 'product');
export const decodeProducts = (value: unknown): Product[] => many<Product>(value, PRODUCT, 'product');

export const decodeConversation = (value: unknown): Conversation =>
  one<Conversation>(value, CONVERSATION, 'conversation');

export const decodeMessage = (value: unknown): Message => one<Message>(value, MESSAGE, 'message');
export const decodeMessages = (value: unknown): Message[] => many<Message>(value, MESSAGE, 'message');

export const decodeOrder = (value: unknown): Order => one<Order>(value, ORDER, 'order');
export const decodeOrders = (value: unknown): Order[] => many<Order>(value, ORDER, 'order');

export const decodeAgentActions = (value: unknown): AgentAction[] =>
  many<AgentAction>(value, AGENT_ACTION, 'agent action');

/** `GET /api/conversations/:id/activity` */
export function decodeActivityFeed(value: unknown): ActivityFeed {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw shapeError('activity feed', [`expected a JSON object, received ${describe(value)}`]);
  }

  const record = value as Record<string, unknown>;
  const summary = record['summary'];

  if (typeof summary !== 'object' || summary === null) {
    throw shapeError('activity feed', [`summary should be an object, received ${describe(summary)}`]);
  }

  return {
    actions: decodeAgentActions(record['actions']),
    orders: decodeOrders(record['orders']),
    summary: summary as ActivityFeed['summary'],
  };
}

/**
 * `GET /api/orders/:id/activity`
 *
 * A different shape from the conversation feed: no `orders`, no `summary`.
 */
export function decodeOrderActivityFeed(value: unknown): OrderActivityFeed {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw shapeError('order activity', [`expected a JSON object, received ${describe(value)}`]);
  }

  const record = value as Record<string, unknown>;
  const found = problems(
    { orderId: record['orderId'], status: record['status'] },
    { orderId: 'string', status: { oneOf: ORDER_STATUSES } },
  );
  if (found.length > 0) throw shapeError('order activity', found);

  return {
    orderId: record['orderId'] as string,
    status: record['status'] as OrderActivityFeed['status'],
    actions: decodeAgentActions(record['actions']),
  };
}
