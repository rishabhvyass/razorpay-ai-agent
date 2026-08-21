import { useEffect, useState } from 'react';

/**
 * Track a media query.
 *
 * Used for the responsive panel behaviour (spec section 7): the right panel
 * becomes a drawer below 1100px and the sidebar collapses below 768px. Doing this
 * in JS rather than with CSS alone is necessary because the panel changes
 * *component* - an inline column becomes a focus-trapping overlay - not just its
 * layout.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Breakpoints from spec section 7 / 36, named so call sites read declaratively. */
export const useIsCompact = () => useMediaQuery('(max-width: 1099px)');
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
