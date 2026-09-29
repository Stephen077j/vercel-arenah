export interface DashboardStats {
  revenue: number;
  clients: number;
  moduleAdmins: number;
  orders: number;
  reservations: number;
  activeModules: number;
  criticalAlerts: number;
  /** Clients distincts ayant payé dans les dernières 24 h. */
  activeClients24h: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface ModulePerformance {
  module: string;
  value: number;
  share?: number;
}

export interface UserGrowthPoint {
  date: string;
  users: number;
}

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity?: string | null;
  actorEmail?: string | null;
  createdAt: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenue: RevenuePoint[];
  modulePerformance: ModulePerformance[];
  userGrowth: UserGrowthPoint[];
  alerts: AlertItem[];
  activity: ActivityItem[];
}
