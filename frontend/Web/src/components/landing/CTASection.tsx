import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Github } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-16 sm:py-20 md:py-28 bg-[#F8FAFC] dark:bg-[#090D16] border-t border-[#E2E8F0] dark:border-[#1E293B]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#CBD5E1] bg-white p-6 sm:p-10 md:p-14 text-center shadow-card dark:border-[#334155] dark:bg-[#0F172A]">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white max-w-2xl mx-auto leading-[1.08]">
            Make your merchant ready for AI buyers.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#475569] dark:text-[#94A3B8] max-w-[48ch] mx-auto leading-relaxed">
            Checkout Concierge turns conversation into safe, explainable and transactable commerce through Razorpay.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/checkout"
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0C66E4] px-6 py-3 text-sm font-semibold text-white shadow-blue-cta hover:bg-[#0047B3] active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>Try Checkout Concierge</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <a
              href="https://github.com/rishabhvyass/razorpay-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] shadow-subtle hover:bg-[#F8FAFC] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-white dark:hover:bg-[#1E293B] transition-all focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>View GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
