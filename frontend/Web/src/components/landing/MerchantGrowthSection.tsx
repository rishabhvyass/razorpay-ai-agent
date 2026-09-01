import { Check, Sparkles } from 'lucide-react';

export function MerchantGrowthSection() {
  return (
    <section className="py-16 sm:py-20 md:py-28 bg-[#F8FAFC] dark:bg-[#090D16] border-y border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Editorial Explanation */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
              Complementary discovery with customer control.
            </h2>

            <p className="text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-[48ch]">
              AI can surface relevant additional items naturally during the conversation without coercive patterns or unsolicited cart additions. The customer chooses whether to include recommendations.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <Check className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Context-aware complementary product discovery</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <Check className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Transparent separate line-item breakdown</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-white">
                <Check className="h-4 w-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Customer confirms basket changes before checkout session updates</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Demonstration */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 md:p-8 shadow-card dark:border-[#1E293B] dark:bg-[#0F172A] space-y-4">
              {/* Turn 1: User request */}
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-xs bg-[#0F172A] px-4 py-2 text-xs sm:text-sm text-white dark:bg-[#1E293B]">
                  Buy this hoodie.
                </div>
              </div>

              {/* Turn 2: Agent recommendation */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] text-[#0C66E4] dark:bg-[#0C2147] dark:text-[#388BFF]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-[#F8FAFC] p-3 text-xs sm:text-sm text-[#0F172A] dark:bg-[#0A0F1D] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
                  I can also show a complementary pair of running shoes to complete your setup.
                </div>
              </div>

              {/* 2-Product Showcase Card */}
              <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#334155] dark:bg-[#0A0F1D] space-y-2.5">
                {/* Primary item */}
                <div className="flex items-center justify-between bg-white dark:bg-[#0F172A] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=120"
                      alt="Midnight Zip Hoodie"
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                        Midnight Zip Hoodie
                      </h4>
                      <span className="text-[11px] text-[#475569] dark:text-[#94A3B8]">Primary Intent</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0F172A] dark:text-white nums">
                    ₹1,499.00
                  </span>
                </div>

                {/* Complementary item */}
                <div className="flex items-center justify-between bg-white dark:bg-[#0F172A] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120"
                      alt="Everyday Runner"
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                        Everyday Runner
                      </h4>
                      <span className="text-[11px] text-[#0C66E4] dark:text-[#388BFF] font-semibold">Complementary Match</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0F172A] dark:text-white nums">
                    ₹3,499.00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
