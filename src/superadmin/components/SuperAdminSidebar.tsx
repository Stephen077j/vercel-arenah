import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, ScrollText, LogOut,
  Crown, History, Settings, ShieldCheck,
} from 'lucide-react';
import { useClientAuth } from '@/client/lib/clientAuth';
import { cn } from '@/lib/utils';

const items = [
  { to: '/super-admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/super-admin/users',      icon: Users,           label: 'Utilisateurs'     },
  { to: '/super-admin/history',    icon: History,         label: 'Historique global'},
  { to: '/super-admin/analytics',  icon: BarChart3,       label: 'Analytics'        },
  { to: '/super-admin/audit-logs', icon: ScrollText,      label: "Journaux d'audit" },
  { to: '/super-admin/platform-settings', icon: Settings, label: 'Paramètres'       },
  { to: '/admin',                  icon: ShieldCheck,     label: 'Vue Admin modules' },
];

export function SuperAdminSidebar() {
  const { user, signOut } = useClientAuth();
  const navigate = useNavigate();

  const initials = (s: string) =>
    (s ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-amber-500/10 text-slate-100">
      <div className="px-6 py-5 border-b border-amber-500/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Crown className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-white">ARENAH</div>
            <div className="text-xs text-amber-400/80 font-semibold uppercase tracking-wider">Super Admin</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/super-admin/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/25'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-amber-500/10 p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-black">
            {initials(user?.fullname ?? user?.email ?? '?')}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.fullname ?? 'Super Admin'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { signOut(); navigate('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
