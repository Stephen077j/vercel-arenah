import { api } from './client.js';

export interface LoyaltyLevel { name: string; color: string; min: number; next: number | null; }
export interface LoyaltyEntry { points: number; type: string; description: string; reference: string; created_at: string; }
export interface LoyaltyStatus { total: number; level: LoyaltyLevel; ar_per_point: number; history: LoyaltyEntry[]; }

export const loyaltyApi = {
  getMe:          (): Promise<LoyaltyStatus> => api.get('/api/loyalty/me'),
  previewRedeem:  (points: number): Promise<{ points: number; discount: number; remaining: number }> =>
    api.post('/api/loyalty/preview-redeem', { points }),
};
