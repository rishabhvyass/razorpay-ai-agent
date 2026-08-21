/**
 * Supabase clients.
 *
 * ============================================================================
 *                            THE SECURITY BOUNDARY
 * ============================================================================
 *
 * Two clients, two trust levels. Choosing the wrong one is the single most
 * consequential mistake available in this codebase, so the difference is spelled
 * out rather than left to convention.
 *
 *   supabasePublic  - authenticated with SUPABASE_ANON_KEY.
 *                     Every query is filtered by Row Level Security. This is the
 *                     same key the React Native app and the Next.js dashboard
 *                     will hold. If a query works through this client, it is
 *                     safe for a client to make.
 *
 *   supabaseAdmin   - authenticated with SUPABASE_SERVICE_ROLE_KEY.
 *                     BYPASSES ROW LEVEL SECURITY ENTIRELY. It can read and
 *                     write every row in every table. It is, effectively, the
 *                     database owner.
 *
 * Rules for supabaseAdmin, in order of how badly each is violated in practice:
 *
 *   1. Never send its key, or anything derived from it, to a client. Not in a
 *      response body, not in an error message, not in a log line.
 *   2. Never return a raw admin query result straight to an HTTP response.
 *      Map it through an explicit serialiser that names the fields it exposes,
 *      so adding a sensitive column later cannot silently leak it. See
 *      `toPublicProduct` / `toPublicOrder` in the repositories.
 *   3. Never scope a request by an id taken from user input while using this
 *      client without checking ownership yourself. RLS is not there to catch
 *      you. `WHERE user_id = $1` with an attacker-supplied `$1` reads someone
 *      else's data quite happily.
 *
 * Rule 3 is the live gap in this phase: there is no auth middleware yet, so the
 * read endpoints run as admin and trust their path parameters. That is
 * acceptable for a Test Mode demo with no real user data and is called out in
 * the README, but it must close before anything real is stored.
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '../config/env.js';
import type { Database } from './types.js';

export type Db = SupabaseClient<Database>;

/**
 * Server-side clients must not behave like browser clients.
 *
 * `persistSession: false`   - there is no localStorage to persist to, and a
 *                             process-wide session would be shared across every
 *                             concurrent request. Each request carries its own
 *                             identity or none at all.
 * `autoRefreshToken: false` - no background timer trying to refresh a session
 *                             that does not exist; it only keeps the event loop
 *                             alive and delays clean shutdown.
 * `detectSessionInUrl`      - a browser-only OAuth redirect concern.
 */
const serverAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

/**
 * RLS-respecting client. Use for anything that could equally be done from the
 * client apps - most notably public catalogue reads.
 */
export const supabasePublic: Db = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  serverAuthOptions,
);

/**
 * Privileged client. Bypasses RLS. Read the boundary notes at the top of this
 * file before using it.
 */
export const supabaseAdmin: Db = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  serverAuthOptions,
);

/**
 * Build a client that acts as a specific end user, by forwarding their Supabase
 * access token. Queries made through it are subject to RLS exactly as they would
 * be from the client app, and `auth.uid()` resolves to that user.
 *
 * Unused in this phase - the auth phase will call it from middleware so that
 * per-user endpoints are protected by the database policies rather than by
 * application code remembering to filter. Kept here because it is the intended
 * destination, and writing it down stops the admin client from becoming the
 * default answer by accident.
 */
export function createUserScopedClient(accessToken: string): Db {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...serverAuthOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
