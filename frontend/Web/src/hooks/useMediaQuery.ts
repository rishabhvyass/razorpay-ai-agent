import { useCallback, useSyncExternalStore } from 'react';

/**
 * Track a media query.
 *
 * Used for the responsive panel behaviour (spec section 7): the right panel
 * becomes a drawer below 1100px and the sidebar collapses below 768px. Doing this
 * in JS rather than with CSS alone is necessary because the panel changes
 * *component* - an inline column becomes a focus-trapping overlay - not just its
 * layout.
 *
 * `useSyncExternalStore` rather than useState + useEffect: matchMedia *is* an
 * external store, and the effect version has a real flaw - it renders once with a
 * stale value, then immediately re-renders after the effect syncs. For a hook that
 * decides whether a panel is an inline column or a modal overlay, that first paint
 * is a visible flash of the wrong layout.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server snapshot. There is no SSR here, but the third argument is what keeps
    // the hook from throwing if this app is ever prerendered - and false means
    // "assume the roomier layout", which degrades to the desktop shell.
    () => false,
  );
}

/** Breakpoints from spec section 7 / 36, named so call sites read declaratively. */
export const useIsCompact = () => useMediaQuery('(max-width: 1099px)');
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
