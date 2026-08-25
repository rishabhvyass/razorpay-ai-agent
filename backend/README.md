# Checkout Concierge — Backend

An AI Growth & Agentic Commerce demo built for the Razorpay AI Builder Internship.

> **Phase status.** Built and working: the database schema, the repository layer, the
> products / conversations / orders API, and the **Razorpay Test Mode payments path** —
> payment links, a signature-verified webhook receiver, and reconciliation.
>
> Not built yet: the **Claude client, AgentRouter and MCP server**, and with them
> `POST /api/chat`. The agent layer was deliberately left for last, because it depends
> on the order state machine and the audit trail being correct, and both are far cheaper
> to fix before four layers sit on top of them. See
> [What is deliberately not built yet](#what-is-deliberately-not-built-yet).
>
> A web client lives in [`../frontend/Web`](../frontend/Web) (Vite + React 19) and talks
> to this API. It has its own README.

---

## 1. What Checkout Concierge is

A user discovers a product through ordinary conversation, approves the purchase
explicitly, and pays — without leaving the chat.

The end-to-end flow the product is being built toward:

1. The user says something like *"find me a black hoodie under ₹2,000"*.
2. The agent searches a real catalogue and presents actual options with real prices.
3. The user picks one. The agent prepares the order and **stops** — it asks for
   confirmation and does not proceed until it gets an explicit yes.
4. On approval, a Razorpay **Test Mode** order is created and a payment link is
   issued.
5. The user pays. Razorpay sends a webhook, whose **HMAC signature is verified**
   before anything is believed.
6. Confirmation appears back in the conversation.

Two design commitments shape everything below.

**The agent never spends money without being told to.** An order is created in
`PENDING_CONFIRMATION`, which contacts no payment provider and moves nothing. The
transition out of that state is the approval gate. Until it happens, nothing
irreversible has occurred.

**Every action the agent takes is recorded.** `agent_actions` is written *before* a
tool runs, not after, so an action that crashes halfway still leaves evidence that it
was attempted. A refusal by a guardrail is recorded as its own status (`blocked`)
rather than being logged and forgotten — those rows are the ones that show the safety
properties actually working.

---

## 2. Architecture

### Where this phase sits

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                             │
│  Vite + React web app (../frontend/Web)          ← built             │
│  React Native app  ·  Telegram bot               (not built yet)     │
└──────────────────────────────┬───────────────────────────────────────┘
                               │  HTTPS + X-Request-ID
┌──────────────────────────────▼───────────────────────────────────────┐
│  AGENT LAYER                                        (not built yet)  │
│  POST /api/chat → AgentRouter → Claude → MCP tool calls             │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
╔══════════════════════════════▼═══════════════════════════════════════╗
║  BACKEND                                             ← THIS PHASE    ║
║                                                                      ║
║  Express app (src/server.ts)                                         ║
║    requestId → cors → raw(webhooks) → json → routers → errorHandler  ║
║                                                                      ║
║  Routes            src/api/         health · products ·              ║
║                                     conversations · orders ·         ║
║                                     payments · webhooks              ║
║  Services          src/services/    paymentService (what a payment   ║
║                                     state means) · razorpayClient    ║
║  Repositories      src/repositories/  the ONLY code that touches     ║
║                                       the database                   ║
║  Supabase clients  src/db/supabase.ts  anon (RLS) │ service (admin)  ║
║  Config            src/config/env.ts   validated at import, or exit  ║
╚═════════════╤════════════════════════════════════════╤═══════════════╝
              │                                        │
┌─────────────▼────────────────────────────┐  ┌────────▼──────────────┐
│  SUPABASE POSTGRES                       │  │  RAZORPAY (Test Mode) │
│  RLS enabled on all 7 tables             │  │  Payment Links API    │
│                                          │  │  HMAC-signed webhooks │
│  profiles · products · conversations     │◄─┤  → /api/webhooks/     │
│  messages · orders · agent_actions       │  │       razorpay        │
│  payment_events                          │  └───────────────────────┘
└──────────────────────────────────────────┘
```

### The intended purchase flow

```
user                agent            orderRepo          Razorpay        webhook
 │                    │                  │                  │              │
 │ "black hoodie      │                  │                  │              │
 │  under ₹2,000"     │                  │                  │              │
 ├───────────────────►│ searchProducts() │                  │              │
 │                    ├─────────────────►│                  │              │
 │ ◄──────────────────┤ real rows, real prices              │              │
 │                    │                  │                  │              │
 │ "the second one"   │                  │                  │              │
 ├───────────────────►│ createOrderRecord()                 │              │
 │                    ├─────────────────►│ PENDING_CONFIRMATION            │
 │                    │                  │ ── nothing sent anywhere ──     │
 │ ◄──────────────────┤ "₹1,499. Confirm?"                  │              │
 │                    │                  │                  │              │
 │ ══ "yes" ═════════►│  ◄── THE APPROVAL GATE ──►           │              │
 │                    │                  │ create order     │              │
 │                    ├──────────────────┼─────────────────►│              │
 │                    │                  │ ORDER_CREATED    │              │
 │                    │                  │ PAYMENT_PENDING  │              │
 │ ◄──────────────────┤ payment link     │                  │              │
 │                    │                  │                  │              │
 │ ═══ pays ══════════┼══════════════════┼═════════════════►│              │
 │                    │                  │                  ├─────────────►│
 │                    │                  │        verify HMAC signature    │
 │                    │                  │ ◄── PAID ────────┼──────────────┤
 │ ◄──────────────────┤ "You're all set" │                  │              │
```

Every step writes an `agent_actions` row carrying the same `X-Request-ID`, so the
whole chain is one query.

### Layering rule

```
api/  →  repositories/  →  db/
```

Routes never build queries. Repositories never handle HTTP. Nothing outside
`config/env.ts` reads `process.env`. `src/repositories/orderRepo.ts` manages database
state **only** — the Razorpay API calls live one layer up, in
`src/services/razorpayClient.ts` (HTTP to Razorpay, nothing else) and
`src/services/paymentService.ts` (what a payment state *means*, and which order
transition it implies). That split is what makes the money path testable without a
network: `decideNextStatus()` is a pure function over a provider state.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js ≥ 22, ESM | Supabase client libraries dropped Node 20 support on 2026‑06‑30 |
| Language | TypeScript 5.9, `strict` | plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `verbatimModuleSyntax` |
| HTTP | Express 5.2.1 | Express 5 forwards async rejections to the error handler automatically |
| Database | Supabase PostgreSQL | RLS, generated types, and Supabase Auth in one place |
| DB client | `@supabase/supabase-js` 2.112.3 | two clients, two trust levels |
| Validation | Zod 4.4.3 | request bodies, query strings, **and** environment |
| Config | dotenv 17.4.2 | local `.env` only; deployments inject directly |

Every dependency is **pinned to an exact version** and `package-lock.json` is
committed — per the Supabase supply-chain guidance, since a caret range on a
database client is a way to inherit someone else's compromised release.

---

## 4. Environment setup

```bash
cd backend
npm install
cp .env.example .env    # then fill in the three Supabase values
```

### Required variables

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | Publishable. Safe for clients — every query is subject to RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Backend only. Bypasses RLS entirely.** |
| `PORT` | no | defaults to `3000` |
| `NODE_ENV` | no | `development` \| `test` \| `production`, defaults to `development` |
| `RAZORPAY_KEY_ID` | all three, or none | Test-mode key id |
| `RAZORPAY_KEY_SECRET` | all three, or none | **Backend only.** |
| `RAZORPAY_WEBHOOK_SECRET` | all three, or none | **Backend only.** Min 8 chars. What makes signature verification meaningful. |
| `AGENTROUTER_API_KEY` | no | **Backend only.** Present in `.env.example`, read by nothing yet — the agent layer is not built. |

`src/config/env.ts` validates all of this at import time and **exits** if anything is
missing or malformed, reporting every problem at once. A blank value (`FOO=`) is
treated as missing, because otherwise it satisfies `z.string()` and resurfaces later
as a confusing 401 from Supabase. Only variable **names** are ever printed — never
values.

The three Razorpay variables are **all-or-none**: setting one or two is rejected at
startup rather than producing a server that can create payment links but cannot verify
the webhooks confirming them. Omit all three and the server runs fine with payments
disabled — the payment routes answer `501 PAYMENT_NOT_CONFIGURED`, naming the missing
variables, and everything else works. Outside production, `RAZORPAY_KEY_ID` must begin
`rzp_test_`, so a live key cannot be loaded into a dev server by accident.

> **`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`
> must never leave the backend.** Not in a React bundle, not in an API response, not in
> a log line, not in an error message. `.env` is gitignored; `.env.example` contains
> placeholders only.

---

## 5. Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Project Settings → API** — copy the Project URL, the publishable/anon key, and
   the service role key into `.env`.
3. Run the migration and the seed (next two sections).

### A note on Data API exposure

Since **2026‑04‑28**, Supabase no longer auto-exposes newly created `public` tables to
the `anon` / `authenticated` roles (default for new projects from 2026‑05‑30, all
projects from 2026‑10‑30). This is separate from RLS: **`GRANT` decides whether a role
may touch a table at all; RLS decides which rows it sees once it may.**

Because that behaviour depends on a project-level setting, the migration does not
assume either state — it ends with an explicit `REVOKE`-then-`GRANT` block that states
the intended privileges outright. A policy without a matching `GRANT` is dead code; a
`GRANT` without a matching policy is a hole. Both are checked in that block.

---

## 6. Database migration

Everything lives in one file: **`supabase/migrations/001_initial_schema.sql`**.

**Option A — dashboard (simplest).** Open **SQL Editor**, paste the file, run it.

**Option B — Supabase CLI.**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migration is **idempotent** — `CREATE TABLE IF NOT EXISTS`,
`DROP POLICY IF EXISTS` before every `CREATE POLICY`, `CREATE OR REPLACE FUNCTION` —
so running it twice is safe.

**Confirming it worked.** `GET /health/ready` distinguishes the two first-run states by
name: `not_migrated` means the tables are absent, `not_seeded` means they exist and
`products` is empty. The server prints the same diagnosis at boot, with the specific
remedy rather than a list of everything that could be wrong. `npm run survey:live`
reports what actually exists, and `npm run test:schema` executes this file against a
real Postgres 17 in WASM and probes every table, constraint, index, trigger and policy —
useful before you run it against a project you care about.

### What it creates

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`, auto-created by a trigger on signup |
| `products` | the catalogue. `price` is **integer minor units** |
| `conversations` | a chat session. `user_id` is nullable, so an anonymous visitor can browse before signing in |
| `messages` | the transcript. `role` ∈ `user` / `assistant` / `system` / `tool` |
| `orders` | the money state machine, 7 states |
| `agent_actions` | **the audit trail.** Every tool call, its arguments, and its outcome |
| `payment_events` | raw webhook deliveries, with `UNIQUE (provider, provider_event_id)` for idempotency |

Delete behaviour is chosen per relationship, not applied uniformly:

- `messages` → `conversations` is **`CASCADE`**. A message outside its conversation is
  meaningless.
- `agent_actions` → `conversations` and → `orders` is **`SET NULL`**, deliberately *not*
  `CASCADE`. This is the audit trail. Deleting a conversation must not erase the record
  that money was moved, or refused, on its behalf — an audit trail that can be deleted
  by deleting the thing it audits is not one.
- `orders` → `products` is **`RESTRICT`** and `NOT NULL`. An order always refers to a
  real product, so a product with orders against it cannot be deleted; it gets
  `active = false` instead. That violation arrives as `23001`, which is *not* `23503` —
  a distinction `utils/errors.ts` gets right and `test:logic` asserts, because mapping
  it to "foreign key violation" would tell the caller the product is missing when it is
  in fact still there.
- `payment_events` → `orders` is **`SET NULL`**, for the same reason as the audit trail:
  what Razorpay sent is evidence, and it outlives the row it referred to.

Order lifecycle:

```
PENDING_CONFIRMATION ──► ORDER_CREATED ──► PAYMENT_PENDING ──► PAID ●
        │                     │                  │
        │                     ├──► PAYMENT_FAILED ◄┤
        │                     │         │
        └─────────────────────┴─────────┴──► CANCELLED ●
                                             PAYMENT_EXPIRED ●
                                             ● = terminal
```

`PAID` is terminal and has no outgoing edges. Money has moved; no later event may
contradict that, and a duplicate webhook cannot flip a paid order to failed. The graph
is enforced in `orderRepo.updateOrderStatus` and applied as a **conditional** update
(`.eq('status', current)`), so two concurrent webhooks cannot both succeed — the loser
matches no row and is reported as a conflict.

---

## 7. Seed data

Run **`supabase/seed.sql`** in the SQL Editor, or:

```bash
npx supabase db push --include-seed
```

Idempotent via `ON CONFLICT (slug) DO UPDATE`, so re-running refreshes rather than
duplicates.

**14 products** across clothing, shoes, electronics and accessories, shaped to exercise
the paths the agent will actually take:

- **Two black hoodies under ₹2,000** — so *"find me a black hoodie under ₹2,000"*
  returns a genuine choice rather than a single obvious answer: *Essential Black
  Hoodie* (₹1,799) and *Midnight Zip Hoodie* (₹1,499).
- **`Trail Hiker Boots` with `stock = 0`** — exercises the availability filter.
- **`Retired Canvas Tote` with `active = false`** — proves inactive products are
  invisible to public reads and that the RLS policy holds.

The file ends with a sanity-check `SELECT`. Expect: **14 total, 13 active, 2 black
hoodies at or under ₹2,000.**

---

## 8. Running locally

```bash
npm run dev        # tsx watch, hot reload
npm run build      # tsc → dist/
npm start          # node dist/server.js
npm run typecheck  # tsc --noEmit
```

Then:

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "service": "checkout-concierge-backend", "environment": "development" }
```

`GET /` returns a route index, including what is not built yet — so a caller hitting
`/api/chat` learns it is coming rather than getting a bare 404. It also reports
`payments.configured`, which distinguishes "the route is missing" from "the route is
there and this deployment has no keys". Whether credentials exist, never what they are.

### Tests

```bash
npm test
```

That is `build` → `test:logic` → `test:http` → `test:http:prod`. None of the four needs
a database, a network, or credentials — which is the point: the parts that decide what
happens to money are pure functions over explicit inputs, and they are tested that way.

| Script | What it covers | Needs |
|---|---|---|
| `npm run test:logic` | Pure logic: the order state machine, money arithmetic and overflow bounds, `decideNextStatus()` over every provider state, error mapping (including `23001` restrict_violation ≠ `23503`), deterministic search ranking. | nothing |
| `npm run test:http` | The real Express app in-process via `createApp()`: routing, validators, error envelope, `X-Request-ID`, the `501 PAYMENT_NOT_CONFIGURED` path, and a webhook with a forged signature. | nothing |
| `npm run test:http:prod` | The same app with `NODE_ENV=production`, asserting that 5xx bodies carry no stack trace, no message, and nothing about credentials. | nothing |
| `npm run test:schema` | The migration executed **verbatim** against a real Postgres 17, then probed: every table, constraint, index, trigger, RLS policy, and the seed. | see below |

`test:schema` runs the SQL against Postgres compiled to WASM, so it needs one package
that is deliberately **not** a dependency of this project:

```bash
npm install --no-save @electric-sql/pglite
```

`--no-save` keeps it out of `package.json` — it is a test harness, not something the
server links against. Without it the script exits with instructions rather than
pretending to pass.

### Verifying against your own Supabase project

Two scripts talk to the real project named in `.env`. Both are read-mostly and both
clean up after themselves.

```bash
npm run survey:live    # what exists: tables, row counts, RLS state
npm run verify:live    # exercises the repositories end to end
```

`verify:live` walks acceptance criteria 8–14 by calling the repository functions rather
than raw SQL, so a correct schema behind a broken repository still fails. It creates a
conversation, messages, an order and agent actions tagged with a per-run id, then
deletes them in reverse dependency order. Products are only ever read.

Its exit codes are distinct on purpose: `0` all passed, `1` ran and something failed,
`2` could not run (`not_migrated` — apply the migration first). Anything scripting this
needs to tell "broken" apart from "not set up yet".

```bash
npm run verify:live -- --dry-run
```

Validates the verifier itself with no network: every import resolves, every call target
is a function, and every enum literal it would send is one the codebase actually
defines. A verifier that cannot run has never been exercised, and the failure it then
reports is indistinguishable from the failure it was written to find.

---

## 9. API endpoints

Every response carries an `X-Request-ID` header. Errors all share one envelope:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "requestId": "d1f4c6a2-8e3b-4c5a-9f21-7b0e5a9c1d34"
  }
}
```

### Health

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness. Never touches the database. |
| `GET` | `/health/ready` | Readiness. Real Supabase round-trip; `503` when degraded. |

Liveness deliberately excludes the database: a liveness probe that fails during a
database outage makes an orchestrator restart a perfectly healthy process, repeatedly,
while the database is already struggling.

### Products

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/products` | `?q=` `&category=` `&minPrice=` `&maxPrice=` `&inStockOnly=` `&limit=` `&offset=` |
| `GET` | `/api/products/categories` | distinct active categories |
| `GET` | `/api/products/:id` | `404 PRODUCT_NOT_FOUND` |

Prices in `minPrice` / `maxPrice` are **minor units**: `?maxPrice=200000` is ₹2,000.

### Conversations

| Method | Path |
|---|---|
| `POST` | `/api/conversations` |
| `GET` | `/api/conversations/:id` |
| `PATCH` | `/api/conversations/:id` |
| `GET` | `/api/conversations/:id/messages` |
| `POST` | `/api/conversations/:id/messages` |
| `GET` | `/api/conversations/:id/activity` |

`/activity` is the **Agent Activity** feed — the `agent_actions` rows for that
conversation, in order.

### Orders

| Method | Path |
|---|---|
| `POST` | `/api/orders` |
| `GET` | `/api/orders/:id` |
| `GET` | `/api/orders/:id/activity` |
| `GET` | `/api/users/:userId/orders` |

`POST /api/orders` creates in `PENDING_CONFIRMATION` only. It prices the order from
`products.price` read at that moment and **never** from the request body. Pass an
`idempotencyKey` for anything that will lead to a payment: a retried request returns
the original order instead of creating a second one. Reusing the same key with a
*different* body is a `409 IDEMPOTENCY_KEY_REUSED` rather than a silent success —
the key and a fingerprint of the request are stored together, so a changed amount
cannot hide behind a replayed key.

### Payments

All three answer `501 PAYMENT_NOT_CONFIGURED` when the Razorpay variables are unset,
naming the variables that are missing.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/orders/:id/payment-link` | **Requires `{ "approved": true, "approvalReason": "..." }`.** `201`. Moves the order to `PAYMENT_PENDING`. |
| `GET` | `/api/orders/:id/payment` | Current payment view. Contacts nobody. |
| `POST` | `/api/orders/:id/payment/refresh` | Asks Razorpay what happened and applies the answer. |

The request body accepts `approved`, `approvalReason` and `conversationId` — and
nothing else. It is `.strict()`, so sending `amount`, `currency`, `status` or
`paymentUrl` is a `400` rather than a field that is quietly ignored. The amount charged
is read from the order row inside the service, so no caller can name its own price.

`approved` is typed as the literal `true`, not a boolean. A request without it does not
fail in the validator — it reaches the service, which writes a `blocked` row to
`agent_actions` and then refuses with `403 APPROVAL_REQUIRED`. The audit trail is the
product's evidence that the guardrail fired, so the refusal has to be recorded, not
merely returned.

**No route in this file can produce `PAID`.** `payment-link` sets
`PAYMENT_PENDING`, which is a statement about our own intent — we asked Razorpay for a
link. `PAID` comes only from a signature-verified webhook or from a value Razorpay
handed back on `/refresh`. `/refresh` looks like an exception and is not: the caller
supplies no payment information at all, only an order id, and everything acted on
arrives from Razorpay inside the handler.

`/refresh` exists because Razorpay cannot deliver a webhook to `localhost`, and because
in production an order stuck in `PAYMENT_PENDING` is not evidence that nobody paid.

### Webhooks

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/webhooks/razorpay` | HMAC-SHA256 over the **raw** request bytes. |

Three ordered properties, and the order is the design:

1. **Authenticate first.** Nothing is parsed, recorded or acted on before the signature
   verifies. An unsigned or wrongly-signed delivery is a `401` that leaves no trace in
   the order tables. The comparison is `crypto.timingSafeEqual` behind a length check —
   the check is required rather than defensive, because `timingSafeEqual` throws on
   unequal lengths.
2. **Record before acting.** The event lands in `payment_events` before any order is
   touched, so a crash mid-handler leaves evidence of what arrived.
3. **Ack what a retry cannot fix.** An unknown event type, an unknown order, or an
   amount mismatch is recorded and answered `200`, because retrying will produce the
   same result forever. A transient failure on our side answers `5xx`, so Razorpay
   retries. Getting this backwards yields either a retry storm or a lost payment.

This route is mounted with `express.raw()` **before** `express.json()`, and that
ordering is load-bearing: `express.json()` discards the bytes, and re-serialising the
parsed object does not reproduce them — key order, whitespace and number formatting all
differ — so a signature check downstream of it would reject valid deliveries. See
`src/server.ts`.

`POST /api/chat` is **not implemented** in this phase; it needs the Claude + MCP layer.

---

## 10. Security model

### The two-client boundary

`src/db/supabase.ts` exports exactly two clients, and choosing the wrong one is the
most consequential mistake available in this codebase:

| Client | Key | Trust |
|---|---|---|
| `supabasePublic` | `SUPABASE_ANON_KEY` | Every query filtered by RLS. Same key the client apps hold. |
| `supabaseAdmin` | `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS entirely.** Effectively the database owner. |

Rules for `supabaseAdmin`, in order of how often each is violated:

1. Never send its key, or anything derived from it, to a client.
2. Never return a raw admin query result to an HTTP response. Map it through an
   explicit serialiser — `toPublicProduct`, `toPublicOrder` — that names the fields it
   exposes, so a column added later cannot silently leak.
3. Never scope a request by a user-supplied id through this client without checking
   ownership yourself. **RLS is not there to catch you.**

### Row Level Security

RLS is enabled on all seven tables and every policy pairs `TO <role>` with an
ownership predicate — never `TO authenticated` alone, which is authentication without
authorization (BOLA/IDOR), and never the deprecated `auth.role()`, which silently
passes for anonymous sign-ins.

| Table | `anon` | `authenticated` |
|---|---|---|
| `products` | SELECT where `active = true` | same |
| `profiles` | — | own row: SELECT / INSERT / UPDATE |
| `conversations` | — | own rows: SELECT / INSERT / UPDATE |
| `messages` | — | SELECT + INSERT within an owned conversation, `role = 'user'` only |
| `orders` | — | own rows, **SELECT only** |
| `agent_actions` | — | **SELECT only**, via an owned conversation or order |
| `payment_events` | — | **nothing.** RLS on, zero policies, zero grants. |

Details that matter:

- `auth.uid()` is written `(SELECT auth.uid())` so it evaluates once per query rather
  than once per row.
- Every UPDATE policy has **both** `USING` and `WITH CHECK`. Without `WITH CHECK`, a
  user can reassign a row's `user_id` to someone else.
- The `messages` INSERT policy forces `role = 'user'`. A client may only speak *as the
  user*; `assistant`, `system` and `tool` turns are service-role writes.
- `orders` has no client INSERT or UPDATE policy at any tier. Orders are money.
- No `DELETE` is granted on any table. Removal is a status change
  (`conversations → archived`, `products → active = false`), which keeps the audit
  trail intact.
- Both `SECURITY DEFINER` functions are `REVOKE`d from `PUBLIC`, `anon` and
  `authenticated` and set `search_path = ''`. Postgres grants `EXECUTE` to `PUBLIC` by
  default and both roles inherit from it, so a `SECURITY DEFINER` function in `public`
  is otherwise a publicly callable, RLS-bypassing endpoint.
- `handle_new_user` reads `raw_user_meta_data` for a display name **only**. That field
  is user-editable and must never appear in an authorization decision.

### Money

Integer minor units end to end — ₹1,499 is `149900`, in the database, the API, and
later in the agent's tool arguments. No float anywhere in the money path, because
`0.1 + 0.2 !== 0.3` and Razorpay takes `amount` in the smallest currency unit for
exactly this reason. `orders.amount` is stored rather than recomputed, so a later
catalogue edit cannot rewrite history.

### Input handling

- Zod validates params, query strings and bodies at every route boundary.
- Free-text search is reduced to `[a-z0-9]` tokens before it reaches PostgREST.
  The `or=(...)` parameter is a filter *expression* parsed server-side, so
  interpolating raw text into it is an injection primitive in the same family as SQL
  injection — a `,` ends a condition and `()` nests one.
- An inbound `X-Request-ID` is honoured only if it matches
  `^[A-Za-z0-9._:-]{1,128}$`, and is rejected rather than stripped. CR/LF in a header
  value is a response-splitting primitive.
- Production responses carry a code, a generic message and a request id. Stack traces
  and upstream error text are development-only; the full detail goes to the server log
  under the same request id.
- `x-powered-by` is disabled. `trust proxy` is `false` — when a proxy is added, set it
  to a hop count, never `true`, which lets any client spoof `X-Forwarded-For` and with
  it every rate limit or audit entry keyed on client IP.

### Known gap in this phase

**There is no authentication middleware yet.** The read endpoints run through the
service-role client and trust their path parameters, which means `GET /api/orders/:id`
and `GET /api/users/:userId/orders` will return any user's data to any caller. RLS
protects data only when the query runs through a user-scoped, JWT-bearing client.

This is acceptable for a Test Mode demo holding no real user data, and it must close
before anything real is stored. `createUserScopedClient()` in `src/db/supabase.ts` is
the intended destination: auth middleware resolves the caller's token, and per-user
endpoints then run through that client so the **database** enforces ownership rather
than application code remembering to filter.

---

## 11. Future MCP integration

The MCP server will expose the repositories as tools. The repository functions are
already the right shape for it — deterministic, individually auditable, and unable to
be talked into a different answer:

| Tool | Backed by | Class |
|---|---|---|
| `search_products` | `searchProducts()` | `READ_ACTION` |
| `get_product` | `getProductById()` | `READ_ACTION` |
| `create_order` | `createOrderRecord()` | `WRITE_ACTION` |
| `create_payment_link` | payments layer | `MONEY_ACTION` |
| `get_order_status` | `getOrderById()` | `READ_ACTION` |

Three constraints already baked into this phase:

1. **Search is deterministic.** No embeddings, no model call, no model-produced
   ranking. The agent *calls* `searchProducts()` rather than searching on its own, so
   it cannot invent a product or a price — it can only report rows the function
   returned. Semantic search can be layered on later as a ranking pass over these
   results; it should not replace them.
2. **The agent cannot name a price.** `createOrderRecord` reads `products.price` from
   the database and ignores any amount a caller supplies. An agent that can name its
   own price is an agent that can be talked into a discount.
3. **Every tool call is wrapped in the audit trail.**
   `startAgentAction()` → run → `completeAgentAction()` / `failAgentAction()` /
   `blockAgentAction()`. A `MONEY_ACTION` must record the explicit user approval it is
   acting on in its `reason`.

---

## 12. Razorpay integration

**Built.** Test Mode only. `src/services/` owns the API calls and calls into `orderRepo`
to persist what happened. **No Razorpay call lives in a repository.**

Two services, split along one line — HTTP versus meaning:

- `services/razorpayClient.ts` — HTTP to `api.razorpay.com/v1` and nothing else. Direct
  REST with `fetch` and an `AbortSignal.timeout`, no SDK: two endpoints are needed
  (`POST /payment_links`, `GET /payment_links/{id}`) and a dependency that bundles the
  rest of the surface area is a larger thing to audit than the two calls it replaces.
- `services/paymentService.ts` — what a payment state *means*, and which order
  transition it implies.

```
approval (approved: true + a reason)
         → createPaymentLink()          → updateOrderStatus(PAYMENT_PENDING)
         → user pays on the Razorpay page
         → webhook → verify HMAC → payment_events insert
                                 → applyProviderState() → updateOrderStatus(PAID)

         (or, with no webhook reachable: POST /payment/refresh
          → fetchPaymentLink() → the same applyProviderState())
```

`decideNextStatus()` is the centre of it, and it is a **pure function** from a provider
state to the next order status. That is what makes the money path testable without a
network — every provider state, including the ones Razorpay produces rarely, is
exercised by `npm run test:logic` in milliseconds.

The schema was built for this and is now used as intended:

- `orders.razorpay_order_id`, `razorpay_payment_link_id`, `razorpay_payment_id` — each
  nullable and `UNIQUE`, populated as the flow advances.
- `payment_events` with `UNIQUE (provider, provider_event_id)` — **webhook
  idempotency at the database level**, so a redelivered event cannot be processed
  twice no matter what the handler does.
- `payment_events.signature_verified` — recorded per event. Only a
  signature-verified webhook may move an order to `PAID`.
- The partial index on unprocessed events supports a reconciliation sweep for
  deliveries that failed mid-processing — which is what `/payment/refresh` performs
  for a single order.

Test keys only: outside production, `RAZORPAY_KEY_ID` must begin `rzp_test_` or the
process refuses to start. The webhook secret is what makes signature verification
meaningful, so it is not optional — all three variables or none.

---

## 13. Future Claude / AgentRouter integration

`POST /api/chat` will be the single entry point:

```
POST /api/chat
  │
  ├─ load conversation + messages       (conversationRepo, messageRepo)
  ├─ AgentRouter
  │    ├─ system prompt + tool definitions
  │    ├─ Claude (claude-opus-5, adaptive thinking, streaming)
  │    └─ tool_use loop → MCP tools → agent_actions rows
  │
  ├─ guardrails
  │    ├─ MONEY_ACTION requires explicit user approval in-conversation
  │    ├─ order total cap
  │    └─ a refusal writes a 'blocked' row — it is not silently dropped
  │
  └─ persist assistant turn + return with X-Request-ID
```

The pieces this phase put in place for it:

- `messages` stores the full transcript with a `tool` role, so tool results are part
  of the conversation rather than side-channel state.
- `agent_actions.request_id` ties every tool call to the HTTP request that caused it,
  and later to the Razorpay call and the webhook that followed.
- `agent_actions.reason` is where the model records *why* it believed it was allowed
  to act — the field that makes a `MONEY_ACTION` reviewable after the fact.
- `blocked` exists as a first-class status. `failed` is "we tried and it broke";
  `blocked` is "we declined to try". Conflating them would hide the system's most
  important behaviour inside its error rate.
- Tool inputs and outputs are redacted by key name before storage
  (`secret`, `token`, `signature`, `api_key`, …) because they are written to JSONB and
  later rendered in a UI.

---

## What is deliberately not built yet

Claude API · AgentRouter · MCP server · `POST /api/chat` · Telegram · React Native app.

Also absent, and worth naming separately because it is a security gap rather than a
missing feature: **there is no auth layer yet.** See
[Known gap in this phase](#known-gap-in-this-phase).

The database, its access layer and the money path came first. Everything above depends
on the order state machine and the audit trail being right, and those are far cheaper to
correct now than after four layers are built on them.

---

## Project structure

```
backend/
├── src/
│   ├── api/
│   │   ├── conversations.ts
│   │   ├── health.ts
│   │   ├── orders.ts
│   │   ├── payments.ts            the approval gate; cannot itself produce PAID
│   │   ├── products.ts
│   │   └── webhooks.ts            HMAC over raw bytes, before the JSON parser
│   ├── config/
│   │   └── env.ts                 validated at import, or the process exits
│   ├── db/
│   │   ├── supabase.ts            the two-client security boundary
│   │   └── types.ts               mirrors the migration, column for column
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── requestId.ts
│   ├── repositories/
│   │   ├── agentActionRepo.ts     the audit trail
│   │   ├── conversationRepo.ts
│   │   ├── messageRepo.ts
│   │   ├── orderRepo.ts           database state only — no Razorpay calls
│   │   ├── paymentEventRepo.ts    webhook idempotency, one row per delivery
│   │   └── productRepo.ts         deterministic search
│   ├── services/
│   │   ├── healthService.ts
│   │   ├── paymentService.ts      what a payment state means; decideNextStatus()
│   │   └── razorpayClient.ts      HTTP to Razorpay and nothing else
│   ├── utils/
│   │   ├── errors.ts
│   │   └── money.ts               integer minor units
│   └── server.ts
├── scripts/
│   ├── smoke-http.mjs             the real app in-process, no network
│   ├── smoke-logic.mjs            pure logic: state machine, money, mapping
│   ├── survey-live.mjs            what exists in your Supabase project
│   ├── verify-live.mjs            criteria 8–14 through the repositories
│   └── verify-schema-pglite.mjs   the migration against a real Postgres 17
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  7 tables, RLS, policies, grants
│   └── seed.sql                    14 products
├── .env                            gitignored, never committed
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json               committed, per Supabase supply-chain guidance
├── tsconfig.json
└── README.md
```
