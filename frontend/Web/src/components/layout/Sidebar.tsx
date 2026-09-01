import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Blocks,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration } from '@/lib/motion';
import { ThemeSegmentedControl, ThemeToggle } from '@/hooks/useTheme';
import { MercoraMark } from './MercoraMark';
import { TestModeIndicator } from './TestModeIndicator';

/**
 * The rail, in two widths.
 *
 * Group order is the product's argument, read top to bottom: see the state of the
 * business, talk to the agent, look at what it can read and what it created, audit
 * what it did, then embed it.
 *
 * Collapsing is a width change and an opacity change, and deliberately nothing else.
 * Every icon sits at the same 36px from the left edge in both states - which is the
 * centre line of the 4.5rem rail - so the transition reads as the labels leaving
 * rather than as the navigation rearranging itself. Nothing moves vertically at all:
 * a group heading fades out as a short rule fades in over the same row, so the rows
 * below keep their exact positions and the main content column never reflows twice.
 */
const GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Sell',
    items: [
      { to: '/checkout', label: 'AI Assistant', icon: Sparkles, end: false },
      { to: '/products', label: 'Products', icon: Package, end: false },
      { to: '/orders', label: 'Orders', icon: ReceiptText, end: false },
    ],
  },
  {
    label: 'Evidence',
    items: [{ to: '/activity', label: 'Agent Activity', icon: Activity, end: false }],
  },
  {
    label: 'Build',
    items: [
      { to: '/integrate', label: 'Integrate', icon: Blocks, end: false },
      { to: '/settings', label: 'Settings', icon: Settings, end: false },
    ],
  },
] as const;

/** Where a tooltip should appear: beside the row that asked for it. */
interface Tip {
  label: string;
  top: number;
  left: number;
}

export function Sidebar({
  onNavigate,
  brand = true,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  /** The drawer puts the mark in its own header, so the rail's copy would be a second one. */
  brand?: boolean;
  /** Icon-only rail. The drawer is never collapsed - it is already a deliberate act to open it. */
  collapsed?: boolean;
  /** Absent in the drawer, where there is nothing to collapse into. */
  onToggleCollapsed?: () => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipTimer = useRef<number | null>(null);

  /**
   * One shared tooltip, positioned from the trigger's own rect and fixed to the
   * viewport.
   *
   * Absolutely positioned tooltips inside the rail were the obvious first move and
   * cannot work: the item list scrolls on a short viewport, and a scroll container
   * clips both axes - so the label would be cut off at exactly the edge it needs to
   * cross. Fixed positioning leaves that clip behind.
   *
   * Shown after a short delay (spec section 34) so that a pointer crossing the rail on
   * its way somewhere else does not fire six tooltips in a row. The rect is measured
   * before the wait, because by the time it elapses the pointer may have moved and the
   * event object is no longer live. Keyboard focus is not a sweep across the rail, so
   * it is worth distinguishing - but the same delay keeps the two paths identical, and
   * arrowing through the rail is deliberate enough that a 140ms wait reads as instant.
   */
  const showTip = useCallback(
    (label: string) => (event: { currentTarget: HTMLElement }) => {
      if (!collapsed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const next = { label, top: rect.top + rect.height / 2, left: rect.right + 8 };
      if (tipTimer.current !== null) window.clearTimeout(tipTimer.current);
      tipTimer.current = window.setTimeout(() => setTip(next), duration('fast'));
    },
    [collapsed],
  );

  const hideTip = useCallback(() => {
    if (tipTimer.current !== null) window.clearTimeout(tipTimer.current);
    setTip(null);
  }, []);

  // A rail that narrows while a tooltip is pending would leave the label stranded
  // beside a row it no longer belongs to.
  useEffect(() => hideTip, [hideTip]);

  /**
   * The label treatment, shared by every piece of text that leaves on collapse.
   *
   * `max-w` rather than `display`, so the words narrow out of the row instead of
   * vanishing from it, and opacity so they fade while they go. They stay in the DOM
   * either way: an opacity-0 label is still the accessible name of its link, so a
   * screen reader reads the collapsed rail exactly as it reads the open one.
   *
   * `transform` is in the transition list for the nav rows' 2px nudge on hover (spec
   * section 5). It has to live here rather than at the call site: `cn` concatenates
   * without resolving conflicts, so a second `transition-*` class on the same element
   * would fight this one for `transition-property` and the winner would be decided by
   * stylesheet order.
   */
  const label = cn(
    'motion-micro overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform]',
    collapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100',
  );

  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      {brand ? (
        <div className="border-line border-b px-4.5 py-5">
          <MercoraMark labelClassName={label} />
        </div>
      ) : null}

      {/*
        The active item is a solid blue block, not a hairline indicator. Where you are
        should be readable from across the room, and a 2px rule against a neutral
        label is not. Inactive items get a muted label and a faint icon so the block
        has something to win against.
      */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto py-2">
        {GROUPS.map((group) => {
          const headingId = `nav-group-${group.label.toLowerCase()}`;

          return (
            <div key={group.label} role="group" aria-labelledby={headingId}>
              {/* Fixed height, two crossfading occupants: the heading and, once the
                  rail narrows, a short rule that keeps the grouping visible without
                  the word. Neither one changes the row's height, so collapsing moves
                  no item up or down. */}
              <div className="relative h-8">
                <h2
                  id={headingId}
                  className={cn(
                    'text-faint absolute top-3 left-3 text-[10px] font-bold tracking-[0.12em] uppercase',
                    label,
                  )}
                >
                  {group.label}
                </h2>
                <span
                  aria-hidden
                  className={cn(
                    'bg-line motion-micro absolute top-[15px] left-4.5 h-0.5 w-6 transition-opacity',
                    collapsed ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>

              <ul className="space-y-1 px-2">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      onPointerEnter={showTip(item.label)}
                      onPointerLeave={hideTip}
                      onFocus={showTip(item.label)}
                      onBlur={hideTip}
                      className={({ isActive }) =>
                        cn(
                          'rounded-control motion-fast group flex min-h-11 items-center gap-3 px-3 text-[14px] font-semibold transition-colors',
                          isActive
                            ? 'bg-brand-blue text-white'
                            : 'text-muted hover:bg-surface-sunken hover:text-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* A 2rem box around a 1.125rem icon: with the list's own
                              px-2 and the row's px-3, its centre lands at 36px -
                              half of the collapsed rail - in both states.

                              The icon grows 5% on hover and the label follows it 2px
                              to the right (spec section 5). Both are `motion-safe`:
                              a reader who asked for less movement should not get an
                              instant 5% jump instead of a 190ms one, and neither
                              transform carries any information. */}
                          <span className="grid size-8 shrink-0 place-items-center">
                            <item.icon
                              className={cn(
                                'motion-micro size-4.5 transition-transform motion-safe:group-hover:scale-105',
                                isActive ? 'text-white' : 'text-faint',
                              )}
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          </span>
                          <span className={cn(label, 'motion-safe:group-hover:translate-x-0.5')}>
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Theme. The segmented control needs room for three words, so the narrow rail
          gets the single compact toggle the mobile top bar already uses - swapped
          rather than faded, because two theme controls in the accessibility tree at
          once would be two answers to the same question. */}
      <div className="border-line border-t px-3 py-3">
        {collapsed ? (
          <div className="animate-fade-in flex justify-center">
            <ThemeToggle />
          </div>
        ) : (
          <ThemeSegmentedControl className="animate-fade-in w-full" />
        )}
      </div>

      {/*
        Test-mode statement. This app never touches live money: order creation is a
        database write and the payments layer is Razorpay Test Mode. Saying so
        permanently is more honest than a dismissible banner someone closes on their
        first visit - so on the narrow rail it becomes an amber dot with the same
        words on hover, and the top bar carries the written form at every width where
        this rail exists.
      */}
      <div className="border-line border-t">
        {collapsed ? (
          <span
            className="flex min-h-11 items-center gap-3 px-5"
            onPointerEnter={showTip('Razorpay Test Mode - no live payments')}
            onPointerLeave={hideTip}
          >
            <span className="bg-razorpay size-2 shrink-0 rounded-full" aria-hidden />
            <span className="sr-only">
              Razorpay Test Mode. No live payments. No real money moves.
            </span>
          </span>
        ) : (
          <div className="px-4.5 py-4">
            <TestModeIndicator />
            <p className={cn('text-muted mt-2 text-[12px] leading-relaxed', label)}>
              No live payments. No real money moves.
            </p>
          </div>
        )}
      </div>

      {onToggleCollapsed ? (
        <div className="border-line border-t p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onPointerEnter={showTip('Expand sidebar')}
            onPointerLeave={hideTip}
            onFocus={showTip('Expand sidebar')}
            onBlur={hideTip}
            className="rounded-control text-muted hover:bg-surface-sunken hover:text-ink motion-fast group flex min-h-11 w-full items-center gap-3 px-3 text-[13px] font-semibold transition-colors"
          >
            <span className="grid size-8 shrink-0 place-items-center">
              {collapsed ? (
                <PanelLeftOpen
                  className="motion-micro size-4.5 transition-transform motion-safe:group-hover:scale-105"
                  strokeWidth={2.25}
                  aria-hidden
                />
              ) : (
                <PanelLeftClose
                  className="motion-micro size-4.5 transition-transform motion-safe:group-hover:scale-105"
                  strokeWidth={2.25}
                  aria-hidden
                />
              )}
            </span>
            <span className={cn(label, 'motion-safe:group-hover:translate-x-0.5')}>Collapse</span>
          </button>
        </div>
      ) : null}

      {/* Flat, opaque, square-ish: a tooltip, not a floating glass card. */}
      {collapsed && tip ? (
        <div
          role="presentation"
          aria-hidden
          style={{ top: tip.top, left: tip.left }}
          className="bg-ink text-canvas rounded-control animate-fade-in pointer-events-none fixed z-40 -translate-y-1/2 px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap"
        >
          {tip.label}
        </div>
      ) : null}
    </nav>
  );
}
