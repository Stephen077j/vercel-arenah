import { User } from './database';

// Pages accessible by role
const ROLE_PAGES: Record<User['role'], string[]> = {
  super_admin: ['dashboard', 'products', 'sales', 'expenses', 'cash', 'reports', 'users', 'settings', 'admin_tools'],
  admin_module: ['dashboard', 'products', 'sales', 'cash', 'reports'],
  caissier: ['sales', 'cash'],
};

export const canAccessPage = (user: User | null, page: string): boolean => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  if (page.startsWith('module_')) {
    if (user.role === 'admin_module') {
      const mod = page.replace('module_', '');
      return user.assignedModules?.includes(mod) ?? false;
    }
    return false;
  }

  return ROLE_PAGES[user.role]?.includes(page) ?? false;
};

export const getAccessiblePages = (user: User | null): string[] => {
  if (!user) return [];
  return ROLE_PAGES[user.role] || [];
};

export const canAccessModules = (user: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin_module') return (user.assignedModules?.length ?? 0) > 0;
  return false;
};

export const getUserModules = (user: User | null, allModules: string[]): string[] => {
  if (!user) return [];
  if (user.role === 'super_admin') return allModules;
  if (user.role === 'admin_module') return user.assignedModules || [];
  return [];
};

export const getRoleLabel = (role: User['role']): string => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin_module': return 'Admin Module';
    case 'caissier': return 'Caissier';
  }
};
