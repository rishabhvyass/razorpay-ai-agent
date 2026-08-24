# Checkout Concierge — web frontend

Conversational commerce interface for the Checkout Concierge backend. The agent can
recommend and *request* actions; every financial action is explicitly authorized by
the user, and payment success is only ever reported after the backend says Razorpay
verified it.

```
Conversation → Recommendation → Explicit authorization → Order → Payment → Verified webhook → Completed
```

This directory contains **only** the frontend. It holds no Claude, MCP, Razorpay or
Supabase server-side logic and no secrets — it consumes the backend's HTTP API.

## Running it

The backend must be running on port 3000 first (`cd ../../backend && npm run dev`).

```bash
npm install
cp .env.example .env     # defaults are correct for local development
npm run dev              # http://localhost:5173
```

`vite.config.ts` proxies `/api` and `/health` to `localhost:3000`, so the browser
stays same-origin and CORS never enters the picture. Leave `VITE_API_URL` empty in
development; set an absolute origin only for a deployed build.

| Script | |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint, type-aware |

## Routes

| Route | |
|---|---|
| `/` | Dashboard — conversation, recommendations, approval gate, payment panel |
| `/products` | Catalog from `GET /api/products`, with search and filters |
| `/orders`, `/orders/:id` | Order list and detail with the full state timeline |
| `/activity` | Agent audit trail — every action, explainable |
| `/settings` | Backend connection, identity, session, security disclosure |
| `/mock-checkout/:orderId` | Simulated settlement (see below) |

## What is real and what is simulated

The backend has not yet shipped the Claude/MCP layer or the payments layer, so two
routes do not exist: `POST /api/chat` and `POST /api/webhooks/razorpay`. Rather than
invent them or pretend the gap away, `VITE_USE_MOCK=true` routes *only those calls*
through `src/services/mock/`, and **every surface fed by a mock renders a visible
`MOCK — awaiting backend` badge**. `mock: true` travels with the data itself rather
than being inferred at the component, so a mocked value cannot lose its label on the
way to the screen.

Real endpoints — products, orders, conversations, activity, health — always hit the
live backend regardless of the flag. `config.useMock` is forced to `false` in
production builds, so a mock adapter cannot ship by accident.

`/mock-checkout/:orderId` stands in for the payment provider. It is not a Razorpay
page and does not imitate one: it reads the amount from the backend by order id,
carries the mock labelling, and offers **both** outcomes — a payment flow that can
only be demonstrated succeeding has not been demonstrated. In real mode it refuses
to render controls and explains why.

## Architecture

```
src/
  pages/        one file per route
  components/   layout/ chat/ checkout/ products/ orders/ activity/ ui/
  hooks/        useCheckoutSession (the approval gate), data hooks per resource
  services/     one module per backend resource + api.ts + mock/
  lib/          config, money, format, redact, queryClient (+ the qk key registry)
  types/        request/response shapes mirroring the backend
```

`useCheckoutSession` is the centrepiece and holds three invariants, documented at the
top of the file:

1. `POST /api/orders` is called from exactly one place, reachable only from a click
   handler — never from an effect, so a re-render cannot create an order.
2. Post-confirmation amounts come from the returned order row, never from the
   client's arithmetic.
3. No code path anywhere sets a payment status. Statuses are read from the backend.

Money is handled as integer **minor units** (paise) end to end, with a single
conversion point in `lib/money.ts`. Floats never touch an amount.

## Security

No secret is present in, or reachable from, this bundle. Only `VITE_`-prefixed
variables are exposed to the browser and this app declares exactly two —
`VITE_API_URL` and `VITE_USE_MOCK`, neither sensitive. `AGENTROUTER_API_KEY`,
`ANTHROPIC_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and
`SUPABASE_SERVICE_ROLE_KEY` are backend-only; `/settings` lists those *names* to
document the boundary and never displays a value.

Any JSON rendered to the DOM — agent tool payloads, debug views — first passes
through `lib/redact.ts`, which replaces any field whose name or value looks like a
key, token, signature or credential. Amounts, payment status and order status are
always displayed as the backend returned them and are never computed or inferred in
the browser.

## Notes

- Requires the database migration (`001_initial_schema.sql` and `seed.sql`) to be
  applied. Without it the backend returns 500 on `/api/products` and the UI shows
  its error states rather than a catalog.
- The dashboard polls order status while a payment is outstanding and stops on its
  own once the order reaches a terminal state. Nothing here fakes realtime.
