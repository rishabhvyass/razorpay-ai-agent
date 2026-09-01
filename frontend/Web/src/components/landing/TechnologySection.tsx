import { Bot, Cpu, Database, Key, Layers, Server, Shield, Smartphone } from 'lucide-react';

const TECH_STACK = [
  {
    category: 'Intelligence & Context',
    items: [
      { name: 'Conversational AI Engine', role: 'Natural language intent parsing & reasoning', icon: Bot },
      { name: 'Model Context Protocol (MCP)', role: 'Standardized bounded commerce tool invocation', icon: Cpu },
    ],
  },
  {
    category: 'Deterministic Backend',
    items: [
      { name: 'Node.js & TypeScript', role: 'ACID deterministic state machine & order lifecycle', icon: Server },
      { name: 'Supabase PostgreSQL', role: 'Direct minor-unit catalog storage & audit logs', icon: Database },
    ],
  },
  {
    category: 'Payment Infrastructure',
    items: [
      { name: 'Razorpay Sandbox Gateway', role: 'UPI, Card, Netbanking test mode checkout sessions', icon: Key },
      { name: 'Cryptographic HMAC Webhooks', role: 'SHA-256 signature verification on payment events', icon: Shield },
    ],
  },
  {
    category: 'Native & Web Clients',
    items: [
      { name: 'React Native CLI', role: 'Hardware-accelerated mobile app with haptics', icon: Smartphone },
      { name: 'Web Product Application', role: 'Full responsive public showcase & dashboard', icon: Layers },
    ],
  },
];

export function TechnologySection() {
  return (
    <section id="technology" className="py-16 sm:py-20 md:py-28 bg-white dark:bg-[#090D16]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            Built on production foundations.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[54ch]">
            An integrated stack balancing AI reasoning capabilities with strict cryptographic and transactional guardrails.
          </p>
        </div>

        {/* 4-Category System Map */}
        <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {TECH_STACK.map((group, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-7 dark:border-[#1E293B] dark:bg-[#0F172A]"
            >
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0C66E4] dark:text-[#388BFF] mb-4">
                {group.category}
              </h3>

              <div className="space-y-3">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={itemIdx}
                      className="flex items-start gap-3 bg-white dark:bg-[#0A0F1D] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF3FF] text-[#0C66E4] dark:bg-[#0C2147] dark:text-[#388BFF]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                          {item.role}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
