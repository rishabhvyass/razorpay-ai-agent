import { Check, ShieldAlert, ShieldCheck, X } from 'lucide-react';

const PERMITTED_SCOPE = [
  'Query live PostgreSQL catalog with semantic and category filters',
  'Rank and recommend items strictly within customer budget ceilings',
  'Compare real-time stock levels, sizes, and colorway availability',
  'Draft order manifests using deterministic minor-unit calculations (paise)',
  'Request explicit customer cryptographic authorization for checkout sessions',
];

const HARD_INVARIANTS = [
  'Zero autonomous charge capability. AI cannot self-authorize funds movement',
  'Zero price modification. Cannot override minor-unit prices locked in database',
  'Zero unsolicited checkout links. Sessions issued only after explicit user click',
  'Zero unverified success states. Orders transition to PAID only via verified webhook',
  'Zero inventory bypass. All stock changes enforced via ACID database locks',
];

const POLICY_PIPELINE = [
  { step: '01', title: 'Intent Parsing', desc: 'Customer natural language query' },
  { step: '02', title: 'Policy Interceptor', desc: 'Bounds arguments & price ceiling' },
  { step: '03', title: 'Human Consent Gate', desc: 'Explicit user authorization click' },
  { step: '04', title: 'ACID Validation', desc: 'Server locks price & inventory' },
  { step: '05', title: 'Razorpay Gateway', desc: 'Test mode payment session issued' },
];

export function SafetySection() {
  return (
    <section id="safety" className="py-16 sm:py-20 md:py-28 bg-white dark:bg-[#090D16]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            AI can request. <br />
            <span className="text-[#0C66E4] dark:text-[#388BFF]">It cannot authorize.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-[54ch]">
            The fundamental boundary of agentic commerce: the AI possesses conversational freedom, but zero financial autonomy. Every movement of funds is mathematically gated.
          </p>
        </div>

        {/* Financial Security Invariant Matrix */}
        <div className="mt-12 md:mt-14 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#1E293B] dark:bg-[#0F172A] grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] dark:divide-[#1E293B]">
          {/* Column 1: Permitted Scope */}
          <div className="p-5 sm:p-7 md:p-8 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F0FDF4] text-[#16A34A] dark:bg-[#052E16] dark:text-[#4ADE80]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Permitted Agent Capabilities
              </h3>
            </div>

            <div className="space-y-3">
              {PERMITTED_SCOPE.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A] dark:text-white">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#BBF7D0]/70 text-[#16A34A] mt-0.5 dark:bg-[#14532D]">
                    <Check className="h-2.5 w-2.5" aria-hidden="true" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Hard Invariants */}
          <div className="p-5 sm:p-7 md:p-8 space-y-6 bg-white/60 dark:bg-[#0A0F1D]/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FEF2F2] text-[#DC2626] dark:bg-[#450A0A] dark:text-[#F87171]">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Hard Enforced Security Invariants
              </h3>
            </div>

            <div className="space-y-3">
              {HARD_INVARIANTS.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A] dark:text-white">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FECACA] text-[#DC2626] mt-0.5 dark:bg-[#7F1D1D]">
                    <X className="h-2.5 w-2.5" aria-hidden="true" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Money Action Policy Pipeline */}
        <div className="mt-10 md:mt-12 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-7 dark:border-[#1E293B] dark:bg-[#0F172A]">
          <h3 className="font-mono text-xs font-bold text-[#0C66E4] dark:text-[#388BFF] uppercase tracking-wider mb-4">
            Money Action Policy Execution Pipeline
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {POLICY_PIPELINE.map((node, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-subtle dark:border-[#1E293B] dark:bg-[#0A0F1D] flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[#94A3B8] dark:text-[#64748B]">
                    {node.step}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white mt-0.5">
                    {node.title}
                  </h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1">
                    {node.desc}
                  </p>
                </div>
                {idx === 2 ? (
                  <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[10px] font-bold text-[#0C66E4] dark:text-[#388BFF] uppercase">
                    HUMAN GATE
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
