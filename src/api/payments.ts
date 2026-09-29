import { api } from './client.js';

export type PaymentMethod = 'mvola' | 'orange' | 'airtel' | 'especes' | 'carte';

export interface PaymentInstructions {
  numero: string;
  texte: string;
  etapes: string;
}

export interface PaymentResult {
  id: string;
  reference: string;
  status: string;
  fee: number;
  total: number;
  instructions: PaymentInstructions | null;
  payment_url: string | null;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  method: PaymentMethod;
  status: 'pending' | 'pending_cash' | 'success' | 'failed';
  booking_type: string;
  booking_id: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentReceipt {
  payment: {
    id: string; reference: string; amount: number; fee: number; total: number;
    method: string; method_label: string; status: string;
    booking_type: string; booking_label: string;
    transaction_ref: string | null; paid_at: string | null; created_at: string;
  };
  client: { fullname: string; email: string; phone: string } | null;
  booking: Record<string, unknown>;
  issued_at: string;
  company: { name: string; address: string; phone: string; email: string; nif: string };
}

export const paymentsApi = {
  initiate: (data: {
    amount: number;
    method: PaymentMethod;
    booking_type: string;
    booking_id: string;
    customer_phone?: string;
    notes?: string;
  }): Promise<PaymentResult> => api.post('/api/payments/initiate', data),

  getStatus: (id: string): Promise<{ status: string; reference: string; amount: number; method: string }> =>
    api.get(`/api/payments/${id}/status`),

  getMy: (): Promise<Payment[]> => api.get('/api/payments/my'),

  getReceipt: (id: string): Promise<PaymentReceipt> => api.get(`/api/payments/${id}/receipt`),

  demoConfirm: (id: string) => api.post(`/api/payments/${id}/demo-confirm`, {}),

  // Admin only
  confirm: (id: string) => api.post(`/api/payments/${id}/confirm`, {}),
  reject:  (id: string) => api.post(`/api/payments/${id}/reject`, {}),
  getAll:  (filters?: { status?: string; method?: string }) => {
    const p = new URLSearchParams(filters as Record<string, string> ?? {});
    return api.get(`/api/payments/all?${p}`);
  },
};
