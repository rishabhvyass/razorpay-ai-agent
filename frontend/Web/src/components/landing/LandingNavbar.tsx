import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Github, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function LandingNavbar() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-sm dark:border-[#1E293B] dark:bg-[#090D16]/95 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Mark */}
        <Link
          to="/"
          className="flex items-center gap-3 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#0C66E4] focus-visible:outline-offset-2 rounded-lg"
          aria-label="Checkout Concierge Home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C66E4] text-white shadow-xs font-bold text-sm">
            CC
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-[#0F172A] dark:text-white leading-none">
              Checkout Concierge
            </span>
            <span className="text-[11px] font-medium text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Razorpay Agentic Commerce
            </span>
          </div>
        </Link>

        {/* Center Navigation (Desktop) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[#475569] dark:text-[#94A3B8]"
        >
          <a
            href="#problem"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            The Problem
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            Process
          </a>
          <a
            href="#safety"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            Security Invariant
          </a>
          <a
            href="#audit"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            Audit Ledger
          </a>
          <a
            href="#architecture"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            Architecture
          </a>
          <Link
            to="/products"
            className="hover:text-[#0C66E4] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4] rounded-sm py-1"
          >
            Catalog
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
            title="Toggle theme"
            aria-label="Toggle dark and light mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <a
            href="https://github.com/rishabhvyass/razorpay-ai-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
            title="View source on GitHub"
            aria-label="View project repository on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>

          <Link
            to="/checkout"
            className="inline-flex h-9 min-h-[44px] items-center gap-2 rounded-lg bg-[#0C66E4] px-4 py-2 text-[13px] font-semibold text-white shadow-xs hover:bg-[#0047B3] active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">Launch Agent</span>
            <span className="inline xs:hidden sm:hidden">Agent</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-80" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8] transition-colors focus-visible:outline-2 focus-visible:outline-[#0C66E4]"
            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E8F0] bg-white px-4 py-4 dark:border-[#1E293B] dark:bg-[#090D16] space-y-2">
          <a
            href="#problem"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            The Problem
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            How It Works
          </a>
          <a
            href="#safety"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            Security Invariant
          </a>
          <a
            href="#audit"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            Audit Ledger
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            Architecture
          </a>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-white dark:hover:bg-[#0F172A]"
          >
            Live Catalog
          </Link>
        </div>
      )}
    </header>
  );
}
