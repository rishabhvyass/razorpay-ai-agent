import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { AuthorizePaymentPayload, CreateOrderPayload, Order } from '../types';

const TERMINAL_STATUSES = new Set(['PAID', 'PAYMENT_EXPIRED', 'CANCELLED']);

export function useOrders() {
  return useQuery({
    queryKey: ['user-orders'],
    queryFn: async (): Promise<Order[]> => {
      try {
        const response = await orderService.listOrders();
        return response || [];
      } catch {
        return [];
      }
    },
  });
}

export function useOrder(orderId: string | null | undefined) {
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? orderService.getOrder(orderId) : null),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (TERMINAL_STATUSES.has(data.status)) return false;
      // Poll every 3 seconds while in PAYMENT_PENDING or ORDER_CREATED
      if (data.status === 'PAYMENT_PENDING' || data.status === 'ORDER_CREATED') return 3000;
      return false;
    },
  });

  const paymentStatusQuery = useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: () => (orderId ? paymentService.getPaymentStatus(orderId) : null),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !data.order) return false;
      if (TERMINAL_STATUSES.has(data.order.status)) return false;
      return 3000;
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderService.createOrder(payload),
    onSuccess: (newOrder) => {
      queryClient.setQueryData(['order', newOrder.id], newOrder);
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  const issuePaymentLinkMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AuthorizePaymentPayload }) =>
      paymentService.issuePaymentLink(id, payload),
    onSuccess: (view) => {
      queryClient.setQueryData(['order', view.order.id], view.order);
      queryClient.setQueryData(['order-payment', view.order.id], view);
    },
  });

  const refreshPaymentMutation = useMutation({
    mutationFn: (id: string) => paymentService.refreshPaymentStatus(id),
    onSuccess: (view) => {
      queryClient.setQueryData(['order', view.order.id], view.order);
      queryClient.setQueryData(['order-payment', view.order.id], view);
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  return {
    order: orderQuery.data,
    paymentView: paymentStatusQuery.data,
    isLoading: orderQuery.isLoading,
    isError: orderQuery.isError,
    error: orderQuery.error,
    createOrder: createOrderMutation.mutateAsync,
    issuePaymentLink: issuePaymentLinkMutation.mutateAsync,
    refreshPayment: refreshPaymentMutation.mutateAsync,
    isCreatingOrder: createOrderMutation.isPending,
    isIssuingLink: issuePaymentLinkMutation.isPending,
    isRefreshing: refreshPaymentMutation.isPending,
    refetch: orderQuery.refetch,
  };
}
