# Checkout Concierge

An AI-native commerce assistant. A conversation turns into a recommendation, the
user explicitly authorises the purchase, and only then does anything financial
happen — with payment success confirmed by Razorpay rather than assumed by the UI.

The governing principle, which the code is built around:

> The AI can recommend and request actions, but financial actions are explicitly
> gated, and payment success is verified by Razorpay.

```
Conversation → Recommendation → Explicit authorisation → Order → Payment
             → Verified webhook → Completed order
```

## Layout

| Path                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `backend/`          | Express + TypeScript API over Supabase. Owns all money logic.     |
| `frontend/Web/`     | Vite + React + TypeScript client. Consumes the backend only.      |
| `frontend/Mobile/`  | Empty placeholder.                                                |
| `frontend/Packages/`| Empty placeholders (`api-client`, `shared`).                      |
| `backend/supabase/` | `migrations/001_initial_schema.sql` and `seed.sql`.               |

The frontend contains **no** Claude, MCP, Razorpay or Supabase server-side logic
and holds no secrets. It reads product and order data from the backend, and never
computes or asserts a payment status of its own.

## Setting up on a new machine

### 1. Secrets

Nothing secret is in this repository. Copy the examples and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/Web/.env.example frontend/Web/.env
```

`backend/.env` needs real values for `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API keys).
Move those across out of band — not through a commit, an issue, or a chat log.

`frontend/Web/.env` only holds public `VITE_` values; the committed example is
already correct for local development.

### 2. Database

The schema has **not** been applied to the hosted Supabase project yet. Until it
is, every table read returns `404 … not found in the schema cache` and
`GET /api/products` answers `500`. In the Supabase dashboard SQL editor, run:

1. `backend/supabase/migrations/001_initial_schema.sql`
2. `backend/supabase/seed.sql`

### 3. Run it

```bash
cd backend      && npm install && npm run dev   # http://localhost:3000
cd frontend/Web && npm install && npm run dev   # http://localhost:5173
```

Vite proxies `/api` and `/health` to port 3000, so the browser stays same-origin
and there is no CORS to configure.

### 4. Agent skills (optional)

`.agents/skills/` is committed; the `.claude/skills/` symlinks that point at it
are per-machine and are not. Recreate them with:

```bash
npx skills add supabase/agent-skills
```

## Status

Backend: products, conversations, orders and activity endpoints work.
Not implemented yet — `POST /api/chat` (needs the Claude + MCP layer) and
`POST /api/webhooks/razorpay` (needs the payments layer).

Frontend: **work in progress and not yet runnable.** The config, design tokens,
types, services, hooks and components are complete, as are the checkout, products,
orders and order-detail pages. Still to do:

- Pages: dashboard, activity, settings, mock-checkout, not-found
- `src/App.tsx` (router) and `src/main.tsx` (entry point — `index.html` already
  points at it)
- Delete the leftover Vite scaffold: `src/App.jsx`, `src/main.jsx`, `src/App.css`,
  `vite.config.js`, and the template text in `frontend/Web/README.md`
- `src/vite-env.d.ts` for `import.meta.env` types
- Replace the JS-only `eslint.config.js` with a TypeScript flat config
- Then: `npm run typecheck`, `npm run lint`, `npm run build`

Because the chat and payment endpoints do not exist, the frontend serves those
two — and only those two — from `src/services/mock/` behind `VITE_USE_MOCK`. Every
simulated surface renders a visible "Simulated" marker, the flag is forced off in
production builds, and order creation is always real.
