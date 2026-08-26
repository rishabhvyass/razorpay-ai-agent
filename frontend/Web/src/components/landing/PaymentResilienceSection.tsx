import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export function PaymentResilienceSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Edge Case Resilience Description */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Production Resilience</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white leading-tight">
              Real payments fail. <br />
              <span className="text-purple-600 dark:text-purple-400">
                The agent should know what to do.
              </span>
            </h2>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              When a customer abandons a checkout sheet, experiences an OTP timeout, or has insufficient bank balance, the agent preserves full conversation context and provides instant 1-tap retry without re-starting the conversation.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Zero duplicate order creation upon multiple link clicks</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Automated inventory release on link expiry timeouts</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Instant recovery to retry payment or select alternate payment method</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Failure Recovery Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              {/* Failure State Card */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Payment Incomplete / Cancelled
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Razorpay reported: <code className="font-mono text-red-600 dark:text-red-400">BAD_REQUEST_ERROR: User closed checkout window</code>
                  </p>
                </div>
              </div>

              {/* Agent Recovery Flow */}
              <div className="mt-4 p-4 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Order #ord_NxK7Pq2d (Saved in Draft)</span>
                  <span className="text-purple-600 dark:text-purple-400">₹1,499.00</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your cart is intact. Would you like to retry checkout or switch to UPI QR code?
                </p>

                <div className="flex gap-2.5 pt-1">
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Payment</span>
                  </button>
                  <button className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Switch to UPI
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
