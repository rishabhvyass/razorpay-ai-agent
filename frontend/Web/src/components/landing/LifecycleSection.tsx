import {
  CheckCircle2,
  CreditCard,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Ask',
    badge: 'Intent Parsing',
    description: 'User queries natural language intent with budget & filters like "Find running shoes under ₹3,500".',
    icon: MessageSquare,
    color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  },
  {
    step: '02',
    title: 'Recommend',
    badge: 'Deterministic Search',
    description: 'PostgreSQL catalog queries exact live inventory and minor-unit prices. Zero hallucinated values.',
    icon: Sparkles,
    color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    step: '03',
    title: 'Confirm',
    badge: 'Human-in-the-Loop',
    description: 'Customer explicitly approves purchase details before any order or payment link is issued.',
    icon: ShieldCheck,
    color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    step: '04',
    title: 'Pay',
    badge: 'Razorpay Gateway',
    description: 'Instant secure checkout link issued for UPI, QR codes, Cards, and 50+ Netbanking banks.',
    icon: CreditCard,
    color: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  {
    step: '05',
    title: 'Verify',
    badge: 'Cryptographic Proof',
    description: 'Razorpay webhook signature verified with SHA-256 HMAC, updating order to PAID in real time.',
    icon: PackageCheck,
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
];

export function LifecycleSection() {
  return (
    <section id="how-it-works" className="py-20 bg-slate-50/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            End-to-End Workflow
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            From conversation to confirmation.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            How natural language intent transforms into a mathematically verified, paid order with complete security.
          </p>
        </div>

        {/* 5-Step Connected Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  {/* Top Step Number & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                      STEP {item.step}
                    </span>
                    <div className={`p-2 rounded-xl border ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <div className="mt-1 inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {item.badge}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Deterministic State</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
