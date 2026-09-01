import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#090D16] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand & Mission Column */}
          <div className="space-y-4 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0C66E4] text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="text-base font-bold text-[#0F172A] dark:text-white">
                Checkout Concierge
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] max-w-sm leading-relaxed">
              AI-native conversational commerce agent with deterministic PostgreSQL transactions, explicit human approval gates, and Razorpay webhook validation.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] px-3 py-1 text-xs font-semibold text-[#0F172A] dark:text-white">
              <Shield className="h-3.5 w-3.5 text-[#0C66E4]" aria-hidden="true" />
              <span>Razorpay AI Builder Track 01</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
              Product
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] list-none p-0 m-0">
              <li>
                <Link
                  to="/checkout"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  AI Commerce Agent
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  Postgres Catalog
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  Orders & Receipts
                </Link>
              </li>
              <li>
                <Link
                  to="/activity"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  Agent Audit Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture Links */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
              Architecture
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] list-none p-0 m-0">
              <li>
                <a
                  href="#problem"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  The Commerce Problem
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  5-Step Process
                </a>
              </li>
              <li>
                <a
                  href="#safety"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  Money Action Policy
                </a>
              </li>
              <li>
                <a
                  href="#audit"
                  className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm inline-block py-1"
                >
                  HMAC Webhook Verification
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & invariants */}
        <div className="mt-12 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8] gap-3">
          <span>© {new Date().getFullYear()} Checkout Concierge. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span>Deterministic Pricing</span>
            <span>•</span>
            <span>Human Invariant Enforced</span>
            <span>•</span>
            <span>Razorpay Sandbox</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
