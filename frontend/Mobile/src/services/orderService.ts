import { get, post } from './api';
import { CreateOrderPayload, Order } from '../types';

export const orderService = {
  /**
   * Create an intent to buy (PENDING_CONFIRMATION).
   * Amount is computed strictly server-side from product price in DB.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return post<Order>('/api/orders', payload);
  },

  async getOrder(id: string): Promise<Order> {
    return get<Order>(`/api/orders/${id}`);
  },

  async listOrders(params?: { limit?: number; offset?: number }): Promise<Order[]> {
    try {
      return await get<Order[]>('/api/orders', { params });
    } catch {
      return [];
    }
  },

  async getUserOrders(userId: string, params?: { limit?: number; offset?: number }): Promise<Order[]> {
    return get<Order[]>(`/api/users/${userId}/orders`, { params });
  },
};
