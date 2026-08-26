import {
  Coins,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const PILLARS = [
  {
    icon: Coins,
    title: 'Zero Hallucinated Pricing',
    description:
      'All product pricing and total calculations are computed strictly in server-side minor units (paise). The LLM is mathematically prevented from inventing prices or discounts.',
  },
  {
    icon: ShieldCheck,
    title: 'Guarded Transactions',
    description:
      'Money movement cannot be triggered autonomously. Every payment link issuance requires explicit human confirmation via standard biometrics or button press.',
  },
  {
    icon: Zap,
    title: 'Cryptographic Webhook Sync',
    description:
      'Order fulfillment is triggered solely upon cryptographic verification of Razorpay HMAC-SHA256 webhook signatures, establishing true backend provenance.',
  },
];

export function WhyAgenticSection() {
  return (
    <section className="py-20 bg-slate-50/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Core Principles
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Why agentic commerce.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Three foundational architectural invariants that separate Checkout Concierge from fragile chatbot prototypes.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs hover:border-purple-200 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-900/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 mb-5">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
