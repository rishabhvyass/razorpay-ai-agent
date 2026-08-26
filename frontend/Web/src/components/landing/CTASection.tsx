import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-600 p-8 sm:p-12 text-center text-white shadow-2xl shadow-purple-950/20">
          {/* Subtle ambient circle */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-400/20 blur-2xl" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-purple-100 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Production Ready Architecture</span>
            </div>

            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              Ready to let AI safely close the sale?
            </h2>

            <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
              Experience the live autonomous commerce assistant with guarded human-in-the-loop payment verification today.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/checkout"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-purple-700 shadow-md hover:bg-purple-50 active:scale-[0.98] transition-all"
              >
                <Bot className="h-4 w-4" />
                <span>Launch Agent Demo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/20 backdrop-blur-md transition-all"
              >
                <span>Browse Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
