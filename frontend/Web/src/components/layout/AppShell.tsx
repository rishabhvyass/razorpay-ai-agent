import { createContext, useCallback, useContext, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MercoraMark } from './MercoraMark';
import { AssistantDock } from '@/components/chat/AssistantDock';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui';

/**
 * App shell.
 *
 * Persistent sidebar from 768px up; below that it becomes a drawer, because a
 * 240px rail on a 375px screen leaves nothing for the conversation - and the
 * conversation is the product.
 *
 * The shell is exactly one viewport tall and scrolls inside the content column, not on
 * the document. That is what the chat needs: with a document-height shell, a growing
 * transcript pushes the composer below the fold, because `min-h-dvh` is a floor and
 * nothing above the message list ever imposes a ceiling. Every page's own `main` owns
 * its scrolling instead, so the rail and the top bar cannot be scrolled away.
 *
 * The shell exposes the drawer opener through context so each page's own top bar
 * can render the hamburger without the shell having to know what any page contains.
 */
const NavContext = createContext<{ openNav: () => void } | null>(null);

export function useNav() {
  return useContext(NavContext);
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const { pathname } = useLocation();

  /**
   * Where the floating assistant would be a second copy of something already on the
   * screen, or a lie about whose page you are on.
   *
   * `/checkout` IS the assistant, and both surfaces render the same session - two
   * live transcripts of one conversation, each scrolling itself. The mock checkout
   * page stands in for a payment page; a Mercora launcher hovering over it would
   * blur the one boundary that page exists to draw.
   */
  const dockable = pathname !== '/checkout' && !pathname.startsWith('/mock-checkout');

  return (
    <NavContext.Provider value={{ openNav }}>
      <div className="bg-canvas flex h-dvh overflow-hidden">
        {/* Square, not rounded: the rail is a column of the page grid, not a card
            floating on top of it. Width is the only thing that animates here, and the
            content column is its flex sibling, so the page reflows with the rail
            rather than after it - no snap at either end of the 300ms.

            Not `overflow-hidden`: the collapsed rail's tooltips have to cross this
            edge. Nothing else needs clipping, because every label inside narrows
            itself instead of overflowing. */}
        <aside
          id="app-sidebar"
          className={cn(
            'bg-surface border-line hidden h-full shrink-0 border-r transition-[width] duration-(--duration-normal) ease-layout md:block',
            collapsed ? 'w-[4.5rem]' : 'w-60',
          )}
        >
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>

        {dockable ? <AssistantDock /> : null}

        <Modal
          open={navOpen}
          onClose={closeNav}
          title={<MercoraMark to={null} />}
          variant="drawer"
          side="left"
          labelledBy="nav-drawer-title"
        >
          <div className="h-full">
            <Sidebar onNavigate={closeNav} brand={false} />
          </div>
        </Modal>
      </div>
    </NavContext.Provider>
  );
}
