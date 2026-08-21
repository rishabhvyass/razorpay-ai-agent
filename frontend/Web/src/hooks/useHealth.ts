import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getHealth } from '@/services/healthService';

/**
 * Backend reachability, for the "Online" indicator in the top bar.
 *
 * Polls rather than checking once: the indicator claims a live fact, and a badge
 * that says "Online" because the backend answered when the tab opened forty
 * minutes ago is worse than no badge.
 */
export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 20_000,
    staleTime: 10_000,
    retry: false,
  });
}
