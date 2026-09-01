import {
  ArrowDown,
  Bot,
  CheckCircle2,
  CreditCard,
  Database,
  MessageSquare,
  PackageCheck,
  UserCheck,
  Zap,
} from 'lucide-react';

const FLOW_STEPS = [
  {
    icon: MessageSquare,
    actor: 'CUSTOMER',
    action: 'Intent Query',
    detail: '"Find me a black hoodie under ₹2,000"',
    badge: 'Step 1',
  },
  {
    icon: Bot,
    actor: 'AGENT ORCHESTRATOR',
    action: 'Tool Execution: search_products()',
    detail: 'Direct SQL query against Postgres database catalog with minor-unit price filtering',
    badge: 'Step 2',
  },
  {
    icon: Database,
    actor: 'POSTGRESQL',
    action: 'Inventory Reservation & Draft Creation',
    detail: 'Created order in PENDING_CONFIRMATION status with locked catalog price (149,900 paise)',
    badge: 'Step 3',
  },
  {
    icon: UserCheck,
    actor: 'HUMAN-IN-THE-LOOP',
    action: 'Explicit Purchase Authorization',
    detail: 'Customer clicks "Authorize Purchase" in mobile app. Money gate unlocks.',
    badge: 'Step 4',
  },
  {
    icon: CreditCard,
    actor: 'RAZORPAY GATEWAY',
    action: 'Standard Checkout Modal & Capture',
    detail: 'User completes payment inside Razorpay Standard Checkout on the test-mode sandbox',
    badge: 'Step 5',
  },
  {
    icon: Zap,
    actor: 'SECURE WEBHOOK',
    action: 'HMAC-SHA256 Signature Verified',
    detail: 'Server validates payload signature against RAZORPAY_WEBHOOK_SECRET',
    badge: 'Step 6',
  },
  {
    icon: PackageCheck,
    actor: 'ORDER REPOSITORY',
    action: 'Order Marked PAID & Audit Logged',
    detail: 'Ledger permanently updated to PAID with full transaction provenance',
    badge: 'Step 7',
  },
];

export function SequenceFlowSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Deterministic Pipeline
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            How a request becomes a verified order.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            A step-by-step trace of state transitions from raw conversational input to cryptographically finalized payment.
          </p>
        </div>

        {/* Vertical Flow Diagram */}
        <div className="mt-14 space-y-3">
          {FLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === FLOW_STEPS.length - 1;

            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-purple-200 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 font-bold">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        {step.badge} • {step.actor}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                      {step.action}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {step.detail}
                    </p>
                  </div>

                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 hidden sm:block" />
                </div>

                {!isLast && (
                  <div className="py-1 text-purple-400/80">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
