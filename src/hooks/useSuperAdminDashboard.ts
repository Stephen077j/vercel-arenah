import { useQuery } from '@tanstack/react-query';
import { superAdminService } from '@/services/superAdminService';

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: () => superAdminService.getAll(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
