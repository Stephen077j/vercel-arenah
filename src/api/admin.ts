import { api } from './client.js';

export interface AdminStats {
  today_orders: number;
  today_revenue: number;
  pending_payments: number;
  pending_cash: number;
  total_clients: number;
  hotel_today: number;
  gym_active: number;
  weekly_revenue: { day: string; revenue: number; count: number }[];
}

export interface AdminOrder {
  id: string;
  module: string;
  type: string;
  mode: string;
  status: string;
  total: number;
  address: string | null;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items_summary: string | null;
  created_at: string;
  user_email?: string;
}

export interface AdminPayment {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  method: string;
  status: string;
  booking_type: string;
  booking_id: string;
  notes: string | null;
  created_at: string;
  user_email?: string;
}

export interface AdminProduct {
  id: string;
  module: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  image_url: string | null;
  active: boolean;
}

export interface AdminBooking {
  id: string;
  type: string;
  customer_name: string | null;
  customer_phone: string | null;
  info: string;
  status: string;
  amount: number;
  created_at: string;
}

const ORDER_STATUSES = ['en_attente', 'preparation', 'expediee', 'livree', 'annulee'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const adminApi = {
  // ── Dashboard ──────────────────────────────────────────────────────
  getDashboard: (): Promise<AdminStats> => api.get('/api/admin/dashboard'),

  // ── Orders ─────────────────────────────────────────────────────────
  getAllOrders: (filters?: { status?: string; module?: string }): Promise<AdminOrder[]> => {
    const p = new URLSearchParams();
    if (filters?.status) p.set('status', filters.status);
    if (filters?.module) p.set('module', filters.module);
    return api.get(`/api/orders/all?${p}`);
  },
  updateOrderStatus: (id: string, status: OrderStatus): Promise<{ success: boolean }> =>
    api.patch(`/api/orders/${id}/status`, { status }),

  // ── Payments ───────────────────────────────────────────────────────
  getAllPayments: (filters?: { status?: string; method?: string }): Promise<AdminPayment[]> => {
    const p = new URLSearchParams();
    if (filters?.status) p.set('status', filters.status);
    if (filters?.method) p.set('method', filters.method);
    return api.get(`/api/payments/all?${p}`);
  },
  confirmPayment: (id: string): Promise<{ success: boolean }> =>
    api.post(`/api/payments/${id}/confirm`, {}),
  rejectPayment: (id: string): Promise<{ success: boolean }> =>
    api.post(`/api/payments/${id}/reject`, {}),

  // ── Products ───────────────────────────────────────────────────────
  getAllProducts: (module?: string): Promise<AdminProduct[]> =>
    api.get(`/api/products${module ? `?module=${module}` : ''}`),
  createProduct: (data: Omit<AdminProduct, 'id'>): Promise<AdminProduct> =>
    api.post('/api/products', data),
  updateProduct: (id: string, data: Partial<AdminProduct>): Promise<AdminProduct> =>
    api.patch(`/api/products/${id}`, data),
  deleteProduct: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/products/${id}`),

  // ── Bookings overview ──────────────────────────────────────────────
  getAllBookings: (): Promise<AdminBooking[]> => api.get('/api/admin/bookings'),

  // ── Clients ────────────────────────────────────────────────────────
  getClients: () => api.get('/api/admin/users'),
};
