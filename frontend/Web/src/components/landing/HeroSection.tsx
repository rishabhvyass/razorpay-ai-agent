import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Check, ChevronRight, Lock, ShieldCheck } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 md:pt-20 md:pb-28 bg-[#F8FAFC] dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Asymmetric Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Authoritative Editorial Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1 text-xs font-semibold text-[#0F172A] shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-white">
              <span className="flex h-2 w-2 rounded-full bg-[#0C66E4]" aria-hidden="true" />
              <span>Razorpay AI Builder Track 01</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#0C66E4] dark:text-[#388BFF] font-medium">Model Context Protocol</span>
            </div>

            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
              AI that doesn’t stop at recommendations. <br className="hidden sm:inline" />
              <span className="text-[#0C66E4] dark:text-[#388BFF]">It actually checks out.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-[48ch]">
              Checkout Concierge turns natural conversation into a complete, verified purchase through Razorpay.
            </p>

            {/* CTAs with 44px min touch targets */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/checkout"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0C66E4] px-6 py-3 text-[14px] font-semibold text-white shadow-blue-cta hover:bg-[#0047B3] active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
              >
                <Bot className="h-4 w-4" />
                <span>Try Checkout Concierge</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 text-[14px] font-semibold text-[#0F172A] shadow-subtle hover:bg-[#F8FAFC] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-white dark:hover:bg-[#1E293B] transition-all focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
              >
                <span>See how it works</span>
                <ChevronRight className="h-4 w-4 text-[#475569]" />
              </a>
            </div>

            {/* Invariant Trust Bar */}
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2.5 text-xs text-[#475569] dark:text-[#94A3B8]">
              <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
              <span>Bounded Financial Authority · Explicit Human Approval Invariant</span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Product & Authorization Gate */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-card dark:border-[#1E293B] dark:bg-[#0F172A]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#1E293B] dark:bg-[#0A0F1D]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A] dark:text-white">
                  <div className="h-2 w-2 rounded-full bg-[#16A34A]" />
                  <span>Agent Session · #sess_8910a</span>
                </div>
                <span className="rounded bg-[#EBF3FF] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#0C66E4] border border-[#0C66E4]/20 dark:bg-[#0C2147] dark:text-[#388BFF]">
                  Razorpay Sandbox
                </span>
              </div>

              {/* Chat Turn */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* User Intent Message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-xs bg-[#0F172A] px-4 py-2.5 text-xs sm:text-sm font-medium text-white max-w-sm dark:bg-[#1E293B]">
                    Find me a black hoodie under ₹2,000.
                  </div>
                </div>

                {/* Assistant Response */}
                <div className="space-y-3">
                  <div className="rounded-2xl rounded-tl-xs bg-[#F8FAFC] px-4 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:bg-[#1E293B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
                    I located the best match in the verified merchant catalog within your ₹2,000 budget.
                  </div>

                  {/* Verified Item Card */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A]">
                    <div className="flex items-center gap-3.5">
                      <img
                        src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300"
                        alt="Essential Black Hoodie front product view"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B]"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate">
                            Essential Black Hoodie
                          </h4>
                          <span className="text-[10px] font-semibold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0] dark:bg-[#052E16] dark:text-[#4ADE80] dark:border-[#14532D] shrink-0">
                            27 in stock
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">
                          320 GSM Cotton Fleece · Size: L
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-[#0F172A] dark:text-white nums">
                            ₹1,499.00
                          </span>
                          <span className="font-mono text-[10px] text-[#94A3B8]">
                            149900 paise
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Consent / Authorization Gate */}
                  <div className="rounded-xl border border-[#CBD5E1] bg-[#EBF3FF]/60 p-4 dark:border-[#334155] dark:bg-[#0C2147]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0C66E4] text-white shadow-xs">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                          Human Authorization Required
                        </span>
                        <span className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                          Order #ord_NxK7Pq2d · Total: <strong className="text-[#0F172A] dark:text-white nums">₹1,499.00</strong>
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/checkout"
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#0C66E4] px-4 py-2 text-xs font-bold text-white hover:bg-[#0047B3] transition-colors shadow-xs shrink-0 focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirm & Pay</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Stack Overview */}
        <div className="mt-12 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8] gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-[#64748B]">
              Architecture:
            </span>
            <span>AI Agent Core</span>
            <span>•</span>
            <span>Model Context Protocol (MCP)</span>
            <span>•</span>
            <span>Supabase PostgreSQL</span>
            <span>•</span>
            <span className="font-semibold text-[#0C66E4] dark:text-[#388BFF]">Razorpay Sandbox</span>
          </div>

          <span className="font-mono text-[11px] text-[#94A3B8]">
            HMAC-SHA256 Webhook Proofs
          </span>
        </div>
      </div>
    </section>
  );
}
