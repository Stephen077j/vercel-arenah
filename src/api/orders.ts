import { api } from './client.js';
import type {
  ApiCartItem, ApiOrder, ApiProduct, ApiNotification, ApiSuccess,
} from './types';

export const ordersApi = {
  getMyOrders: () => api.get<ApiOrder[]>('/api/orders'),
  getOrder:    (id: string) => api.get<ApiOrder>(`/api/orders/${id}`),
  create:      (data: {
    module: string;
    type: string;
    mode: 'livraison' | 'retrait' | 'sur_place';
    items: { product_id?: string; name: string; price: number; quantity: number; note?: string }[];
    address?: string;
    notes?: string;
    customer_name?: string;
    customer_phone?: string;
    promo_code?: string;
  }) => api.post<ApiOrder>('/api/orders', data),
  cancel: (id: string) => api.patch<ApiSuccess>(`/api/orders/${id}/cancel`),
};

export const cartApi = {
  getCart:   () => api.get<ApiCartItem[]>('/api/cart'),
  addItem:   (product_id: string, quantity = 1, note?: string) =>
    api.post<ApiSuccess>('/api/cart', { product_id, quantity, note }),
  updateItem: (id: string, quantity: number, note?: string) =>
    api.patch<ApiSuccess>(`/api/cart/${id}`, { quantity, note }),
  removeItem: (id: string) => api.delete<ApiSuccess>(`/api/cart/${id}`),
  clearCart:  () => api.delete<ApiSuccess>('/api/cart'),
};

export const productsApi = {
  getAll:       (module?: string, category?: string, q?: string) => {
    const params = new URLSearchParams();
    if (module) params.set('module', module);
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    return api.get<ApiProduct[]>(`/api/products?${params}`);
  },
  getById:      (id: string) => api.get<ApiProduct>(`/api/products/${id}`),
};

export const notifApi = {
  getAll:      () => api.get<ApiNotification[]>('/api/notifications'),
  markRead:    (id: string) => api.patch<ApiSuccess>(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch<ApiSuccess>('/api/notifications/read-all'),
  delete:      (id: string) => api.delete<ApiSuccess>(`/api/notifications/${id}`),
};
