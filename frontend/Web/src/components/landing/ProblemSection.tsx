import { Check, X } from 'lucide-react';

const TRADITIONAL_STEPS = [
  'Ask AI for recommendations',
  'Receive product text links',
  'Leave conversational session',
  'Manually navigate merchant checkout',
  'Enter payment details in separate tab',
  'Return to chat with lost context',
];

const CONCIERGE_STEPS = [
  'Natural language product search',
  'Verified catalog recommendation',
  'Explicit in-line human authorization',
  'Integrated Razorpay checkout session',
  'Cryptographic HMAC confirmation',
];

export function ProblemSection() {
  return (
    <section id="problem" className="py-16 sm:py-20 md:py-28 bg-white dark:bg-[#090D16]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Headline */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            AI can tell you what to buy. <br />
            <span className="text-[#475569] dark:text-[#94A3B8]">
              But the checkout still lives somewhere else.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-[56ch]">
            Shopping with conversational AI usually hits a brick wall at the moment of purchase. You get links, paste URLs, switch tabs, and lose the conversational context entirely.
          </p>
        </div>

        {/* Side-by-Side Comparison Flow */}
        <div className="mt-12 md:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Traditional Fragmented Flow */}
          <div className="lg:col-span-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-7 dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center gap-2.5 text-[#DC2626] dark:text-[#F87171] mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] dark:bg-[#450A0A]">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                The Traditional Fragmented Flow
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mb-5">
              6 disjointed steps across multiple applications and tabs. High friction and drop-off.
            </p>

            <ol className="space-y-2.5 list-none p-0 m-0">
              {TRADITIONAL_STEPS.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#475569] dark:border-[#1E293B] dark:bg-[#0A0F1D] dark:text-[#94A3B8]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-[#94A3B8] dark:text-[#64748B] shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="truncate">{step}</span>
                  </div>
                  {idx === 2 || idx === 5 ? (
                    <span className="rounded bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626] dark:bg-[#450A0A] dark:text-[#F87171] shrink-0">
                      Context Lost
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {/* Checkout Concierge Unified Flow */}
          <div className="lg:col-span-6 rounded-2xl border border-[#CBD5E1] bg-[#EBF3FF]/40 p-5 sm:p-7 dark:border-[#334155] dark:bg-[#0C2147]/30">
            <div className="flex items-center gap-2.5 text-[#16A34A] dark:text-[#4ADE80] mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] dark:bg-[#052E16]">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Checkout Concierge Unified Flow
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mb-5">
              1 continuous, verified conversation with safe in-line financial authorization.
            </p>

            <ol className="space-y-2.5 list-none p-0 m-0">
              {CONCIERGE_STEPS.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#0F172A] shadow-subtle dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#0C66E4] dark:text-[#388BFF] shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="truncate">{step}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] dark:text-[#4ADE80] shrink-0">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>In-Session</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
