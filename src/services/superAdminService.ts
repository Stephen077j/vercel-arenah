import { api } from '@/api/client';
import type { DashboardData } from '@/types/super-admin';

/**
 * Données du tableau de bord Super Admin.
 *
 * Tout vient de PostgreSQL via l'API Express : GET /api/admin/sa-dashboard
 * (protégé par requireSuperAdmin) renvoie déjà la structure DashboardData
 * complète, en une seule requête.
 */
export const superAdminService = {
  getAll(): Promise<DashboardData> {
    return api.get<DashboardData>('/api/admin/sa-dashboard');
  },
};
