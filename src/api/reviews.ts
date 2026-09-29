import { api } from './client.js';

export interface Review { id: string; rating: number; comment: string | null; fullname: string; created_at: string; }
export interface ModuleRatings { module: string; average: number | null; count: number; reviews: Review[]; }

export const reviewsApi = {
  getModule:  (module: string): Promise<ModuleRatings>  => api.get(`/api/reviews/module/${module}`),
  getItems:   (module: string): Promise<Record<string, { avg: number; count: number }>> =>
    api.get(`/api/reviews/items?module=${module}`),
  submit:     (data: { module: string; booking_type?: string; booking_id?: string; rating: number; comment?: string }) =>
    api.post('/api/reviews', data),
  getMy:      (): Promise<Review[]> => api.get('/api/reviews/my'),
};
