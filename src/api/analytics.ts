import { api } from './client';

export const analyticsApi = {
  kpis:            ()              => api.get('/api/analytics/kpis'),
  revenue:         (period = '30d', module?: string) => api.get(`/api/analytics/revenue?period=${period}${module ? `&module=${module}` : ''}`),
  occupancyHotel:  ()              => api.get('/api/analytics/occupancy/hotel'),
  occupancyField:  ()              => api.get('/api/analytics/occupancy/field'),
  topProducts:     ()              => api.get('/api/analytics/top-products'),
  exportExcel:     (period = '30d') => `/api/analytics/export?period=${period}`,
};
