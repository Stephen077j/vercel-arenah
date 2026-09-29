import { motion } from 'framer-motion';
import { KPICards } from '@/components/super-admin/KPICards';
import { RevenueChart, UserGrowthChart } from '@/components/super-admin/RevenueChart';
import { ModulePerformanceChart, RevenueShareChart } from '@/components/super-admin/ModulePerformanceChart';
import { AlertsPanel } from '@/components/super-admin/AlertsPanel';
import { RecentActivity } from '@/components/super-admin/RecentActivity';
import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';
import { Loader2 } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const { data, isLoading } = useSuperAdminDashboard();

  // La sidebar et l'en-tête viennent de SuperAdminLayout, appliqué au niveau
  // de la route dans App.tsx.
  return (
      <div className="p-4 lg:p-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pilotage temps réel de toute l'entreprise — tous modules confondus.
          </p>
        </motion.div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données…
          </div>
        )}

        <KPICards stats={data?.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart data={data?.revenue} />
          </div>
          <ModulePerformanceChart data={data?.modulePerformance} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UserGrowthChart data={data?.userGrowth} />
          <RevenueShareChart data={data?.modulePerformance} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AlertsPanel alerts={data?.alerts} />
          <RecentActivity items={data?.activity} />
        </div>
      </div>
  );
}
