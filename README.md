<div align="center">

# 🛍️ MERCORA

### Make merchants AI-transactable.

**A conversational commerce surface where an AI agent finds the product, a human authorises the spend, and Razorpay — not the model — moves the money.**

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-Open-3B82F6?style=for-the-badge&labelColor=111827)](https://mercora-coral.vercel.app/)
&nbsp;
[![Watch the demo](https://img.shields.io/badge/🎥%20Watch%20the%20Demo-F59E0B?style=for-the-badge&labelColor=111827)](#-demo)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Verified%20Webhooks-0C66E4?style=flat-square&logo=razorpay&logoColor=white)](https://razorpay.com/)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)](LICENSE)

</div>

---

## 🎥 Demo

<!--
  TWO THINGS TO FILL IN, both marked with obvious placeholders:

  1. LIVE URL  — replace every occurrence of  YOUR-LIVE-URL  with the deployed
     web origin, e.g.  mercora.vercel.app  (no https:// inside the badge link,
     the badge already has it; do include it in the plain links below).

  2. DEMO VIDEO — GitHub does not render a video committed to the repo. Open any
     issue or release draft on this repository, drag the .mp4 / .mov into the
     comment box, and GitHub returns a URL like
       https://github.com/user-attachments/assets/<uuid>
     Paste that URL on its own line where YOUR-DEMO-VIDEO-URL sits below and
     GitHub renders an inline player. Cancel the draft — the asset URL survives.
     Hosting it on YouTube or Loom instead? Delete the bare-URL line and keep
     the thumbnail link version underneath it.
-->

https://YOUR-DEMO-VIDEO-URL

<!-- Fallback for a YouTube / Loom link — delete the line above and use this:
[![Watch the demo](https://img.shields.io/badge/▶%20Play%20the%20walkthrough-111827?style=for-the-badge)](https://YOUR-DEMO-VIDEO-URL)
-->

| | |
| :-- | :-- |
| 🌐 **Live app** | <https://mercora-coral.vercel.app/> |
| 💬 **Talk to the agent** | <https://mercora-coral.vercel.app/checkout> |
| 📊 **Agent activity trail** | <https://mercora-coral.vercel.app/activity> |
| 📦 **Orders** | <https://mercora-coral.vercel.app/orders> |
| 🔌 **Integrate page** | <https://mercora-coral.vercel.app/integrate> |

> The live deployment runs Razorpay in **test mode**. Use Razorpay's test card
> `4111 1111 1111 1111` with any future expiry and any CVV. No real money moves.

---

## ⚡ What this is

A working two-deployable application, not a paper design.

- **A conversational storefront.** You describe what you want in plain language.
  The agent searches a real catalogue, proposes a specific product at a
  server-calculated price, and waits.
- **An explicit authorisation gate.** Nothing is charged until a human clicks
  the approve button. The API refuses a payment request that does not carry
  `{ "approved": true }`.
- **Razorpay Standard Checkout and Payment Links.** Both paths are wired, and
  both end at the same place: an order is marked `PAID` only by an
  HMAC-SHA256-verified webhook.
- **A transparent activity trail.** Every tool call the agent made, every state
  transition, every payment event — readable, in order, per conversation.

> **Core principle: the model is never trusted with financial authority.**
> The agent can search, describe and propose. It cannot price, approve, charge,
> or decide that a payment succeeded.

---

## 🏛️ The money path

```text
USER INTENT
    ↓
AI AGENT  (tool-calling: search_products, get_product, propose_purchase)
    ↓
TRUSTED CATALOG LOOKUP  (the price comes from Postgres, never from the model)
    ↓
PURCHASE PROPOSAL  (server-calculated: priceMinor × quantity, in paise)
    ↓
HUMAN AUTHORIZATION GATE  ({ "approved": true } or HTTP 400)
    ↓
MONEY ACTION POLICY  (per-order cap, currency, quantity + stock limits)
    ↓
RAZORPAY  (Order for Standard Checkout, or a hosted Payment Link)
    ↓
SETTLEMENT  (UPI · card · netbanking · wallet)
    ↓
VERIFIED WEBHOOK  (timing-safe HMAC-SHA256 over the raw request bytes)
    ↓
ORDER PAID  +  APPEND-ONLY AUDIT LEDGER
```

---

## 🔒 Financial guardrails

| Guardrail | How it is enforced |
| :--- | :--- |
| **The model never sets a price** | `propose_purchase` takes a product id and a quantity. The amount is recomputed server-side as `priceMinor × quantity` from the catalogue row. |
| **No charge without a human** | `POST /api/orders/:id/payment-link` and `POST /api/create-order` reject any body without `{ "approved": true }`. |
| **Per-order ceiling** | `MAX_ORDER_AMOUNT_MINOR = 500_000` (₹5,000) and `MAX_ORDER_QUANTITY = 10`, in `policy/moneyActionPolicy.ts`. |
| **One legal path to PAID** | Only `paymentService.applyProviderState`, called from a signature-verified webhook, may write `PAID`. No UI action and no agent tool can. |
| **Timing-safe verification** | HMAC-SHA256 over the **raw** request bytes, compared with `crypto.timingSafeEqual`. A re-serialised body fails closed rather than verifying wrong. |
| **A guarded state machine** | `PENDING_CONFIRMATION → ORDER_CREATED → PAYMENT_PENDING → PAID │ PAYMENT_FAILED │ PAYMENT_EXPIRED │ CANCELLED`, with the legal transitions declared in one table. |
| **Integer money only** | Amounts are paise (minor units) end to end — database, API and agent tool arguments. No float touches the money path. Exactly one module per tier is allowed to convert for display: `backend/src/utils/money.ts` and `frontend/Web/src/lib/money.ts`. |
| **Test keys outside production** | `config/env.ts` refuses to boot on a live `rzp_` key while `NODE_ENV !== 'production'`. |
| **All three Razorpay keys, or none** | A partial set is the one genuinely dangerous state — able to take money, unable to verify it arrived — so the server refuses to start. With none set, payment routes answer `501` and everything else works. |
| **Secrets stay server-side** | The service-role key and both Razorpay secrets are read only in `backend/`. Nothing secret is ever exposed to a `VITE_` variable, and the settings screen shows key **presence**, never a value. |

---

## 🗺️ What's in the box

```text
razorpay-ai-agent/
├── backend/                      Express 5 API · the only tier that holds a secret
│   ├── src/
│   │   ├── api/                  products · conversations · orders · payments
│   │   │                         checkout · webhooks · chat · health
│   │   ├── services/             agentService · agentTools · checkoutService
│   │   │                         paymentService · razorpayClient · healthService
│   │   ├── policy/               moneyActionPolicy · orderStateMachine
│   │   ├── repositories/         the only code that talks to Postgres
│   │   ├── middleware/           requestId · errorHandler
│   │   ├── utils/                money.ts (integer paise) · errors.ts (typed)
│   │   ├── config/               env.ts — fail-fast validation, prints names only
│   │   └── server.ts             app assembly, mount order, default export
│   ├── scripts/                  smoke + safety + schema harnesses, setup SQL printer
│   └── supabase/                 migrations and seed data
│
├── frontend/Web/                 React 19 · Vite · Tailwind v4 · TanStack Query
│   └── src/
│       ├── pages/                landing · dashboard · checkout · products
│       │                         product detail · orders · order detail
│       │                         activity · integrate · settings · 404
│       ├── components/           agent · chat · checkout · dashboard · integrate
│       │                         landing · layout · motion · orders · products · ui
│       ├── services/             typed API clients, mock-mode aware
│       └── lib/                  money · format · motion tokens · redact · session
│
└── scripts/doctor.mjs            "what works right now, and what is missing?"
```

---

## 🚀 Run it locally

Node **22 or newer**. Four commands:

```bash
npm run install:all
```

```bash
cp backend/.env.example backend/.env
```

```bash
npm run doctor
```

```bash
npm run dev
```

Then open <http://localhost:5173>. The API runs on `:3000` and Vite proxies
`/api` and `/health` to it, so there is no CORS setup to do.

**`npm run doctor` is the one to run when something is wrong.** It answers a
single question — *what works right now, and what is missing?* — and it runs on a
bare clone before anything is installed, because it depends on nothing but Node.
It checks both dependency trees, both `.env` files, probes the Supabase project,
lists which features are live, and prints the next command to type. It reports
whether a value is **present**; it never prints a value, a prefix of one, or even
its length.

> ⚠️ **This is deliberately not an npm workspace.** The backend and the web
> client have separate lockfiles because they are separately deployable, and
> hoisting would put browser packages inside the backend's import resolver —
> which is exactly how a browser-only package ends up in the process that holds
> the service-role key. So the root has no dependencies of its own and
> `npm install` at the root installs **nothing**. Skip `install:all` and the
> build fails as a bare exit code `127`. `npm run doctor` names that first.

### Zero-key demo

Set `VITE_USE_MOCK=true` in `frontend/Web/.env` and the whole checkout flow runs
against in-memory fixtures — no Supabase project, no Razorpay account, no model
provider. Useful for a UI pass; it proves nothing about payments.

---

## ⚙️ Configuration

`backend/.env` — **server only. Nothing here belongs in a browser bundle.**

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `SUPABASE_URL` | ✅ | Project URL. |
| `SUPABASE_ANON_KEY` | ✅ | Row-level-security-respecting key. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Bypasses RLS entirely.** Backend only — never in a `VITE_` variable, never in a client. |
| `PORT` | — | Defaults to `3000`. |
| `NODE_ENV` | — | Outside `production`, a live `rzp_` key is refused at boot. |
| `RAZORPAY_KEY_ID` | ⚖️ | **All three or none.** With none set, payment routes answer `501` and the rest of the app works. |
| `RAZORPAY_KEY_SECRET` | ⚖️ | Backend only. |
| `RAZORPAY_WEBHOOK_SECRET` | ⚖️ | Backend only. A string you invent, then enter under Razorpay → Settings → Webhooks. Minimum 8 characters. |
| `OPENAI_API_KEY` | 🔀 | Any **one** provider key turns on the agent. Precedence: OpenAI → xAI/Grok → OpenRouter. Without one, `POST /api/chat` answers `501` and every other route still works. |
| `AGENTROUTER_API_KEY` | 🔀 | Routed as xAI when it carries an `xai-` prefix, otherwise as an OpenRouter-compatible endpoint. |
| `OPENROUTER_API_KEY` | 🔀 | OpenAI-compatible client against OpenRouter. |

`frontend/Web/.env` — public by definition; everything here ships to the browser.

| Variable | Notes |
| :--- | :--- |
| `VITE_API_URL` | Leave blank locally to use the Vite proxy. Set it to the API origin in production. |
| `VITE_USE_MOCK` | `true` runs the fixture-backed demo with no keys at all. |
| `VITE_RAZORPAY_KEY_ID` | The **publishable** key id only. The key secret and the webhook secret must never be copied into a `VITE_` variable. |

---

## 🔌 API surface

| | |
| :--- | :--- |
| **Catalogue** | `GET /api/products` · `GET /api/products/categories` · `GET /api/products/:id` |
| **Conversation** | `POST /api/conversations` · `GET /api/conversations/:id` · `GET` + `POST /api/conversations/:id/messages` · `GET /api/conversations/:id/activity` |
| **Agent** | `POST /api/chat` — tool-calling loop; `501` until a provider key is set |
| **Orders** | `POST /api/orders` · `GET /api/orders/:id` · `GET /api/orders/:id/activity` · `GET /api/users/:userId/orders` |
| **Payment Links** | `POST /api/orders/:id/payment-link` *(requires `{ "approved": true }`)* · `GET /api/orders/:id/payment` · `POST /api/orders/:id/payment/refresh` |
| **Standard Checkout** | `POST /api/create-order` *(requires `{ "approved": true }`)* · `POST /api/cancel-checkout` · `POST /api/verify-payment` |
| **Webhook** | `POST /api/webhooks/razorpay` — raw-body HMAC-SHA256. The only route that can write `PAID`. |
| **Health** | `GET /health` · `GET /health/ready` |

---

## 🧪 Tests

```bash
npm test
```

That runs the backend chain in order — build, then:

| Stage | What it proves | Result |
| :--- | :--- | :--- |
| `typecheck:ai-sdk` | Both AI SDKs still compile under a plain, deployment-like tsconfig, not just the repo's own. | compile-only |
| `test:ai-sdk` | The SDKs and `agentService` load and construct clients. | pass |
| `test:safety` | The order state machine refuses every illegal transition, and only a verified webhook reaches `PAID`. | **11 / 11** |
| `test:logic` | Pricing, paise arithmetic, policy caps, payment-attempt resolution, failure reasons. | **128 / 128** |
| `test:http` | Live HTTP contract against a running server, including the `501` shapes when no keys are set. | needs a bound port |
| `test:http:prod` | The same contract with production-mode headers. | needs a bound port |

```bash
npm run test:schema
```

Runs the migrations against an in-process PGlite database and verifies all seven
tables — `profiles`, `products`, `conversations`, `messages`, `orders`,
`agent_actions`, `payment_events` — plus their constraints, with no cloud project
involved.

---

## ☁️ Deploy

Two Vercel projects from one repository, each rooted at the package that owns its
lockfile. **Do not point a project at the repository root** — the root installs
nothing, and one project cannot have two output directories.

| Setting | API project | Web project |
| :--- | :--- | :--- |
| **Root Directory** | `backend` | `frontend/Web` |
| **Framework Preset** | Other | Vite |
| **Install Command** | `npm ci` *(default)* | `npm ci` *(default)* |
| **Build Command** | `npm run build` → `tsc` | `npm run build` → `tsc -b && vite build` |
| **Output Directory** | n/a — serverless function | `dist` |
| **Node version** | 22.x *(pin it; `engines` is a floor, not a pin)* | 22.x |

Then:

1. Set `NODEJS_HELPERS=0` on the **API** project. Without it the runtime parses
   and re-serialises the request body, and the webhook's HMAC no longer sees the
   bytes Razorpay signed. The handler fails closed rather than verifying wrong —
   so every delivery is rejected. It is not optional.
2. Set `VITE_API_URL` on the **Web** project to the API origin.
3. Point the Razorpay webhook at `https://<api-origin>/api/webhooks/razorpay`.

Full reasoning, the exact failure modes, and the reproduction for build error
`127` are in **section 14 of [backend/README.md](backend/README.md)**.

---

## 🎨 Design system

Flat, bold, geometric, print-inspired. High contrast, zero artificial depth — no
glass, no gradients, no floating cards, `shadow-none` throughout.

| Token | Value | | Token | Value |
| :--- | :--- | :-- | :--- | :--- |
| background | `#FFFFFF` | | muted | `#F3F4F6` |
| foreground | `#111827` | | border | `#E5E7EB` |
| primary | `#3B82F6` | | type | Outfit |
| secondary | `#10B981` | | radius | 6–8px |
| accent | `#F59E0B` | | headings | `-0.02em` |

Motion is presentation only. Timings live in one module, `prefers-reduced-motion`
is honoured, and **no animation ever implies a backend event that has not
happened** — a status does not animate into `PAID` until the database says `PAID`.
See [DESIGN.md](DESIGN.md).

---

## 📄 License

MIT — see [LICENSE](LICENSE).

<div align="center">
<sub>Built with Razorpay in test mode. The agent proposes; a human authorises; the webhook decides.</sub>
</div>





