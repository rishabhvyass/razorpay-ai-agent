import {
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export function SecurityGateSection() {
  return (
    <section id="security" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Security Invariant
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            AI can request. It cannot authorize.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Money actions are strictly gated behind deterministic confirmation rules. The LLM can draft orders, but cannot execute payments on its own.
          </p>
        </div>

        {/* Comparison Grid: Allowed vs Blocked */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Blocked / Autonomous Execution Without Human Barrier (The Danger) */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 mb-4">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-base">Blocked: Unguarded AI Execution</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Standard autonomous agents that attempt direct tool execution can hallucinate discounts, trigger unintended charge attempts, or execute duplicate orders.
            </p>

            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-red-400 space-y-2 border border-red-900/30">
              <div className="flex items-center gap-2 text-slate-400">
                <span>// ❌ UNSAFE UNGUARDED PATTERN</span>
              </div>
              <div>await razorpay.chargeAccount(&#123;</div>
              <div className="pl-4 text-red-300">amount: llm_suggested_amount,</div>
              <div className="pl-4 text-red-300">autoAuthorize: true</div>
              <div>&#125;);</div>
              <div className="pt-2 text-[11px] text-red-500 font-sans font-semibold">
                ⛔ Result: REJECTED by Checkout Concierge Money Gate
              </div>
            </div>
          </div>

          {/* Allowed / Guarded Human-in-the-Loop Barrier (The Solution) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-bold text-base">Enforced: Human-in-the-Loop Gate</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Checkout Concierge drafts an immutable order record in PostgreSQL with status <code className="font-mono text-emerald-700 dark:text-emerald-300">PENDING_CONFIRMATION</code> and requires explicit biometric or button authorization.
            </p>

            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 space-y-2 border border-emerald-900/30">
              <div className="flex items-center gap-2 text-slate-400">
                <span>// ✅ CHECKOUT CONCIERGE PATTERN</span>
              </div>
              <div>const draft = await draftOrder(&#123; dbPriceMinor, qty &#125;);</div>
              <div className="text-purple-300">await requireUserAuthorization(draft.id);</div>
              <div>const link = await razorpay.paymentLink.create(&#123; draft &#125;);</div>
              <div className="pt-2 text-[11px] text-emerald-400 font-sans font-semibold">
                🛡️ Result: APPROVED with Cryptographic Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
