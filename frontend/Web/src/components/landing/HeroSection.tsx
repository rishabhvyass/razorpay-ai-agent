import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Code2,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

const CAPABILITY_PILLS = [
  { icon: Sparkles, label: 'Autonomous Catalog Search' },
  { icon: ShieldCheck, label: 'Guarded Money Actions' },
  { icon: Zap, label: 'Razorpay Webhook Verification' },
  { icon: Package, label: 'Live PostgreSQL Order Sync' },
  { icon: Lock, label: 'Immutable Audit Log' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background Soft Purple/Indigo Radial Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-purple-400/20 via-indigo-400/15 to-transparent blur-3xl dark:from-purple-900/30 dark:via-indigo-900/20" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50/80 px-4 py-1.5 text-xs font-semibold text-purple-700 shadow-sm backdrop-blur-sm dark:border-purple-800/60 dark:bg-purple-950/50 dark:text-purple-300">
            <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            <span>AI-Native Autonomous Commerce Agent</span>
            <span className="text-purple-300 dark:text-purple-700">•</span>
            <span className="font-bold text-purple-800 dark:text-purple-200">Razorpay Verified</span>
          </div>
        </div>

        {/* Main Hero Heading */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
            AI can recommend almost anything. <br />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent">
              But recommendations aren’t transactions.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-300 leading-relaxed">
            Checkout Concierge bridges natural language product search with deterministic PostgreSQL transactions, strict human authorization gates, and cryptographic Razorpay webhook verification.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2.5 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-500/25 hover:bg-purple-700 hover:shadow-purple-500/35 active:scale-[0.98] transition-all"
            >
              <Bot className="h-5 w-5" />
              <span>Launch Live Agent Demo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#agent-in-action"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
            >
              <Code2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Inspect Architecture</span>
            </a>
          </div>
        </div>

        {/* Capability Pills Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {CAPABILITY_PILLS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
              >
                <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Interactive Dual-Pane Hero Showcase Card */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-purple-950/10 dark:border-slate-800 dark:bg-slate-900">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400/80" />
              <div className="h-3 w-3 rounded-full bg-amber-400/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                checkout-concierge.agent-orchestration
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Agent Status: Online (Test Mode)
              </span>
            </div>
          </div>

          {/* Dual Column Layout: Left Conversational UI, Right Agent Action Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Left: Chat Turn & Interactive Product Card */}
            <div className="p-6 lg:col-span-7 flex flex-col justify-between bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/40">
              <div className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm max-w-sm">
                    Find me a black hoodie under ₹2,000
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100 max-w-md">
                      I searched our catalog in PostgreSQL. Here is the verified option under your budget:
                    </div>

                    {/* Interactive Product Preview Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 max-w-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300"
                          alt="Midnight Zip Hoodie"
                          className="h-16 w-16 rounded-lg object-cover bg-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            Midnight Zip Hoodie
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            320 GSM Loopback Cotton · Black
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              ₹1,499.00
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ● In Stock: 27
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Link
                          to="/checkout"
                          className="flex-1 rounded-lg bg-purple-600 py-2 text-center text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-xs"
                        >
                          Authorize Purchase
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Typing Bar */}
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-800 dark:bg-slate-800">
                <input
                  type="text"
                  placeholder="Ask Concierge e.g. 'Can you recommend running shoes under ₹3,500?'"
                  className="flex-1 bg-transparent px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-white"
                  readOnly
                  value="Find me a black hoodie under ₹2,000"
                />
                <Link
                  to="/checkout"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right: Live Agent Action Inspector Terminal */}
            <div className="p-6 lg:col-span-5 bg-slate-950 text-slate-300 font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Agent Execution Trace
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans">
                    Real-time Tool Dispatch
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-100">search_products(q: "hoodie", maxPrice: 200000)</div>
                      <div className="text-[11px] text-slate-400">Matched 2 items in Postgres catalog (14ms)</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-100">check_inventory(productId: "ce8732a1...")</div>
                      <div className="text-[11px] text-slate-400">Stock verified: 27 units available</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-purple-400">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-100">enforce_human_authorization_gate()</div>
                      <div className="text-[11px] text-slate-400">Direct money movement paused pending user confirmation</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-amber-400">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
                    <div>
                      <div className="font-semibold text-slate-100">awaiting_user_confirmation()</div>
                      <div className="text-[11px] text-slate-400">Draft Order created: #ord_NxK7Pq2d (₹1,499.00)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terminal Signature Footer */}
              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Webhook Signature: SHA256 Verified</span>
                <span className="text-emerald-400 font-bold">PG LOCKED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
