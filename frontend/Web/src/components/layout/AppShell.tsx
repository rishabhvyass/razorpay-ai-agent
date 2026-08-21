import { createContext, useCallback, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Modal } from '@/components/ui';

/**
 * App shell.
 *
 * Persistent sidebar from 768px up; below that it becomes a drawer, because a
 * 240px rail on a 375px screen leaves nothing for the conversation - and the
 * conversation is the product.
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
  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <NavContext.Provider value={{ openNav }}>
      <div className="bg-canvas flex min-h-dvh">
        <aside className="border-line bg-surface sticky top-0 hidden h-dvh w-[15rem] shrink-0 border-r md:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>

        <Modal
          open={navOpen}
          onClose={closeNav}
          title="Navigation"
          variant="drawer"
          labelledBy="nav-drawer-title"
        >
          <div className="h-full">
            <Sidebar onNavigate={closeNav} />
          </div>
        </Modal>
      </div>
    </NavContext.Provider>
  );
}
