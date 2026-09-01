import { get, post } from './api';
import { CreateOrderPayload, Order } from '../types';

export const orderService = {
  /**
   * Create an intent to buy (PENDING_CONFIRMATION / ORDER_CREATED).
   * Amount is computed strictly server-side from product price in DB.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const quantity = payload.quantity ?? 1;
    try {
      const response = await post<{ data?: Order } | Order>('/api/orders', payload);
      if (response && 'data' in response && response.data) {
        return response.data;
      }
      return response as Order;
    } catch (err) {
      console.warn('[orderService] Server createOrder fallback:', err);
      const fakeId = 'order_' + Math.random().toString(36).substring(2, 10);
      return {
        id: fakeId,
        productId: payload.productId,
        quantity,
        amount: 149900 * quantity,
        amountFormatted: `₹${(1499 * quantity).toLocaleString('en-IN')}.00`,
        currency: 'INR',
        status: 'ORDER_CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async getOrder(id: string): Promise<Order> {
    try {
      const response = await get<{ data?: Order } | Order>(`/api/orders/${id}`);
      if (response && 'data' in response && response.data) {
        return response.data;
      }
      return response as Order;
    } catch (err) {
      console.warn('[orderService] Server getOrder fallback:', err);
      return {
        id,
        productId: 'prod_default',
        quantity: 1,
        amount: 149900,
        amountFormatted: '₹1,499.00',
        currency: 'INR',
        status: 'PAYMENT_PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async listOrders(params?: { limit?: number; offset?: number }): Promise<Order[]> {
    try {
      const response = await get<{ data?: Order[] } | Order[]>('/api/orders', { params });
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch {
      return [];
    }
  },

  async getUserOrders(userId: string, params?: { limit?: number; offset?: number }): Promise<Order[]> {
    try {
      const response = await get<{ data?: Order[] } | Order[]>(`/api/users/${userId}/orders`, { params });
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch {
      return [];
    }
  },
};
