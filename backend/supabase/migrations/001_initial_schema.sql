-- =============================================================================
-- Checkout Concierge - 001_initial_schema
--
-- Agentic commerce foundation: catalogue, conversations, orders, and the audit
-- trail that records every agent/MCP action and every payment provider event.
--
-- Conventions used throughout:
--   * Money is ALWAYS an integer in minor units (paise for INR). Rs 1,499 is
--     stored as 149900. There are no floating-point money columns anywhere, and
--     no NUMERIC/DECIMAL either - integers make rounding bugs impossible.
--   * Every application table has RLS enabled and is deny-by-default. The
--     backend's service-role key bypasses RLS (Supabase grants that role
--     BYPASSRLS); anon/authenticated clients get only the narrow policies below.
--   * Timestamps are TIMESTAMPTZ, defaulted in the database, never in app code.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

-- gen_random_uuid() is core in Postgres 13+, which every Supabase project runs.
-- No extension needed.

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
--
-- Set in the database rather than the application so a direct SQL fix, a
-- Supabase Studio edit, and an API write all behave the same way.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Postgres grants EXECUTE on every new function to PUBLIC, and anon/authenticated
-- inherit from PUBLIC - so a function in an exposed schema is a callable API
-- endpoint by default. Trigger functions have no business being called directly.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- profiles
--
-- Application-level mirror of auth.users. Supabase owns auth.users; anything we
-- want to attach to a user (display name, later: preferences, address) lives
-- here so we never have to alter an auth-schema table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT        CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 120),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-provision a profile row when a user signs up, so application code never
-- has to handle "authenticated but no profile".
--
-- SECURITY DEFINER is genuinely required: the inserting context is the auth
-- system, and the new user has no session yet, so an INVOKER function would be
-- refused by the profiles RLS policies. Because it is SECURITY DEFINER, three
-- hardening steps are mandatory rather than optional:
--
--   1. SET search_path = '' plus fully-qualified names, so the function cannot be
--      hijacked by a caller-controlled search_path resolving `profiles` to a
--      different table.
--   2. REVOKE EXECUTE from PUBLIC (see below). Postgres grants EXECUTE to PUBLIC
--      by default, and anon/authenticated inherit it - which would make this a
--      publicly callable, RLS-bypassing endpoint.
--   3. No branching on caller-supplied data. It only ever inserts NEW.id.
--
-- raw_user_meta_data is read here for a display name ONLY. It is user-editable,
-- so it must never appear in an RLS policy or any other authorization decision.
--
-- Being user-editable also makes it untrusted *input*, which is why it is clamped
-- rather than inserted as-is. display_name carries CHECK (char_length BETWEEN 1
-- AND 120); a signup sending an empty string (an untouched form field) or a
-- pasted 200-character name would raise check_violation inside this AFTER INSERT
-- trigger, roll back the insert into auth.users, and fail the signup with
-- "Database error saving new user". `left(..., 120)` bounds the length and
-- NULLIF(..., '') maps blank to NULL, which the CHECK explicitly allows.
--
-- The EXCEPTION block is the second half of the same argument: a profile row is a
-- convenience, and no future constraint on this table should ever be able to stop
-- a user from creating an account. Failing to write the profile degrades; failing
-- the signup does not.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
      NEW.id,
      NULLIF(
        left(
          COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name'
          ),
          120
        ),
        ''
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      -- Never block account creation. The application already tolerates a
      -- missing profile row, and the alternative is an unrecoverable signup.
      RAISE WARNING 'handle_new_user: could not create profile for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- products
--
-- The catalogue the agent searches. Deterministic SQL search for now; this table
-- is what the MCP `search_products` tool will read in a later phase.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  slug         TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  TEXT,
  category     TEXT,

  -- Minor units. 149900 = Rs 1,499.00. Never a float.
  price        INTEGER     NOT NULL CHECK (price >= 0),
  currency     TEXT        NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),

  stock        INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url    TEXT,
  active       BOOLEAN     NOT NULL DEFAULT true,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index notes for this table.
--
-- No index on `slug`: the column-level UNIQUE above already creates a unique btree
-- on exactly (slug), and a unique btree serves equality, ranges, ordering and
-- index-only scans identically. A second plain index on the same column would be
-- written on every INSERT and every slug UPDATE while never being chosen.
--
-- No index on `category` either, and that one is subtler: the only category filter
-- in the codebase is `ilike` (see searchProducts in productRepo.ts). Under the
-- default text collation Postgres cannot turn ILIKE into a btree range scan even
-- with no wildcards in the pattern, so a plain btree on (category) is maintained
-- on every write and never read. If category filtering ever needs index support,
-- normalise categories to lowercase at write time and switch the query to
-- equality - then a plain btree becomes usable.
--
-- `active` and `price` are both real: every catalogue read filters `active = true`
-- and orders by price.
CREATE INDEX IF NOT EXISTS idx_products_active   ON public.products (active);
CREATE INDEX IF NOT EXISTS idx_products_price    ON public.products (price);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- conversations
--
-- user_id is nullable so an anonymous visitor can start chatting before signing
-- in. Consequence for RLS: an anonymous conversation has user_id IS NULL, and
-- `user_id = auth.uid()` is never true for NULL, so those rows are reachable
-- only through the service-role backend. That is the intended behaviour.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'completed', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status  ON public.conversations (status);

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- messages
--
-- The verbatim transcript. `role` covers the four kinds of turn an agentic
-- conversation produces, including 'tool' for MCP tool results.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content          TEXT        NOT NULL,
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
-- Composite covers the actual read pattern: one conversation, in order.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at);

-- =============================================================================
-- orders
--
-- Single-product orders for this phase (quantity + one product_id), which is what
-- the conversational flow produces. Multi-line carts would move to an
-- order_items child table.
--
-- `amount` is the authoritative total in minor units, computed server-side from
-- products.price at order time - never supplied by a client or by the agent.
-- Storing it (rather than recomputing from products.price) freezes the price the
-- customer actually agreed to, so a later catalogue edit cannot rewrite history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id           UUID        REFERENCES public.conversations(id) ON DELETE SET NULL,
  -- NOT NULL + ON DELETE RESTRICT: an order always refers to something, and a
  -- product that has ever been ordered can no longer be deleted from the
  -- catalogue (deactivate it instead - set active = false).
  product_id                UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,

  quantity                  INTEGER     NOT NULL CHECK (quantity > 0),
  amount                    INTEGER     NOT NULL CHECK (amount >= 0),
  currency                  TEXT        NOT NULL CHECK (char_length(currency) = 3),

  status                    TEXT        NOT NULL DEFAULT 'PENDING_CONFIRMATION'
    CHECK (status IN (
      'PENDING_CONFIRMATION',
      'ORDER_CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'PAYMENT_FAILED',
      'PAYMENT_EXPIRED',
      'CANCELLED'
    )),

  -- Populated in the Razorpay phase. Kept nullable and UNIQUE so a provider id
  -- can never be attached to two different local orders.
  razorpay_order_id         TEXT        UNIQUE,
  razorpay_payment_link_id  TEXT        UNIQUE,
  razorpay_payment_id       TEXT        UNIQUE,

  -- Supplied by the caller that initiates a money action. UNIQUE turns a
  -- retried/duplicated "create order" into a constraint violation the repository
  -- can resolve into "return the existing order" instead of double-charging.
  --
  -- The key namespace is global and the API permits short, guessable keys
  -- ('checkout-0001'), so the key ALONE is not enough to identify a retry. A
  -- fingerprint of the request parameters is stored alongside it: on reuse, the
  -- repository compares fingerprints and only replays the original order when they
  -- match. A key reused with different parameters is a caller bug and is rejected,
  -- rather than being answered with an order the caller never asked for.
  --
  -- Scoping the UNIQUE to (user_id, idempotency_key) would NOT work here:
  -- user_id and conversation_id are both nullable for anonymous checkout, and
  -- Postgres treats NULLs as distinct in a unique index, so anonymous orders would
  -- lose deduplication entirely - trading a wrong-order bug for a double-order bug
  -- in exactly the flow that most needs the guarantee.
  idempotency_key           TEXT        UNIQUE,
  idempotency_fingerprint   TEXT,

  metadata                  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite, not a bare (user_id), because it covers the actual read pattern:
-- getUserOrders filters one user and sorts newest-first. A single-column index on
-- user_id would still force a sort over every one of that user's orders before
-- LIMIT could discard all but a page. Same reasoning as
-- idx_messages_conversation_created above.
CREATE INDEX IF NOT EXISTS idx_orders_user_created        ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status              ON public.orders (status);
-- FK covering index. Without it, DELETE or UPDATE of a products row must seq-scan
-- orders to enforce the ON DELETE RESTRICT above, and holds a lock while it does.
CREATE INDEX IF NOT EXISTS idx_orders_product_id          ON public.orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id     ON public.orders (conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at          ON public.orders (created_at DESC);
-- No plain indexes on razorpay_order_id / razorpay_payment_id: both are declared
-- UNIQUE above, which already builds a btree on each. See the products note.

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- agent_actions
--
-- The audit trail, and the data source for the "Agent Activity" UI.
--
-- Every MCP/agent operation writes a 'started' row before it acts and updates it
-- to success/failed/blocked afterwards. Writing before acting is deliberate: if
-- the process dies mid-money-action, the started row is the evidence that it
-- happened. 'blocked' records an action a guardrail refused - the most
-- interesting rows for demonstrating that the agent cannot spend without
-- explicit approval.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SET NULL, not CASCADE. This is the audit trail: deleting a conversation must
  -- not delete the record of what the agent did inside it, least of all the
  -- MONEY_ACTION rows carrying the user's approval. The orders it audits already
  -- survive their conversation the same way (orders.conversation_id, above), and
  -- an audit row that vanishes with the thing it audits is not an audit trail.
  -- Consequence: an orphaned row is no longer reachable through the per-user RLS
  -- policy, which is correct - it is retained for the operator, not the user.
  conversation_id  UUID        REFERENCES public.conversations(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id) ON DELETE SET NULL,

  tool_name        TEXT        NOT NULL,
  -- Convention, intentionally not CHECK-constrained so new tool classes do not
  -- require a migration: READ_ACTION | WRITE_ACTION | MONEY_ACTION | SYSTEM_ACTION.
  action_type      TEXT        NOT NULL,

  -- Why the agent believed it was allowed to do this, in its own words.
  -- e.g. "User explicitly approved purchase of Essential Black Hoodie."
  reason           TEXT,

  input            JSONB,
  output           JSONB,

  status           TEXT        NOT NULL CHECK (status IN ('started', 'success', 'failed', 'blocked')),
  error_code       TEXT,
  error_message    TEXT,

  -- Correlates one row here with the HTTP request, the Razorpay call, and the
  -- webhook that followed. See middleware/requestId.ts.
  request_id       TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_conversation_id ON public.agent_actions (conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_order_id        ON public.agent_actions (order_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_request_id      ON public.agent_actions (request_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at      ON public.agent_actions (created_at DESC);

-- =============================================================================
-- payment_events
--
-- Raw provider webhook deliveries plus the result of processing them.
--
-- The UNIQUE (provider, provider_event_id) constraint is what makes webhook
-- handling idempotent: Razorpay retries on any non-2xx and makes no
-- at-most-once guarantee, so replay protection has to live in the database, not
-- in application logic.
--
-- NULL provider_event_id is left deliberately non-unique (Postgres treats NULLs
-- as distinct), so internally-generated reconciliation events can be recorded
-- freely without colliding.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  provider            TEXT        NOT NULL DEFAULT 'razorpay',
  event_type          TEXT        NOT NULL,
  provider_event_id   TEXT,
  payload             JSONB,

  -- False until the HMAC signature has been checked. A row with
  -- signature_verified = false must never drive an order state change.
  signature_verified  BOOLEAN     NOT NULL DEFAULT false,
  processed           BOOLEAN     NOT NULL DEFAULT false,
  processing_error    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payment_events_provider_event
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event_id ON public.payment_events (provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id          ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed
  ON public.payment_events (created_at) WHERE processed = false;

-- =============================================================================
-- Row Level Security
--
-- Enabled on every application table. RLS-enabled with zero matching policies
-- means deny, so the default posture is closed and each policy below opens one
-- narrow, deliberate hole.
--
-- The backend's service-role key bypasses all of this. These policies exist to
-- protect the anon/publishable key that the React Native and Next.js clients
-- will hold, and to make direct-from-client reads safe in a later phase.
--
-- auth.uid() is wrapped in (SELECT ...) so Postgres evaluates it once per query
-- instead of once per row - the standard Supabase RLS performance idiom.
-- =============================================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- --- profiles: a user sees and edits exactly their own row ---------------------

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- No DELETE policy: profile lifetime follows auth.users via ON DELETE CASCADE.

-- --- products: the only publicly readable table, and only while active --------

DROP POLICY IF EXISTS "products_select_active_public" ON public.products;
CREATE POLICY "products_select_active_public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- No INSERT/UPDATE/DELETE policies: catalogue writes are service-role only.

-- --- conversations: owner-scoped ----------------------------------------------

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- --- messages: reachable only through a conversation the user owns ------------

DROP POLICY IF EXISTS "messages_select_own_conversation" ON public.messages;
CREATE POLICY "messages_select_own_conversation" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id
         AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_own_conversation" ON public.messages;
CREATE POLICY "messages_insert_own_conversation" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id
         AND c.user_id = (SELECT auth.uid())
    )
    -- A client may only speak as the user. 'assistant', 'system' and 'tool'
    -- turns are written by the trusted backend via the service role.
    AND role = 'user'
  );

-- --- orders: read-only for the owner -----------------------------------------
-- Orders are money. No client-side INSERT or UPDATE policy exists at any tier;
-- only the trusted backend creates or transitions an order.

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- --- agent_actions: read-only, visible via the user's own conversation/order --

DROP POLICY IF EXISTS "agent_actions_select_own" ON public.agent_actions;
CREATE POLICY "agent_actions_select_own" ON public.agent_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = agent_actions.conversation_id
         AND c.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = agent_actions.order_id
         AND o.user_id = (SELECT auth.uid())
    )
  );

-- --- payment_events: no policies, deliberately ---------------------------------
-- RLS is on and nothing is granted, so anon and authenticated get nothing.
-- Raw webhook payloads carry provider metadata that must never reach a client.
-- Access is service-role only.

-- =============================================================================
-- Table privileges
--
-- RLS and GRANT are two independent layers, and both have to be right:
--
--   GRANT decides whether a role may touch the table at all.
--   RLS   decides which rows it sees once it may.
--
-- Getting one without the other fails in opposite directions. A policy with no
-- GRANT is dead code - the role gets "permission denied for table" and the policy
-- never runs. A GRANT with no policy is a hole. And because a Supabase project's
-- Data API settings decide whether SQL-created tables are auto-exposed to
-- anon/authenticated, neither state can be assumed: this block states the
-- intended privileges explicitly so the outcome does not depend on a dashboard
-- toggle.
--
-- Start from nothing, then grant exactly what the policies above are meant to
-- allow. Written so that a future policy mistake is not the only thing between a
-- publishable key and a write.
-- =============================================================================

REVOKE ALL ON public.profiles       FROM anon, authenticated;
REVOKE ALL ON public.products       FROM anon, authenticated;
REVOKE ALL ON public.conversations  FROM anon, authenticated;
REVOKE ALL ON public.messages       FROM anon, authenticated;
REVOKE ALL ON public.orders         FROM anon, authenticated;
REVOKE ALL ON public.agent_actions  FROM anon, authenticated;
REVOKE ALL ON public.payment_events FROM anon, authenticated;

-- Catalogue: the only table an unauthenticated visitor can read. Rows still
-- filtered to active = true by products_select_active_public.
GRANT SELECT ON public.products TO anon, authenticated;

-- Signed-in users. Every one of these is additionally row-filtered by the
-- owner-scoped policies above.
GRANT SELECT, INSERT, UPDATE ON public.profiles      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT         ON public.messages      TO authenticated;

-- Read-only: orders and the audit trail are written by the trusted backend only.
GRANT SELECT ON public.orders        TO authenticated;
GRANT SELECT ON public.agent_actions TO authenticated;

-- payment_events: deliberately no GRANT to anyone. Raw webhook payloads carry
-- provider metadata that must never reach a client. Service role only.

-- No DELETE is granted on any table. Deletion is an administrative act; user-
-- facing removal is a status change (conversations -> 'archived', products ->
-- active = false), which keeps the audit trail intact.

