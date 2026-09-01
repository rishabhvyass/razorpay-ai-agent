import { ArrowDown, Bot, Check, Database, Lock, Smartphone, Terminal } from 'lucide-react';

const ARCH_NODES = [
  {
    layer: 'Client Layer',
    title: 'Web & React Native CLI Clients',
    desc: 'Conversational chat interface with hardware-accelerated 60fps micro-interactions.',
    icon: Smartphone,
    color: 'border-[#E2E8F0] bg-white text-[#0F172A] dark:border-[#1E293B] dark:bg-[#0F172A]',
  },
  {
    layer: 'Agent Core',
    title: 'Node.js Agent Orchestrator & AI Provider',
    desc: 'Parses customer intent into structured tool dispatches with conversation history.',
    icon: Bot,
    color: 'border-[#CBD5E1] bg-[#EBF3FF]/50 text-[#0C66E4] dark:border-[#334155] dark:bg-[#0C2147]',
  },
  {
    layer: 'Tool Interface',
    title: 'Model Context Protocol (MCP) Tools',
    desc: 'Strictly bounded tools for product search, order drafting, and status checks.',
    icon: Terminal,
    color: 'border-[#E2E8F0] bg-white text-[#0C66E4] dark:border-[#1E293B] dark:bg-[#0F172A]',
  },
  {
    layer: 'Security Boundary',
    title: 'Money Action Policy & Human Gate',
    desc: 'Intercepts financial actions and mandates explicit biometric/button authorization.',
    icon: Lock,
    color: 'border-[#0C66E4] bg-[#EBF3FF] text-[#0C66E4] dark:border-[#388BFF] dark:bg-[#0C2147]',
  },
  {
    layer: 'Data & Settlement',
    title: 'Supabase PostgreSQL & Razorpay Sandbox',
    desc: 'Deterministic minor-unit price locking and cryptographic webhook signature verification.',
    icon: Database,
    color: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] dark:border-[#14532D] dark:bg-[#052E16]',
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-16 sm:py-20 md:py-28 bg-[#F8FAFC] dark:bg-[#090D16] border-y border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-[1.08]">
            Engineered for deterministic trust.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[54ch]">
            A layered pipeline separating unbounded natural language from bounded financial actions.
          </p>
        </div>

        {/* Layered Flow Pipeline */}
        <div className="mt-12 md:mt-14 space-y-3.5 max-w-4xl">
          {ARCH_NODES.map((node, idx) => {
            const Icon = node.icon;
            const isLast = idx === ARCH_NODES.length - 1;

            return (
              <div key={idx} className="flex flex-col">
                <div
                  className={`rounded-2xl border p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${node.color}`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] dark:bg-[#0A0F1D] border border-[#E2E8F0] dark:border-[#1E293B]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-[#64748B]">
                        {node.layer}
                      </span>
                      <h3 className="text-base font-bold text-[#0F172A] dark:text-white mt-0.5">
                        {node.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-0.5 max-w-xl">
                        {node.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold shrink-0">
                    <Check className="h-4 w-4 text-[#16A34A] dark:text-[#4ADE80]" />
                    <span>BOUNDED</span>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex justify-center py-1 text-[#94A3B8] dark:text-[#64748B]">
                    <ArrowDown className="h-3.5 w-3.5" />
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
