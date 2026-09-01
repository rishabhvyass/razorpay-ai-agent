# 🛍️ Mercora

> **Agentic Commerce Orchestration SDK**  
> *Make merchants transactable by AI agents with deterministic pricing, explicit human authorization gates, and cryptographic Razorpay verification.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment%20Provider-0C66E4.svg)](https://razorpay.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ⚡ Quickstart

```bash
npm install @mercora/core @mercora/razorpay
```

```typescript
import { Mercora, JsonCatalog } from '@mercora/core';
import { RazorpayProvider } from '@mercora/razorpay';

// 1. Initialize Mercora in 5 lines
const mercora = new Mercora({
  catalog: new JsonCatalog(products),
  payments: new RazorpayProvider({
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  }),
  policy: {
    requireUserApproval: true,
    maxTransactionAmountMinor: 1000000, // ₹10,000 ceiling
    currency: 'INR',
  },
});

// 2. Chat, propose purchase, and generate verified checkout link
const result = await mercora.chat({
  conversationId: 'sess_123',
  message: 'Find me black running shoes under ₹3,500',
});
```

---

## 🏛️ Architecture & Financial Guardrails

> **Core Principle: AI is not trusted with financial authority.**

Mercora separates conversational discovery from financial execution:

```text
USER INTENT
    ↓
AI AGENT / MCP TOOL
    ↓
TRUSTED CATALOG LOOKUP
    ↓
PURCHASE PROPOSAL (Server-calculated price: priceMinor * quantity)
    ↓
HUMAN AUTHORIZATION GATE (Explicit user click)
    ↓
MONEY ACTION POLICY (Caps, currency, inventory locks)
    ↓
RAZORPAY GATEWAY (Orders & Hosted Payment Links)
    ↓
SETTLEMENT (UPI / Card / Netbanking)
    ↓
VERIFIED WEBHOOK (Timing-safe HMAC-SHA256 signature verification)
    ↓
ORDER PAID & IMMUTABLE AUDIT LEDGER
```

---

## 📦 Packages

| Package | Description | Status |
| :--- | :--- | :--- |
| **`@mercora/core`** | Framework-independent Agentic Commerce Orchestrator, Money Action Policy, State Machine, and Audit Ledger. | `v0.1.0` |
| **`@mercora/razorpay`** | Direct Razorpay payment provider for Orders, Payment Links, and HMAC-SHA256 Webhooks. | `v0.1.0` |
| **`@mercora/mcp`** | Model Context Protocol server exposing bounded commerce tools to Claude & Cursor. | `v0.1.0` |
| **`@mercora/react`** | React 18/19 hooks (`useMercora`) and UI components (`ProductCard`, `PurchaseConfirmation`). | `v0.1.0` |
| **`@mercora/react-native`**| React Native CLI hooks and native UI adapters. | `v0.1.0` |

---

## 📂 Repository Structure

```text
mercora/
├── packages/
│   ├── core/                  # @mercora/core orchestration engine
│   ├── razorpay/              # @mercora/razorpay payment provider
│   ├── mcp/                   # @mercora/mcp tool server
│   ├── react/                 # @mercora/react web adapters
│   └── react-native/          # @mercora/react-native mobile adapters
│
├── examples/
│   └── demo-merchant/         # Minimal 10-line merchant integration demo
│
├── docs/                      # Comprehensive developer documentation
│   ├── quickstart.md          # 5-minute onboarding guide
│   ├── architecture.md        # System architecture and layer breakdown
│   ├── security.md            # Threat model & cryptographic guardrails
│   ├── money-policy.md        # Financial invariant engine specification
│   ├── razorpay.md            # Razorpay integration & webhook setup
│   ├── mcp.md                 # Model Context Protocol tools directory
│   ├── react.md               # React component & hook library
│   └── react-native.md        # Mobile integration guide
│
├── backend/                   # Express reference server consuming Mercora SDK
└── frontend/
    ├── Web/                   # React 19 + Tailwind CSS Reference Web App
    └── Mobile/                # React Native CLI Reference Mobile App
```

---

## 🧪 Testing & Validation

```bash
# Run Mercora Core SDK test suite
node packages/core/test/core.test.mjs

# Run Razorpay Provider test suite
node packages/razorpay/test/razorpay.test.mjs

# Run MCP Server test suite
node packages/mcp/test/mcp.test.mjs

# Run Merchant Demo
npm --prefix examples/demo-merchant run start

# Run full backend test suite (73/73 passing tests)
npm test
```

---

## 📄 License

MIT © Mercora
