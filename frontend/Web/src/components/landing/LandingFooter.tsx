import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Checkout Concierge
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              AI-native conversational commerce assistant with deterministic PostgreSQL transactions, human-in-the-loop payment confirmation, and Razorpay webhook validation.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Shield className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              <span>Razorpay Test Mode Sandbox Active</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Platform
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/checkout" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  AI Commerce Agent
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Order Management
                </Link>
              </li>
              <li>
                <Link to="/activity" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Audit Activity Trail
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Architecture
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a href="#security" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Money Action Gate
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  5-Step Lifecycle
                </a>
              </li>
              <li>
                <a href="#audit" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  HMAC Webhook Verification
                </a>
              </li>
              <li>
                <Link to="/settings" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Gateway Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <span>© {new Date().getFullYear()} Checkout Concierge. All rights reserved.</span>
          <span>Zero Hallucinated Pricing • Deterministic State Machine</span>
        </div>
      </div>
    </footer>
  );
}
