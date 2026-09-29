import './admin.css';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, CreditCard, Package,
  CalendarDays, Users, LogOut, Menu, X, Tag, BarChart2,
  Hotel, Dumbbell, Scissors, Trophy, Waves, Ticket, Monitor, Star, Shield,
  Settings, Brain,
} from 'lucide-react';
import { useClientAuth } from '@/client/lib/clientAuth';

const MODULE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  boutique:   { label: 'Boutique',    Icon: ShoppingBag,  color: '#a78bfa' },
  restaurant: { label: 'Restaurant',  Icon: Star,         color: '#f59e0b' },
  hotel:      { label: 'Hôtel',       Icon: Hotel,        color: '#38bdf8' },
  gym:        { label: 'Gym & Sport', Icon: Dumbbell,     color: '#f87171' },
  salon:      { label: 'Salon',       Icon: Scissors,     color: '#f472b6' },
  field:      { label: 'Terrains',    Icon: Trophy,       color: '#a3e635' },
  pool:       { label: 'Piscine',     Icon: Waves,        color: '#22d3ee' },
  event:      { label: 'Événements',  Icon: CalendarDays, color: '#818cf8' },
  spectacles: { label: 'Spectacles',  Icon: Ticket,       color: '#e879f9' },
  cybercafe:  { label: 'Cybercafé',   Icon: Monitor,      color: '#94a3b8' },
  kids:       { label: 'Espace Enfants', Icon: Star,      color: '#f472b6' },
};

// Nav items supplémentaires selon le module (configuration)
const MODULE_CONFIG_NAV: Record<string, { id: string; to: string; label: string; Icon: React.ElementType }[]> = {
  restaurant: [{ id:'config-tables',    to:'/admin/config/tables',        label:'🍽️ Gérer les tables',    Icon:Settings }],
  cybercafe:  [{ id:'config-stations',  to:'/admin/config/stations',      label:'🖥️ Gérer les postes',    Icon:Settings }],
  spectacles: [{ id:'config-sieges',    to:'/admin/config/sieges',        label:'🎭 Gérer les sièges',    Icon:Settings }],
  salon:      [{ id:'config-combos',    to:'/admin/config/combos',        label:'✨ Forfaits composés',   Icon:Settings }],
  hotel:      [{ id:'config-rooms',     to:'/admin/config/hotel-rooms',   label:'🛏️ Gérer les chambres', Icon:Settings }],
  gym:        [{ id:'config-gym',       to:'/admin/config/gym-plans',     label:'💪 Plans & Coachs',      Icon:Settings }],
  pool:       [{ id:'config-pool',      to:'/admin/config/pool-passes',   label:'🏊 Gérer les pass',      Icon:Settings }],
  field:      [{ id:'config-field',     to:'/admin/config/field-slots',   label:'⚽ Créneaux terrain',    Icon:Settings }],
  event:      [{ id:'config-event',     to:'/admin/config/event-halls',   label:'🏛️ Salles & Options',   Icon:Settings }],
  boutique:   [{ id:'config-boutique',  to:'/admin/config/boutique',      label:'🛍️ Catalogue produits', Icon:Settings }],
  kids:       [{ id:'config-kids',      to:'/admin/config/kids-tickets',  label:'🎠 Tarifs enfants',      Icon:Settings }],
};

const MODULE_SECTIONS = (mod: string | null | undefined): string[] => {
  if (!mod) return ['dashboard','commandes','paiements','produits','reservations','clients','promos','analytics','ia'];
  if (['boutique','restaurant'].includes(mod)) return ['dashboard','commandes','paiements','produits','clients','promos','analytics','ia'];
  return ['dashboard','paiements','reservations','clients','analytics','ia'];
};
// kids utilise les mêmes sections que les autres modules de service

const ALL_NAV = [
  { id:'dashboard',    to:'/admin',              label:'Tableau de bord',  Icon:LayoutDashboard, end:true  },
  { id:'commandes',    to:'/admin/commandes',    label:'Commandes',         Icon:ShoppingBag  },
  { id:'paiements',    to:'/admin/paiements',    label:'Paiements',         Icon:CreditCard   },
  { id:'produits',     to:'/admin/produits',     label:'Produits',          Icon:Package      },
  { id:'reservations', to:'/admin/reservations', label:'Réservations',      Icon:CalendarDays },
  { id:'clients',      to:'/admin/clients',      label:'Clients',           Icon:Users        },
  { id:'promos',       to:'/admin/promos',       label:'Codes promo',       Icon:Tag          },
  { id:'analytics',    to:'/admin/analytics',    label:'Analytics',          Icon:BarChart2    },
  { id:'ia',           to:'/admin/ia',           label:'Intelligence IA',   Icon:Brain        },
];

export default function AdminLayout() {
  const { user, signOut } = useClientAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!['admin_module','super_admin'].includes(user.role)) return <Navigate to="/" replace />;

  const isSuperAdmin  = user.role === 'super_admin';
  const mod           = user.module_assigned ?? null;
  const moduleMeta    = mod ? MODULE_META[mod] : null;
  const configNav     = mod ? (MODULE_CONFIG_NAV[mod] ?? []) : [];
  const nav           = ALL_NAV.filter(n => MODULE_SECTIONS(mod).includes(n.id));

  const initials = (s: string) => (s ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);

  const Sidebar = () => (
    <aside style={{
      width: 240, flexShrink: 0, height: '100%',
      background: 'var(--adm-sidebar)',
      borderRight: '1px solid var(--adm-border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--adm-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background: moduleMeta
              ? `linear-gradient(135deg, ${moduleMeta.color}55, ${moduleMeta.color}22)`
              : 'linear-gradient(135deg,#d4a84333,#d4a84311)',
            border: `1.5px solid ${moduleMeta?.color ?? '#d4a843'}33`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {moduleMeta
              ? <moduleMeta.Icon size={18} style={{ color: moduleMeta.color }} />
              : <Shield size={18} style={{ color:'#d4a843' }} />
            }
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--adm-text)' }}>
              {isSuperAdmin ? 'Super Admin' : (moduleMeta?.label ?? 'Admin')}
            </div>
            <div style={{ fontSize:10, color:'var(--adm-gold)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>
              ARENAH {isSuperAdmin ? '· Global' : '· Module'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 10px', overflowY:'auto' }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--adm-text-muted)', padding:'6px 6px 4px' }}>
          Navigation
        </div>
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}

        {/* Config module (dynamique par module assigné) */}
        {configNav.length > 0 && (
          <>
            <hr className="adm-divider" style={{ margin:'12px 6px' }} />
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--adm-text-muted)', padding:'4px 6px' }}>
              Configuration
            </div>
            {configNav.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </>
        )}

        <hr className="adm-divider" style={{ margin:'12px 6px' }} />
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--adm-text-muted)', padding:'4px 6px' }}>
          Accès rapide
        </div>
        <Link to="/" className="adm-nav-link" style={{ fontSize:12 }}>
          <span style={{ opacity:0.6 }}>← </span> Site client
        </Link>
      </nav>

      {/* User */}
      <div style={{ borderTop:'1px solid var(--adm-border)', padding:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', borderRadius:10, background:'rgba(255,255,255,0.03)' }}>
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background:'linear-gradient(135deg,#d4a843,#b8921f)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#000',
          }}>
            {initials(user.fullname ?? user.email)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--adm-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.fullname ?? user.email}
            </div>
            <div style={{ fontSize:10, color:'var(--adm-gold)' }}>
              {isSuperAdmin ? '👑 Super Admin' : `Module: ${moduleMeta?.label ?? mod}`}
            </div>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/login'); }}
          className="adm-btn adm-btn-ghost"
          style={{ width:'100%', marginTop:6, justifyContent:'center', fontSize:12 }}>
          <LogOut size={13} /> Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-premium" style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ height:'100%' }}>
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}
               onClick={() => setSidebarOpen(false)} />
          <div style={{ position:'relative', zIndex:10, width:240, height:'100%' }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Mobile topbar */}
        <div className="md:hidden" style={{
          display:'flex', alignItems:'center', gap:12, padding:'0 16px', height:56,
          borderBottom:'1px solid var(--adm-border)', background:'var(--adm-sidebar)',
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background:'none', border:'none', color:'var(--adm-text)', cursor:'pointer', padding:6 }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--adm-text)' }}>
            {isSuperAdmin ? 'ARENAH Admin' : moduleMeta?.label ?? 'Admin'}
          </span>
          <div style={{ marginLeft:'auto', fontSize:11, color:'var(--adm-gold)', fontWeight:600 }}>
            ARENAH
          </div>
        </div>

        <main style={{ flex:1, overflowY:'auto', padding:'28px 28px 40px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
