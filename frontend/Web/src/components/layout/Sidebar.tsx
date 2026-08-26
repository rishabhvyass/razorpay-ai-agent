import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  MessagesSquare,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeSegmentedControl } from '@/hooks/useTheme';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/checkout', label: 'Checkout', icon: MessagesSquare, end: false },
  { to: '/orders', label: 'Orders', icon: ReceiptText, end: false },
  { to: '/products', label: 'Products', icon: Package, end: false },
  { to: '/activity', label: 'Agent activity', icon: Activity, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-accent grid size-8 shrink-0 place-items-center rounded-[0.6rem] text-white">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-ink truncate text-[13px] leading-tight font-semibold">
              Checkout Concierge
            </p>
            <p className="text-faint truncate text-[11px] leading-tight">Agentic commerce</p>
          </div>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-[0.6rem] px-2.5 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-muted hover:bg-surface-sunken hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('size-4 shrink-0', isActive ? 'text-accent' : 'text-faint')}
                    aria-hidden
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Theme selector in sidebar */}
      <div className="px-3 py-2">
        <ThemeSegmentedControl className="w-full justify-between" />
      </div>

      {/*
        Test-mode indicator, always visible (spec section 15 / 23). This app never
        touches live money: order creation is a database write and the payments
        layer is Razorpay Test Mode. Saying so permanently is more honest than a
        dismissible banner someone closes on their first visit.
      */}
      <div className="border-line mt-1 border-t px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="bg-razorpay animate-pulse-soft size-1.5 shrink-0 rounded-full" aria-hidden />
          <span className="text-muted text-[11px] font-medium">Razorpay Test Mode</span>
        </div>
        <p className="text-faint mt-1 text-[11px] leading-relaxed">
          No live payments. No real money moves.
        </p>
      </div>
    </nav>
  );
}
