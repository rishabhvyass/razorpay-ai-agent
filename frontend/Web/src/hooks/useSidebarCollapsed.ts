import { useCallback, useState } from 'react';

const STORAGE_KEY = 'mercora.sidebarCollapsed';

/**
 * Whether the rail is the icon-only version, remembered across visits.
 *
 * A layout choice someone made once should not be re-made for them on every reload,
 * and this is the cheapest kind of state to persist: one boolean, no user data, and
 * nothing breaks if storage refuses - the rail simply opens.
 *
 * Not kept in `lib/session.ts`, which is deliberately about identifiers the backend
 * gave this browser. This is a preference about furniture.
 */
function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(read);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable - the choice just does not outlive the tab */
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
