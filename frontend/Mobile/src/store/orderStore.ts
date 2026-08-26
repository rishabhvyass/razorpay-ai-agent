import { create } from 'zustand';
import { Order } from '../types';

interface OrderStoreState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], paymentId?: string | null) => void;
  setOrders: (orders: Order[]) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

export const useOrderStore = create<OrderStoreState>((set, get) => ({
  orders: [],

  addOrder: (newOrder: Order) => {
    set((state) => {
      // Check if order already exists
      const existingIndex = state.orders.findIndex((o) => o.id === newOrder.id);
      if (existingIndex >= 0) {
        const updated = [...state.orders];
        updated[existingIndex] = { ...updated[existingIndex], ...newOrder };
        return { orders: updated };
      }
      return { orders: [newOrder, ...state.orders] };
    });
  },

  updateOrderStatus: (orderId: string, status: Order['status'], paymentId?: string | null) => {
    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            razorpayPaymentId: paymentId || o.razorpayPaymentId,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      }),
    }));
  },

  setOrders: (orders: Order[]) => set({ orders }),

  getOrderById: (orderId: string) => {
    return get().orders.find((o) => o.id === orderId);
  },
}));
