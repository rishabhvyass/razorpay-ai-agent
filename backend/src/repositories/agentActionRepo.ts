/**
 * Agent action repository - the audit trail.
 *
 * Every tool the agent invokes writes a row here: what it was asked to do, why it
 * believed it was allowed to, what it received, and how it ended. This is the
 * single most important table in the system for anything other than taking money,
 * and it does three jobs:
 *
 *   1. It is the data behind the "Agent Activity" UI - the panel that makes an
 *      agent legible instead of a black box. A user watching a purchase happen can
 *      see search_products -> get_product -> create_order -> create_payment_link,
 *      each with its arguments.
 *
 *   2. It is the evidence that the agent did not overstep. A 'blocked' row is the
 *      record of a guardrail refusing something - an attempt to charge without
 *      approval, a total over a cap. Those rows are the interesting ones, and the
 *      reason `blockAgentAction` exists as a first-class operation rather than
 *      being logged and forgotten.
 *
 *   3. It is how a failure gets diagnosed. Joined on `request_id`, it lines up
 *      with the HTTP request, the Razorpay call, and the webhook that followed.
 *
 * The write-before-acting pattern matters. `startAgentAction` runs BEFORE the tool
 * does anything, so if the process dies mid-call the 'started' row survives as
 * proof that it was attempted. A row that only ever gets written on completion
 * cannot record the failures you most need to see.
 */

import { supabaseAdmin } from '../db/supabase.js';
import type {
  AgentActionRow,
  AgentActionStatus,
  AgentActionType,
  AgentActionUpdate,
  Json,
} from '../db/types.js';
import { fromPostgrestError, internal } from '../utils/errors.js';

/** Single literal, for the reason documented on ORDER_COLUMNS in orderRepo.ts. */
const ACTION_COLUMNS =
  'id, conversation_id, order_id, tool_name, action_type, reason, input, output, status, error_code, error_message, request_id, created_at';

export interface PublicAgentAction {
  id: string;
  conversationId: string | null;
  orderId: string | null;
  toolName: string;
  actionType: string;
  reason: string | null;
  input: unknown;
  output: unknown;
  status: AgentActionStatus;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  createdAt: string;
}

/**
 * Serialise for an HTTP response.
 *
 * `input` and `output` are re-redacted on the way out, even though they were
 * already redacted on the way in. That is not belt-and-braces for its own sake:
 * the write-path redaction is only as good as the key list *at the time the row
 * was written*, and these two columns are open JSONB bags. A row stored before a
 * pattern was added to the list would otherwise keep serving the value it
 * predates. Redacting at read time means extending the list retroactively covers
 * rows that already exist.
 */
export function toPublicAgentAction(row: AgentActionRow): PublicAgentAction {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    orderId: row.order_id,
    toolName: row.tool_name,
    actionType: row.action_type,
    reason: row.reason,
    input: redactSensitive(row.input),
    output: redactSensitive(row.output),
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    requestId: row.request_id,
    createdAt: row.created_at,
  };
}

/**
 * Keys whose values are replaced with a placeholder.
 *
 * Tool inputs and outputs are written straight into JSONB and are later rendered
 * in a UI. Anything that resembles a credential must not survive that trip. The
 * match is on the key name, case-insensitively and by substring, so
 * `razorpay_key_secret` and `X-Api-Token` are both caught.
 *
 * Two groups, for two different reasons:
 *
 *   - credential-shaped keys, which must never be stored or displayed at all;
 *   - payment-instrument keys, which a provider response legitimately contains
 *     (`number`, `vpa`, `contact`) and which are not secrets in the credential
 *     sense but are cardholder data that has no business in an activity feed.
 *
 * This is a safety net, not a licence to pass secrets through tool arguments.
 */
const REDACTED_KEY_PATTERNS = [
  // Credentials.
  'secret',
  'password',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'service_role',
  'signature',
  'private',
  'credential',
  'auth_code',
  // Payment instruments and contact details. Razorpay payloads carry these under
  // `card.number`, `card.cvv`, `upi.vpa`, `contact`, `email`.
  'number',
  'cvv',
  'cvc',
  'expiry',
  'vpa',
  'contact',
  'email',
  'phone',
  'account',
  'ifsc',
];

const REDACTED = '[REDACTED]';

/**
 * Depth cap: a cyclic or pathologically nested payload must not hang a request.
 *
 * Exceeding it is safe rather than leaky - the whole subtree below the cap is
 * replaced with a single '[TRUNCATED]' marker, so nothing under it is examined or
 * emitted. The cap is generous because truncating a legitimately deep provider
 * payload loses audit detail, and losing detail is the actual cost here.
 */
const MAX_REDACT_DEPTH = 32;

function shouldRedact(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-\s]/g, '_');
  return REDACTED_KEY_PATTERNS.some((pattern) => normalised.includes(pattern));
}

/**
 * Deep-copy a JSON value, blanking anything under a sensitive-looking key.
 *
 * Returns a fresh structure rather than mutating: the caller's object is often the
 * live tool argument, and quietly rewriting it would change what the tool sees.
 */
export function redactSensitive(value: unknown, depth = 0): Json {
  if (depth > MAX_REDACT_DEPTH) return '[TRUNCATED]';

  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }
  if (typeof value === 'object') {
    const output: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = shouldRedact(key) ? REDACTED : redactSensitive(item, depth + 1);
    }
    return output;
  }

  // undefined, function, symbol, bigint - not representable as JSON.
  return null;
}

export interface StartAgentActionInput {
  toolName: string;
  actionType: AgentActionType | string;
  conversationId?: string | null | undefined;
  orderId?: string | null | undefined;
  /**
   * The agent's own justification, in its own words. For a MONEY_ACTION this
   * should name the explicit user approval it is acting on.
   */
  reason?: string | null | undefined;
  input?: unknown;
  /** Ties this action to the HTTP request that triggered it. */
  requestId?: string | null | undefined;
}

/**
 * Record that an action is beginning. Call this BEFORE performing it.
 *
 * Returns the row id, which the caller passes to `completeAgentAction` /
 * `failAgentAction` when the outcome is known.
 */
export async function startAgentAction(input: StartAgentActionInput): Promise<PublicAgentAction> {
  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .insert({
      conversation_id: input.conversationId ?? null,
      order_id: input.orderId ?? null,
      tool_name: input.toolName,
      action_type: input.actionType,
      reason: input.reason ?? null,
      input: input.input === undefined ? null : redactSensitive(input.input),
      status: 'started',
      request_id: input.requestId ?? null,
    })
    .select(ACTION_COLUMNS)
    .single();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'startAgentAction' });
  }
  if (data === null) {
    throw internal('Agent action insert returned no row');
  }

  return toPublicAgentAction(data);
}

/**
 * Only a 'started' action may be resolved, enforced with `.eq('status', 'started')`.
 *
 * Without that guard a late-arriving completion could overwrite a 'blocked' row,
 * erasing the record of a guardrail firing - which is precisely the record you
 * cannot afford to lose.
 */
async function resolveAction(
  id: string,
  patch: {
    status: Exclude<AgentActionStatus, 'started'>;
    output?: unknown;
    error_code?: string | null;
    error_message?: string | null;
    order_id?: string | null;
  },
  operation: string,
): Promise<PublicAgentAction> {
  const update: AgentActionUpdate = { status: patch.status };

  if (patch.output !== undefined) update.output = redactSensitive(patch.output);
  if (patch.error_code !== undefined) update.error_code = patch.error_code;
  if (patch.error_message !== undefined) update.error_message = patch.error_message;
  if (patch.order_id !== undefined && patch.order_id !== null) update.order_id = patch.order_id;

  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .update(update)
    .eq('id', id)
    .eq('status', 'started')
    .select(ACTION_COLUMNS)
    .maybeSingle();

  if (error !== null) {
    throw fromPostgrestError(error, { operation });
  }
  if (data === null) {
    throw internal(`Agent action ${id} was not in 'started' state and could not be resolved`);
  }

  return toPublicAgentAction(data);
}

/** The action succeeded. `output` is redacted before storage. */
export async function completeAgentAction(
  id: string,
  output?: unknown,
  orderId?: string | null,
): Promise<PublicAgentAction> {
  return resolveAction(
    id,
    { status: 'success', output, ...(orderId === undefined ? {} : { order_id: orderId }) },
    'completeAgentAction',
  );
}

/**
 * The action was attempted and went wrong.
 *
 * `errorMessage` is stored for operators and may be rendered in the activity UI,
 * so pass a description rather than a raw provider error - upstream error text is
 * exactly where credentials and internal identifiers leak.
 */
export async function failAgentAction(
  id: string,
  errorCode: string,
  errorMessage: string,
  output?: unknown,
): Promise<PublicAgentAction> {
  return resolveAction(
    id,
    { status: 'failed', error_code: errorCode, error_message: errorMessage, output },
    'failAgentAction',
  );
}

/**
 * The action was refused by a guardrail before it did anything.
 *
 * Distinct from 'failed' on purpose. 'failed' is "we tried and it broke";
 * 'blocked' is "we declined to try". The second is a safety property working as
 * designed - an agent stopped from charging a card without an explicit yes - and
 * conflating the two would hide the system's most important behaviour inside its
 * error rate.
 */
export async function blockAgentAction(
  id: string,
  errorCode: string,
  reasonMessage: string,
): Promise<PublicAgentAction> {
  return resolveAction(
    id,
    { status: 'blocked', error_code: errorCode, error_message: reasonMessage },
    'blockAgentAction',
  );
}

/**
 * Record a refusal that never got a 'started' row, because the guardrail fired
 * before the tool was entered. Keeps blocked actions visible in the activity feed
 * regardless of where the check lives.
 */
export async function recordBlockedAction(
  input: StartAgentActionInput & { errorCode: string; reasonMessage: string },
): Promise<PublicAgentAction> {
  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .insert({
      conversation_id: input.conversationId ?? null,
      order_id: input.orderId ?? null,
      tool_name: input.toolName,
      action_type: input.actionType,
      reason: input.reason ?? null,
      input: input.input === undefined ? null : redactSensitive(input.input),
      status: 'blocked',
      error_code: input.errorCode,
      error_message: input.reasonMessage,
      request_id: input.requestId ?? null,
    })
    .select(ACTION_COLUMNS)
    .single();

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'recordBlockedAction' });
  }
  if (data === null) {
    throw internal('Blocked agent action insert returned no row');
  }

  return toPublicAgentAction(data);
}

/**
 * A conversation's actions, oldest first - the order the activity feed renders.
 */
export async function getConversationActions(
  conversationId: string,
  options: { limit?: number | undefined; offset?: number | undefined } = {},
): Promise<PublicAgentAction[]> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 500);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .select(ACTION_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getConversationActions' });
  }

  return (data ?? []).map(toPublicAgentAction);
}

/**
 * Everything that happened to one order - the money audit trail.
 *
 * Clamped like every other read here. An order accumulates a row per tool call,
 * each carrying two unbounded JSONB columns, so an unbounded version of this
 * function would serialise the entire history into a single response and grow
 * without limit as the payments layer adds retries and webhook deliveries.
 */
export async function getOrderActions(
  orderId: string,
  options: { limit?: number | undefined; offset?: number | undefined } = {},
): Promise<PublicAgentAction[]> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 500);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .select(ACTION_COLUMNS)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getOrderActions' });
  }

  return (data ?? []).map(toPublicAgentAction);
}

/** Everything that happened under one request id, across conversations and orders. */
export async function getActionsByRequestId(
  requestId: string,
  options: { limit?: number | undefined; offset?: number | undefined } = {},
): Promise<PublicAgentAction[]> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 500);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .select(ACTION_COLUMNS)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error !== null) {
    throw fromPostgrestError(error, { operation: 'getActionsByRequestId' });
  }

  return (data ?? []).map(toPublicAgentAction);
}
