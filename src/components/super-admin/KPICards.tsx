import {
  DollarSign, Users, ShieldCheck, ShoppingCart, Calendar,
  Boxes, AlertTriangle, Activity,
} from 'lucide-react';
import { KpiCard } from '@/superadmin/components/KpiCard';
import type { DashboardStats } from '@/types/super-admin';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const ar = (n: number) => `${fmt(n)} Ar`;

export function KPICards({ stats }: { stats?: DashboardStats }) {
  const s = stats ?? {
    revenue: 0, clients: 0, moduleAdmins: 0, orders: 0,
    reservations: 0, activeModules: 0, criticalAlerts: 0, activeClients24h: 0,
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Chiffre d'affaires" value={ar(s.revenue)} icon={DollarSign} accent="amber" delay={0} />
      <KpiCard label="Clients" value={fmt(s.clients)} icon={Users} accent="sky" delay={0.05} />
      <KpiCard label="Admins module" value={fmt(s.moduleAdmins)} icon={ShieldCheck} accent="emerald" delay={0.1} />
      <KpiCard label="Commandes" value={fmt(s.orders)} icon={ShoppingCart} accent="violet" delay={0.15} />
      <KpiCard label="Réservations" value={fmt(s.reservations)} icon={Calendar} accent="sky" delay={0.2} />
      <KpiCard label="Modules actifs" value={fmt(s.activeModules)} icon={Boxes} accent="emerald" delay={0.25} />
      <KpiCard label="Alertes critiques" value={fmt(s.criticalAlerts)} icon={AlertTriangle} accent="rose" delay={0.3} />
      <KpiCard label="Clients actifs (24h)" value={fmt(s.activeClients24h)} icon={Activity} accent="violet" delay={0.35} />
    </div>
  );
}
