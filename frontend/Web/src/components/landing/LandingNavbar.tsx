import { Link } from 'react-router-dom';
import { Bot, ChevronRight, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function LandingNavbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Checkout Concierge
            </span>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 -mt-1 tracking-wider uppercase">
              Agentic Commerce
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#how-it-works" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            How It Works
          </a>
          <a href="#agent-in-action" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Agent Actions
          </a>
          <a href="#security" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Security Gate
          </a>
          <a href="#audit" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Audit Trail
          </a>
          <a href="#architecture" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Architecture
          </a>
          <Link to="/products" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Catalog
          </Link>
          <Link to="/orders" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Orders
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/checkout"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-purple-500/30 hover:bg-purple-700 hover:shadow-md hover:shadow-purple-500/40 active:scale-[0.98] transition-all"
          >
            <Bot className="h-4 w-4" />
            <span>Launch Agent</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-80" />
          </Link>
        </div>
      </div>
    </header>
  );
}
