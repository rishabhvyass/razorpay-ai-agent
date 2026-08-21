/**
 * Local session bookkeeping.
 *
 * The backend has no auth layer yet - no login, no session cookie, and its route
 * comments say so explicitly. That leaves the frontend with two honest options:
 * pretend a user exists, or keep track of what *this browser* did and say so.
 *
 * This module does the second. It stores:
 *
 *   - the current conversation id, so a page refresh does not silently start a new
 *     conversation and orphan the transcript the backend already recorded;
 *   - the ids of orders created from this browser, so the Orders page can show real
 *     orders (fetched by id from the backend) even though no "list all orders"
 *     endpoint exists;
 *   - an optional user id the reviewer can paste in Settings, which switches the
 *     Orders page to the real `GET /api/users/:userId/orders` route.
 *
 * Nothing here is order *data*. Only identifiers. Every field displayed anywhere in
 * the app is fetched from the backend using these ids, so this cache cannot drift
 * into showing a stale price or a wrong status.
 */

const KEY_CONVERSATION = 'cc.conversationId';
const KEY_ORDER_IDS = 'cc.orderIds';
const KEY_USER_ID = 'cc.userId';

/** Storage access that survives private-mode and disabled-storage without throwing. */
function readStore(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* storage unavailable - the app degrades to per-tab memory, which is fine */
  }
}

function clearStore(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

// -----------------------------------------------------------------------------
// Conversation
// -----------------------------------------------------------------------------

export function getStoredConversationId(): string | null {
  return readStore(sessionStorage, KEY_CONVERSATION);
}

export function setStoredConversationId(id: string): void {
  writeStore(sessionStorage, KEY_CONVERSATION, id);
}

export function clearStoredConversationId(): void {
  clearStore(sessionStorage, KEY_CONVERSATION);
}

// -----------------------------------------------------------------------------
// Orders created from this browser
// -----------------------------------------------------------------------------

export function getRecordedOrderIds(): string[] {
  const raw = readStore(localStorage, KEY_ORDER_IDS);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

/** Newest first, deduped, capped so the list cannot grow without bound. */
export function recordOrderId(id: string): void {
  const next = [id, ...getRecordedOrderIds().filter((existing) => existing !== id)].slice(0, 50);
  writeStore(localStorage, KEY_ORDER_IDS, JSON.stringify(next));
}

export function clearRecordedOrderIds(): void {
  clearStore(localStorage, KEY_ORDER_IDS);
}

// -----------------------------------------------------------------------------
// Optional user id
// -----------------------------------------------------------------------------

/**
 * The user id sent with new orders and used for order history.
 *
 * Null by default, and null is a valid value: `POST /api/orders` accepts a null
 * `userId`, and inventing a UUID here would break the `profiles` foreign key on
 * the orders table. A reviewer who has seeded a profile row can paste that id in
 * Settings to exercise the per-user history route.
 */
export function getUserId(): string | null {
  const value = readStore(localStorage, KEY_USER_ID);
  return value && value.trim() !== '' ? value.trim() : null;
}

export function setUserId(id: string | null): void {
  if (!id || id.trim() === '') {
    clearStore(localStorage, KEY_USER_ID);
    return;
  }
  writeStore(localStorage, KEY_USER_ID, id.trim());
}
