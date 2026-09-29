import { api } from './client.js';

export interface PromoResult {
  valid: boolean; code: string; type: string; value: number;
  discount: number; final_amount: number; description: string;
}
export interface PromoCode {
  id: string; code: string; type: string; value: number; min_amount: number;
  max_uses: number | null; uses_count: number; valid_from: string | null;
  valid_until: string | null; module: string | null; active: boolean; created_at: string;
}

export const promosApi = {
  validate:  (code: string, amount: number, module?: string): Promise<PromoResult> =>
    api.post('/api/promos/validate', { code, amount, module }),
  getPublic: (module: string): Promise<{ code: string; type: string; value: number; label: string }[]> =>
    api.get(`/api/promos/public/${module}`),
  // Admin
  getAll:   (): Promise<PromoCode[]>  => api.get('/api/promos'),
  create:   (data: Partial<PromoCode>): Promise<PromoCode> => api.post('/api/promos', data),
  toggle:   (id: string, active: boolean) => api.patch(`/api/promos/${id}`, { active }),
  remove:   (id: string) => api.delete(`/api/promos/${id}`),
};
