import { Check, CreditCard, Lock, MessageSquare, PackageCheck, Search } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 md:py-28 bg-[#F8FAFC] dark:bg-[#090D16] border-y border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            How it works.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[54ch]">
            From natural conversation to cryptographic Razorpay verification in five continuous steps.
          </p>
        </div>

        {/* Continuous Editorial Timeline Flow */}
        <div className="mt-12 md:mt-14 space-y-4">
          {/* STEP 01 - ASK */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0C66E4] dark:text-[#388BFF] bg-[#EBF3FF] dark:bg-[#0C2147] px-2.5 py-0.5 rounded">
                  01
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Ask
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                The user describes intent naturally with constraints like budget, color, size, and use-case.
              </p>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E293B] dark:bg-[#0A0F1D]">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-white dark:bg-[#1E293B]">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-white">
                  "Find me running shoes under ₹3,500 for daily training."
                </div>
              </div>
            </div>
          </div>

          {/* STEP 02 - DISCOVER */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0C66E4] dark:text-[#388BFF] bg-[#EBF3FF] dark:bg-[#0C2147] px-2.5 py-0.5 rounded">
                  02
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Discover
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                The agent searches the merchant catalog using bounded database tools and extracts live verified inventory.
              </p>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E293B] dark:bg-[#0A0F1D] space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs text-[#0C66E4] dark:text-[#388BFF] gap-1">
                <span className="flex items-center gap-1.5 truncate">
                  <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">tool: search_products(category: "shoes", maxPrice: 350000)</span>
                </span>
                <span className="text-[#16A34A] dark:text-[#4ADE80] shrink-0">2 items found</span>
              </div>
              <div className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Verified stock: <strong>Everyday Runner</strong> (₹3,499.00, 24 in stock)
              </div>
            </div>
          </div>

          {/* STEP 03 - AUTHORIZE (The Centrality of Trust) */}
          <div className="rounded-2xl border-2 border-[#0C66E4] bg-[#EBF3FF]/60 p-5 sm:p-7 md:p-8 shadow-card dark:border-[#388BFF] dark:bg-[#0C2147]/50 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white bg-[#0C66E4] px-2.5 py-0.5 rounded">
                  03 · HUMAN GATE
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Authorize
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                Financial actions require explicit user approval. The AI cannot authorize money movement by itself.
              </p>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-[#CBD5E1] bg-white p-4 dark:border-[#334155] dark:bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0C66E4] text-white">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                    Confirm Purchase
                  </h4>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Order draft #ord_NxK7Pq2d · Total: <strong className="text-[#0F172A] dark:text-white nums">₹1,499.00</strong>
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-[#0C66E4] px-4 py-2.5 min-h-[40px] flex items-center justify-center text-center text-xs font-bold text-white shadow-xs w-full sm:w-auto">
                Confirm ₹1,499.00
              </div>
            </div>
          </div>

          {/* STEP 04 - PAY */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0C66E4] dark:text-[#388BFF] bg-[#EBF3FF] dark:bg-[#0C2147] px-2.5 py-0.5 rounded">
                  04
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Pay
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                The approved order moves into payment via Razorpay test mode sandbox.
              </p>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E293B] dark:bg-[#0A0F1D] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C66E4] text-white">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                    Razorpay Test Mode Session Active
                  </span>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                    Amount: ₹1,499.00 · Status: Payment Pending
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706] border border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FBBF24] dark:border-[#78350F]">
                Pending Settlement
              </span>
            </div>
          </div>

          {/* STEP 05 - VERIFY */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-subtle dark:border-[#1E293B] dark:bg-[#0F172A] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#16A34A] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#052E16] px-2.5 py-0.5 rounded">
                  05
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Verify
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                Payment becomes successful only after trusted Razorpay HMAC-SHA256 signature verification.
              </p>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 dark:border-[#14532D] dark:bg-[#052E16]/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      ✓ Payment Verified
                    </span>
                    <span className="text-[#94A3B8]">•</span>
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                      ✓ Order Confirmed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono mt-0.5 truncate">
                    Signature: valid (pay_QvR9mZ1x) · Order state → PAID
                  </p>
                </div>
              </div>
              <PackageCheck className="h-5 w-5 text-[#16A34A] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
