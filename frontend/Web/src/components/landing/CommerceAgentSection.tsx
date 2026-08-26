import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Database,
  Mic,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';

const AGENT_CAPABILITIES = [
  {
    icon: ShieldCheck,
    title: 'Strict Money Action Gate',
    desc: 'The agent is mathematically prohibited from moving funds without an explicit user authorization click.',
  },
  {
    icon: Database,
    title: 'Live PostgreSQL Sync',
    desc: 'Orders, inventory states, and idempotency keys are synced directly with the database in minor units (paise).',
  },
  {
    icon: Zap,
    title: 'Razorpay Webhook Verification',
    desc: 'Payment state transitions require cryptographic HMAC SHA-256 signatures, not frontend assumptions.',
  },
  {
    icon: Smartphone,
    title: 'Native iOS & Android Apps',
    desc: 'Built with a high-performance React Native CLI architecture featuring hardware-accelerated motion.',
  },
  {
    icon: Mic,
    title: 'Hands-Free Voice Concierge',
    desc: 'Real-time microphone speech recognition with dynamic animated equalizers and intent matching.',
  },
  {
    icon: Sparkles,
    title: 'Zero Hallucinated Pricing',
    desc: 'All calculations occur on the server. AI cannot fabricate discounts, coupons, or incorrect totals.',
  },
];

export function CommerceAgentSection() {
  return (
    <section id="architecture" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Mission Description */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
              <Bot className="h-3.5 w-3.5" />
              <span>Architected for Reliability</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white leading-tight">
              Not a chatbot. <br />
              <span className="text-purple-600 dark:text-purple-400">A commerce agent.</span>
            </h2>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Most AI shopping assistants stop at sharing external product links. Checkout Concierge drafts orders directly in PostgreSQL, executes inventory reservations, enforces human-in-the-loop payment gates, and verifies payments via Razorpay webhooks.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/checkout"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-purple-700 transition-all"
              >
                <span>Try Live Concierge</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/activity"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
              >
                <span>View Audit Logs</span>
              </Link>
            </div>
          </div>

          {/* Right Column: 6 Capabilities Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AGENT_CAPABILITIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-200 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-900/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 mb-3.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
