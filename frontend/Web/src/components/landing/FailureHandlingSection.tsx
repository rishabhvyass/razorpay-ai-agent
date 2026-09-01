import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

export function FailureHandlingSection() {
  return (
    <section className="py-16 sm:py-20 md:py-28 bg-white dark:bg-[#090D16]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Rationale & Explanations */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
              Trust also means knowing when not to say success.
            </h2>

            <p className="text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-[48ch]">
              If an OTP fails, a checkout window is closed prematurely, or a bank rejects a charge, Checkout Concierge never hallucinates a successful transaction. The order state remains pending or failed, and the customer is offered clean recovery paths.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Zero fake success feedback — state changes only upon verified webhook</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Saved draft order preserves basket items without starting over</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Instant recovery to retry via QR code, alternate card, or cancel cleanly</span>
              </div>
            </div>
          </div>

          {/* Right Column: Failure State Demonstration Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 md:p-8 shadow-card dark:border-[#1E293B] dark:bg-[#0F172A] space-y-5">
              {/* Failure Notice Header */}
              <div className="flex items-start gap-3.5 p-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2]/60 dark:border-[#7F1D1D] dark:bg-[#450A0A]/30">
                <div className="p-1.5 rounded-full bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D] dark:text-[#F87171] shrink-0">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                    Payment wasn't completed
                  </h4>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                    No successful payment was verified by Razorpay. Your account was not charged.
                  </p>
                </div>
              </div>

              {/* Order State Context */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-[#1E293B] dark:bg-[#0A0F1D] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#475569] dark:text-[#94A3B8]">Draft Order: #ord_NxK7Pq2d</span>
                  <span className="font-bold text-[#0F172A] dark:text-white nums">₹1,499.00</span>
                </div>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  Your cart items are reserved for 15 minutes. Would you like to try again?
                </p>

                {/* Actions with 44px min height touch target */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                  <button className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0C66E4] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0047B3] transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-[#0C66E4]">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Try again</span>
                  </button>
                  <button className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-white dark:hover:bg-[#1E293B] transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4]">
                    Cancel order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
