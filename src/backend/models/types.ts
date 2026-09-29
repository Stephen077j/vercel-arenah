// All data models / interfaces for the application

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'super_admin' | 'admin_module' | 'caissier';
  assignedModules: string[];
  active: boolean;
  createdAt: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  module: string;
  userId: string;
  date: string;
  cancelled: boolean;
}

export interface SaleItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  userId: string;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  userId: string;
  status: 'open' | 'closed';
}

export interface CashMovement {
  id: string;
  registerId: string;
  type: 'entry' | 'exit';
  amount: number;
  description: string;
  date: string;
  userId: string;
}

export interface AppSettings {
  businessName: string;
  currency: string;
  taxRate: number;
  activeModules: string[];
  setupComplete: boolean;
  cancellationPassword?: string;
}

export interface AuditEntry {
  id: string;
  action: string; // e.g. 'sale_create', 'expense_delete', 'user_update', 'cash_open'
  module: string;
  userId: string;
  userName: string;
  details: string;
  date: string;
}

export interface DailyReport {
  id: string;
  date: string; // YYYY-MM-DD
  totalSales: number;
  totalExpenses: number;
  salesCount: number;
  generatedAt: string;
  read: boolean;
}

export type ModuleType =
  | 'restaurant'
  | 'boutique'
  | 'salle_sport'
  | 'hotel'
  | 'terrain_foot'
  | 'piscine'
  | 'salon_coiffure'
  | 'espace_evenementiel'
  | 'espace_numerique'
  | 'spectacles';

export const MODULE_LABELS: Record<ModuleType, string> = {
  restaurant: 'Restaurant',
  boutique: 'Boutique',
  salle_sport: 'Salle de Sport',
  hotel: 'Hôtel / Chambres',
  terrain_foot: 'Terrain de Foot',
  piscine: 'Piscine',
  salon_coiffure: 'Salon de Coiffure',
  espace_evenementiel: 'Espace Événementiel',
  espace_numerique: 'Espace Numérique',
  spectacles: 'Spectacles',
};

export const MODULE_ICONS: Record<ModuleType, string> = {
  restaurant: 'UtensilsCrossed',
  boutique: 'ShoppingBag',
  salle_sport: 'Dumbbell',
  hotel: 'Hotel',
  terrain_foot: 'Trophy',
  piscine: 'Waves',
  salon_coiffure: 'Scissors',
  espace_evenementiel: 'PartyPopper',
  espace_numerique: 'Monitor',
  spectacles: 'Ticket',
};
