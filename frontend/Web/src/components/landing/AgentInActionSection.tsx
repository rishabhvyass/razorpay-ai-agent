import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

interface PromptScenario {
  id: string;
  label: string;
  query: string;
  product: {
    name: string;
    price: string;
    stock: number;
    category: string;
    image: string;
  };
  tools: {
    name: string;
    desc: string;
    status: 'success' | 'gate' | 'waiting';
  }[];
}

const SCENARIOS: PromptScenario[] = [
  {
    id: 'hoodie',
    label: '🧥 Black Hoodies under ₹2,000',
    query: 'Find me a black hoodie under ₹2,000 with loopback cotton',
    product: {
      name: 'Midnight Zip Hoodie',
      price: '₹1,499.00',
      stock: 27,
      category: 'Clothing · 320 GSM',
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400',
    },
    tools: [
      { name: 'search_products(q: "hoodie", maxPrice: 200000)', desc: '2 items found in Postgres catalog (12ms)', status: 'success' },
      { name: 'check_inventory(productId: "ce8732a1...")', desc: 'Stock verified: 27 units ready for checkout', status: 'success' },
      { name: 'enforce_authorization_gate()', desc: 'Awaiting human authorization before link issuance', status: 'gate' },
      { name: 'draft_order(amount: 149900, qty: 1)', desc: 'Order drafted #ord_NxK7Pq2d', status: 'waiting' },
    ],
  },
  {
    id: 'shoes',
    label: '👟 Running Shoes under ₹3,500',
    query: 'Can you recommend running shoes under ₹3,500 for daily training?',
    product: {
      name: 'Everyday Runner',
      price: '₹3,499.00',
      stock: 24,
      category: 'Footwear · 8mm Drop',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    },
    tools: [
      { name: 'search_products(category: "shoes", maxPrice: 350000)', desc: 'Matched neutral daily trainers (16ms)', status: 'success' },
      { name: 'check_inventory(productId: "afc11a95...")', desc: 'Stock verified: 24 pairs available', status: 'success' },
      { name: 'enforce_authorization_gate()', desc: 'Human signature required for order confirmation', status: 'gate' },
      { name: 'draft_order(amount: 349900, qty: 1)', desc: 'Order drafted #ord_8b31a89c', status: 'waiting' },
    ],
  },
  {
    id: 'track',
    label: '📦 Track Recent Order',
    query: 'Track my recent order status',
    product: {
      name: 'Essential Black Hoodie',
      price: '₹1,799.00',
      stock: 42,
      category: 'Order #ORD-7A9B · PAID',
      image: 'https://images.unsplash.com/photo-1578768079052-aa76e5200291?w=400',
    },
    tools: [
      { name: 'get_order_by_id(id: "order_NxK7Pq2d")', desc: 'Fetched status: PAID from PostgreSQL ledger (8ms)', status: 'success' },
      { name: 'verify_razorpay_webhook_signature()', desc: 'HMAC-SHA256 signature verified: pay_QvR9mZ1x', status: 'success' },
      { name: 'generate_tracking_timeline()', desc: 'Timeline generated: 4 of 4 verification steps confirmed', status: 'success' },
    ],
  },
];

export function AgentInActionSection() {
  const [activeScenario, setActiveScenario] = useState<PromptScenario>(SCENARIOS[0]!);

  return (
    <section id="agent-in-action" className="py-20 bg-slate-50/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Interactive Inspector
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            See the agent think in actions.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Every customer message triggers discrete deterministic tool dispatches. Select a scenario below to see real-time tool execution.
          </p>
        </div>

        {/* Scenario Selection Chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {SCENARIOS.map((scenario) => {
            const isSelected = activeScenario.id === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => setActiveScenario(scenario)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-105'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>

        {/* Dual Pane Showcase */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left: Conversational Output */}
          <div className="p-6 lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-sm bg-purple-600 px-4 py-2.5 text-sm font-medium text-white max-w-sm">
                  {activeScenario.query}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-3 flex-1">
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    Here is the verified product from the PostgreSQL catalog matching your request:
                  </div>

                  {/* Product Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 flex items-center gap-3.5">
                    <img
                      src={activeScenario.product.image}
                      alt={activeScenario.product.name}
                      className="h-16 w-16 rounded-lg object-cover bg-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {activeScenario.product.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activeScenario.product.category}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {activeScenario.product.price}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          ● Verified Stock
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Database Query: Index-Backed</span>
              <span className="text-purple-600 font-semibold dark:text-purple-400">Human Approval Enabled</span>
            </div>
          </div>

          {/* Right: Real-time Tool Inspector Terminal */}
          <div className="p-6 lg:col-span-6 bg-slate-950 text-slate-300 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Tool Dispatch Log
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Deterministic Orchestrator
                </span>
              </div>

              <div className="space-y-3">
                {activeScenario.tools.map((tool, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    {tool.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : tool.status === 'gate' ? (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5 animate-spin" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-100">{tool.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{tool.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Postgres Transaction: ACID Compliant</span>
              <span className="text-emerald-400 font-bold">STATE SYNCED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
