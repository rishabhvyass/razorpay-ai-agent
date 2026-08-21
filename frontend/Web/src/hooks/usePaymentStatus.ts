import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { getPaymentView } from '@/services/paymentService';
import { isTerminalStatus } from '@/services/orderService';

/**
 * Payment status, polled.
 *
 * Spec section 31: PAYMENT_PENDING must be able to become PAID without a full
 * refresh, and it must not be faked. Razorpay confirmation reaches the backend
 * asynchronously via webhook, so there is nothing for the browser to await.
 *
 * Polling a real resource is the honest option here. Supabase Realtime was the
 * alternative, but it would require handing the browser a Supabase key and a
 * direct table subscription - and the backend's own routes note they currently
 * read through the service-role client with RLS bypassed and no auth. Subscribing
 * the browser to that table would mean exposing order rows with no policy
 * enforcement, so polling the authenticated backend is both simpler and safer.
 *
 * The interval stops itself once the order reaches a terminal state, so a
 * completed order is not polled forever in a background tab.
 */
export function usePaymentStatus(
  orderId: string | null | undefined,
  options: { intervalMs?: number } = {},
) {
  const intervalMs = options.intervalMs ?? 3000;

  return useQuery({
    queryKey: qk.orders.payment(orderId ?? ''),
    queryFn: ({ signal }) => getPaymentView(orderId!, signal),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      if (!status) return intervalMs;
      return isTerminalStatus(status) ? false : intervalMs;
    },
    staleTime: 0,
  });
}
