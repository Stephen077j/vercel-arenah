import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { loyaltyApi } from '@/api/loyalty';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useApiCartCount } from '@/client/lib/clientStore';
import { notifApi, productsApi } from '@/api/orders';
import { useClientAuth } from '../lib/clientAuth';
import logoIcon from '@/assets/logo-icon.png';

interface ApiNotif { id: string; title: string; message: string; type: string; read: boolean; created_at: string; }
interface SearchResult { type: 'product' | 'module'; label: string; sub?: string; path: string; }

/* ─── Module icons (custom SVG) ─────────────────────────────────── */
const IconBoutique = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5.5h14l-1.4 8.2a2 2 0 01-2 1.7H7.4a2 2 0 01-2-1.7L4 5.5z"/>
    <path d="M2 5.5h18"/>
    <circle cx="9" cy="19.5" r="1.1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="19.5" r="1.1" fill="currentColor" stroke="none"/>
    <path d="M8.5 5.5V4A1.5 1.5 0 0110 2.5h2A1.5 1.5 0 0113.5 4v1.5"/>
  </svg>
);
const IconRestaurant = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 2v7a3 3 0 003 3v8"/>
    <path d="M4.5 2v3h3V2M6 5v3"/>
    <path d="M15 2c0 0 3 2.5 3 6.5h-3L15 20"/>
  </svg>
);
const IconHotel = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="6" width="17" height="14" rx="2"/>
    <path d="M2.5 10h17"/>
    <path d="M10 2h2v4h-2z"/>
    <path d="M5.5 14.5h3a1 1 0 011 1v1H4.5v-1a1 1 0 011-1zM13.5 14.5h3a1 1 0 011 1v1h-5v-1a1 1 0 011-1z"/>
  </svg>
);
const IconGym = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 10.5a1.5 1.5 0 013 0v1H5v2.5a1 1 0 01-2 0v-5a1 1 0 012 0"/>
    <path d="M18.5 10.5a1.5 1.5 0 00-3 0v1H17v2.5a1 1 0 002 0v-5a1 1 0 00-2 0"/>
    <path d="M6.5 11.5h9"/>
    <path d="M8 9v4M14 9v4"/>
  </svg>
);
const IconPiscine = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c1.4 0 2.3-1.5 3.7-1.5S8 12 9.5 12s2.3-1.5 3.8-1.5S15.8 12 17.5 12 20 10.5 20 10.5"/>
    <path d="M2 16.5c1.4 0 2.3-1.5 3.7-1.5S8 16.5 9.5 16.5s2.3-1.5 3.8-1.5S15.8 16.5 17.5 16.5 20 15 20 15"/>
    <circle cx="16" cy="5.5" r="1.5"/>
    <path d="M16 8v3M13.5 7l1.5-1.5M9.5 7c0-2.3 2-3.8 4-2.8"/>
  </svg>
);
const IconSalon = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="17.5" r="1.8"/>
    <circle cx="17" cy="17.5" r="1.8"/>
    <path d="M6.5 15.7l7-10.4M17 15.7l-7-10.4"/>
    <path d="M9.5 5.3L8 3.2a1 1 0 00-1.5 0L5.3 4.2a1 1 0 000 1.5l1.2 1.2"/>
    <path d="M13 5.3l1.5-2.1a1 1 0 011.5 0l1.2 1a1 1 0 010 1.5l-1.2 1.2"/>
    <path d="M9.5 5.3s1 1.6 1.5 2.2 3-2.2 3-2.2"/>
  </svg>
);
const IconFoot = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8.5"/>
    <path d="M11 2.5L9.3 6l1.7 3h4l1.7-3L14 2.5"/>
    <path d="M2.7 8.7L5 10l1-2.5M19.3 8.7L17 10l-1-2.5"/>
    <path d="M7 19.5l1-3 3 1 3-1 1 3"/>
    <path d="M9.3 9h3l-1 3H9.3l-1-3z"/>
  </svg>
);
const IconEvent = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="16" height="14" rx="2"/>
    <path d="M3 9h16"/>
    <path d="M7 2.5v3M15 2.5v3"/>
    <path d="M11 14.5l1.3-1 1.3.8-.5-1.5 1.2-.9h-1.5l-.5-1.5-.5 1.5H10.3l1.2.9-.5 1.5 1-.8z" fill="currentColor" stroke="none"/>
  </svg>
);
const IconCyber = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3.5" width="18" height="11" rx="2"/>
    <path d="M7 18.5h8M11 14.5v4"/>
    <path d="M7.5 10l2-2.5 1.5 2 2-3 2.5 4"/>
    <circle cx="6.5" cy="7.5" r=".9" fill="currentColor" stroke="none"/>
  </svg>
);
const IconSpectacles = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 18.5V4.5L11 9l8.5-4.5v14"/>
    <path d="M2.5 4.5c3 2 5.5 3 8.5 3s5.5-1 8.5-3"/>
    <path d="M2.5 18.5c3-1.5 5.5-2 8.5-2s5.5.5 8.5 2"/>
    <path d="M11 7.5v8.5"/>
  </svg>
);
const IconEnfants = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="6" r="3"/>
    <path d="M7 14c0-2.2 1.8-4 4-4s4 1.8 4 4v1H7v-1z"/>
    <path d="M5 19.5c0-1.5 2.7-2.5 6-2.5s6 1 6 2.5"/>
    <path d="M4 10l-1.5 2.5M18 10l1.5 2.5"/>
    <circle cx="4.5" cy="9" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="17.5" cy="9" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);
const IconCommandes = () => (
  <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="14" height="18" rx="2"/>
    <path d="M8 7.5h6M8 11.5h6M8 15.5h4"/>
    <path d="M8 2v2M14 2v2"/>
  </svg>
);

/* ─── Top-bar icons ─────────────────────────────────────────────── */
const IconSearch = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="9" cy="9" r="5.5"/>
    <path d="M13.5 13.5L17 17"/>
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 22 22" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 19S2.5 13.5 2.5 7.5a4.5 4.5 0 018-2.8l.5.6.5-.6a4.5 4.5 0 018 2.8C19.5 13.5 11 19 11 19z"/>
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 22 22" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h1.5l2 9.5a2 2 0 002 1.5h7.5a2 2 0 001.95-1.57l1.55-6.43H5.5"/>
    <circle cx="9.5" cy="19" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="16.5" cy="19" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 22 22" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 20.5a1.5 1.5 0 003 0"/>
    <path d="M11 3A6.5 6.5 0 004.5 9.5V13L3 15.5h16L17.5 13V9.5A6.5 6.5 0 0011 3z"/>
    <path d="M11 1.5v1.5"/>
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3.5"/>
    <path d="M3.5 18.5a6.5 6.5 0 0113 0"/>
  </svg>
);
const IconMenu = () => (
  <svg viewBox="0 0 22 22" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M3 6h16M3 11h16M3 16h10"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 22 22" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M5 5l12 12M17 5L5 17"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 8l3.5 3.5L13 4"/>
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h12M5.5 4V3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M6 7v5M10 7v5M4.5 4l.8 9a.5.5 0 00.5.5h4.4a.5.5 0 00.5-.5l.8-9"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 15l4-5-4-5M17 10H7"/>
    <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3"/>
  </svg>
);
const IconProfileMenu = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3"/>
    <path d="M3 18a7 7 0 0114 0"/>
    <circle cx="10" cy="10" r="8.5"/>
  </svg>
);

/* ─── Nav data ──────────────────────────────────────────────────── */
const NAV = [
  { label: 'Boutique',   to: '/boutique',       Icon: IconBoutique   },
  { label: 'Restaurant', to: '/restaurant',     Icon: IconRestaurant },
  { label: 'Hôtel',      to: '/hotel',          Icon: IconHotel      },
  { label: 'Gym',        to: '/salle-de-sport', Icon: IconGym        },
  { label: 'Piscine',    to: '/piscine',        Icon: IconPiscine    },
  { label: 'Salon',      to: '/salon',          Icon: IconSalon      },
  { label: 'Terrain',    to: '/terrain-foot',   Icon: IconFoot       },
  { label: 'Événements', to: '/evenementiel',   Icon: IconEvent      },
  { label: 'Cybercafé',  to: '/cybercafe',      Icon: IconCyber      },
  { label: 'Spectacles', to: '/spectacles',     Icon: IconSpectacles },
  { label: 'Espace Kids',to: '/espace-enfants', Icon: IconEnfants    },
  { label: 'Commandes',  to: '/mes-commandes',  Icon: IconCommandes  },
];

/* ─── Header ────────────────────────────────────────────────────── */
const MODULES_SEARCH = [
  { label: 'Boutique', sub: 'Produits & équipements', path: '/boutique' },
  { label: 'Restaurant', sub: 'Menu & réservations', path: '/restaurant' },
  { label: 'Hôtel', sub: 'Réservation de chambres', path: '/hotel' },
  { label: 'Salle de sport', sub: 'Abonnements & coaching', path: '/salle-de-sport' },
  { label: 'Piscine', sub: 'Cours & forfaits', path: '/piscine' },
  { label: 'Salon', sub: 'Coiffure, Barbier, Ongles', path: '/salon' },
  { label: 'Terrain foot', sub: 'Basket, Tennis, Multisport', path: '/terrain-foot' },
  { label: 'Événementiel', sub: 'Devis & organisation', path: '/evenementiel' },
  { label: 'Cybercafé', sub: 'Réserver un poste PC', path: '/cybercafe' },
  { label: 'Spectacles', sub: 'Billets & réservations', path: '/spectacles' },
  { label: 'Espace Kids', sub: 'Jeux & anniversaires', path: '/espace-enfants' },
];

const ClientHeader = () => {
  const [open, setOpen] = useState(false);
  const navigate     = useNavigate();
  const cartCount    = useApiCartCount();
  const { user, loading, signOut } = useClientAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t } = useLang();
  const isAdmin = user && ['admin_module', 'super_admin'].includes(user.role);
  const [notifs, setNotifs] = useState<ApiNotif[]>([]);
  const unread = notifs.filter(n => !n.read).length;
  const [loyaltyPts, setLoyaltyPts] = useState<number | null>(null);

  /* ─── Recherche globale ─────────────────────────────── */
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadNotifs = useCallback(async () => {
    if (!user) return;
    try { const data: ApiNotif[] = await notifApi.getAll(); setNotifs(data.slice(0, 15)); } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 60000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  useEffect(() => {
    if (!user || isAdmin) return;
    loyaltyApi.getMe().then(d => setLoyaltyPts(d.total)).catch(() => {});
  }, [user, isAdmin]);

  const handleMarkAllRead = async () => {
    await notifApi.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  /* ─── Recherche : ⌘K pour ouvrir ───────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 80);
    if (!searchOpen) { setSearchQ(''); setSearchResults([]); }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults(MODULES_SEARCH.slice(0, 5).map(m => ({ type: 'module' as const, ...m })));
      return;
    }
    const q = searchQ.toLowerCase();
    const modMatches = MODULES_SEARCH
      .filter(m => m.label.toLowerCase().includes(q) || m.sub.toLowerCase().includes(q))
      .map(m => ({ type: 'module' as const, ...m }));
    setSearchResults(modMatches);
    setSearchLoading(true);
    productsApi.getAll(undefined, undefined, searchQ).then((data: unknown) => {
      const products = (data as { id: string; name: string; price: number; module: string }[]).slice(0, 4).map(p => ({
        type: 'product' as const,
        label: p.name,
        sub: `${p.module === 'restaurant' ? 'Restaurant' : 'Boutique'} · ${Number(p.price).toLocaleString('fr-FR')} Ar`,
        path: p.module === 'restaurant' ? '/restaurant' : '/boutique',
      }));
      setSearchResults(prev => [...prev.slice(0, 3), ...products]);
    }).catch(() => {}).finally(() => setSearchLoading(false));
  }, [searchQ]);

  return (
    <>
    <header className="sticky top-0 z-50"
      style={{
        background: 'hsl(var(--background) / 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid hsl(var(--border))',
      }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* TOP ROW */}
        <div className="flex h-16 items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img src={logoIcon} alt="ARENAH"
              className="transition-transform duration-300 group-hover:scale-105"
              style={{ width: 38, height: 38, objectFit: 'contain' }} />
            <div className="leading-none">
              <div className="font-bold text-[15px] tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>ARENAH</div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Self-service</div>
            </div>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-[280px] mx-2">
            <button type="button" onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 h-9 w-full rounded-full px-3.5 text-sm text-left transition-all duration-200"
              style={{
                background: 'hsl(var(--muted))',
                border: '1.5px solid hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(43 96% 44% / 0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; }}>
              <IconSearch />
              <span className="flex-1 text-xs">Rechercher…</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono"
                style={{ background: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>⌘K</kbd>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-0.5 shrink-0">

            {/* Language switcher */}
            <div className="hidden md:block mr-1">
              <LanguageSwitcher />
            </div>

            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-muted"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 22 22" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="4.5"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                <svg viewBox="0 0 22 22" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
                </svg>
              )}
            </button>

            <TopBtn to="/favoris" label={t('favorites')} className="hidden sm:flex">
              <IconHeart />
            </TopBtn>

            <Link to="/panier" aria-label="Panier"
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-muted"
              style={{ color: 'hsl(var(--foreground))' }}>
              <IconCart />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
                  style={{ background: 'hsl(43 96% 44%)', color: '#fff' }}>
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <button aria-label="Notifications"
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-muted"
                  style={{ color: 'hsl(var(--foreground))' }}>
                  <IconBell />
                  {unread > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
                      style={{ background: 'hsl(0 72% 51%)', color: '#fff' }}>
                      {unread}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="font-semibold text-sm">Notifications</span>
                  <div className="flex gap-1">
                    {unread > 0 && (
                      <button onClick={handleMarkAllRead}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition hover:bg-muted">
                        <IconCheck />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!user ? (
                    <p className="px-4 py-8 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Connectez-vous pour voir vos notifications
                    </p>
                  ) : notifs.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Aucune notification
                    </p>
                  ) : notifs.map(n => (
                    <div key={n.id} className="px-4 py-3"
                      onClick={() => { if (!n.read) { notifApi.markRead(n.id); setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); } }}
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        background: !n.read ? 'hsl(43 96% 44% / 0.07)' : undefined,
                        cursor: !n.read ? 'pointer' : 'default',
                      }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold leading-tight">{n.title}</div>
                        {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'hsl(0 72% 51%)' }} />}
                      </div>
                      {n.message && <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{n.message}</div>}
                      <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {new Date(n.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
                {user && (
                  <div className="border-t border-border px-4 py-2">
                    <Link to="/notifications" className="text-xs text-primary hover:underline">Voir toutes les notifications →</Link>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User */}
            {loading ? (
              <div className="w-8 h-8 rounded-full animate-pulse ml-1" style={{ background: 'hsl(var(--muted))' }} />
            ) : user && isAdmin ? (
              /* ── Bouton Admin ──────────────────────────────────────── */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1.5 hidden sm:flex items-center justify-center rounded-full transition-all duration-200 hover:ring-2 hover:ring-offset-1"
                    style={{ '--tw-ring-color': 'hsl(var(--primary) / 0.5)' } as React.CSSProperties}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url} alt={user.fullname} />
                      <AvatarFallback className="text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff' }}>
                        {initials(user.fullname)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold">{user.fullname}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: '#6366f1' }}>
                        {user.role === 'super_admin' ? '👑 Super Admin' : `Admin · ${user.module_assigned ?? ''}`}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer flex items-center gap-2 font-medium">
                      <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                        <rect x="12" y="2" width="8" height="8" rx="1.5"/>
                        <rect x="2" y="12" width="8" height="8" rx="1.5"/>
                        <rect x="12" y="12" width="8" height="8" rx="1.5"/>
                      </svg>
                      Panel Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive">
                    <IconLogout /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : user ? (
              /* ── Dropdown client normal ────────────────────────────── */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1.5 hidden sm:flex items-center justify-center rounded-full transition-all duration-200 hover:ring-2 hover:ring-offset-1"
                    style={{ '--tw-ring-color': 'hsl(43 96% 44% / 0.5)' } as React.CSSProperties}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url} alt={user.fullname} />
                      <AvatarFallback className="text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))', color: '#fff' }}>
                        {initials(user.fullname)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold">{user.fullname}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
                      {loyaltyPts !== null && (
                        <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md" style={{ background: '#d4af3718' }}>
                          <span style={{ fontSize: 12 }}>⭐</span>
                          <span className="text-[11px] font-bold" style={{ color: '#d4a843' }}>{loyaltyPts.toLocaleString()} pts</span>
                          <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>≈ {(loyaltyPts * 10).toLocaleString()} Ar</span>
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/mes-commandes" className="cursor-pointer flex items-center gap-2">
                      <IconCommandes /> Mes activités
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mes-paiements" className="cursor-pointer flex items-center gap-2">
                      <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="18" height="13" rx="2"/>
                        <path d="M2 9h18"/>
                        <path d="M6 13h4"/>
                      </svg>
                      Mes paiements
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favoris" className="cursor-pointer flex items-center gap-2">
                      <IconHeart /> Mes favoris
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/parrainage" className="cursor-pointer flex items-center gap-2">
                      <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="8" width="6" height="6" rx="1.5"/><rect x="13" y="2" width="6" height="6" rx="1.5"/><rect x="13" y="14" width="6" height="6" rx="1.5"/>
                        <path d="M9 11h2.5M14 5H11.5v3M11.5 8v9M11.5 17H14"/>
                      </svg>
                      Parrainage 🎁
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profil" className="cursor-pointer flex items-center gap-2">
                      <IconProfileMenu /> Mon profil
                    </Link>
                  </DropdownMenuItem>
                  {(user?.role === 'proprietaire' || user?.role === 'super_admin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/proprietaire" className="cursor-pointer flex items-center gap-2 font-medium" style={{ color: '#d4a843' }}>
                        <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65"><path d="M11 2l2.5 5.5L19 8.5l-4 4 1 6.5L11 16l-5 3 1-6.5-4-4 5.5-.5L11 2z"/></svg>
                        Tableau propriétaire
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive">
                    <IconLogout /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button onClick={() => navigate('/login')}
                className="hidden sm:flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ml-1.5"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))',
                  color: '#fff',
                  boxShadow: '0 4px 14px hsl(43 96% 44% / 0.3)',
                }}>
                <IconUser />
                Connexion
              </button>
            )}

            {/* Burger */}
            <button onClick={() => setOpen(!open)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-muted ml-1"
              style={{ color: 'hsl(var(--foreground))' }}>
              {open ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* SUB-NAV — caché pour les admins */}
        <nav className={`${isAdmin ? 'hidden' : 'hidden md:flex'} items-center gap-0.5 h-11 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto`}
          style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ label, to, Icon }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer"
                  style={isActive ? {
                    background: 'hsl(43 96% 44% / 0.1)',
                    color: 'hsl(43 92% 38%)',
                  } : {
                    color: 'hsl(var(--muted-foreground))',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))';
                      (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))';
                    }
                  }}>
                  <Icon />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* MOBILE MENU */}
        {open && (
          <div className="md:hidden border-t py-3 space-y-0.5" style={{ borderColor: 'hsl(var(--border))' }}>
            {/* Nav modules — masquée pour les admins */}
            {!isAdmin && NAV.map(({ label, to, Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                style={{ color: 'hsl(var(--foreground))' }}>
                <Icon />
                {label}
              </Link>
            ))}
            {!isAdmin && (
              <div className="pt-2 border-t space-y-0.5" style={{ borderColor: 'hsl(var(--border))' }}>
                <Link to="/favoris" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                  style={{ color: 'hsl(var(--foreground))' }}>
                  <IconHeart /> Mes favoris
                </Link>
                <Link to="/panier" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                  style={{ color: 'hsl(var(--foreground))' }}>
                  <IconCart /> Panier {cartCount > 0 && `(${cartCount})`}
                </Link>
              </div>
            )}

            {user ? (
              <div className="pt-2 border-t space-y-0.5" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs font-bold"
                      style={{ background: isAdmin ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))', color: '#fff' }}>
                      {initials(user.fullname)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{user.fullname}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
                    {isAdmin && <p className="text-[10px] font-medium" style={{ color: '#6366f1' }}>
                      {user.role === 'super_admin' ? '👑 Super Admin' : `Admin · ${user.module_assigned}`}
                    </p>}
                  </div>
                </div>
                {isAdmin ? (
                  <Link to="/admin" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                    style={{ color: '#6366f1' }}>
                    <svg viewBox="0 0 22 22" className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5"/>
                      <rect x="2" y="12" width="8" height="8" rx="1.5"/><rect x="12" y="12" width="8" height="8" rx="1.5"/>
                    </svg>
                    Panel Admin
                  </Link>
                ) : (
                  <Link to="/profil" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <IconProfileMenu /> Mon profil
                  </Link>
                )}
                <button onClick={() => { setOpen(false); signOut(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-muted"
                  style={{ color: 'hsl(0 72% 51%)' }}>
                  <IconLogout /> Déconnexion
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <button onClick={() => { setOpen(false); navigate('/login'); }}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))',
                    color: '#fff',
                  }}>
                  <IconUser /> Se connecter
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>

      {/* ─── Modal recherche globale ─────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <IconSearch />
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Rechercher un service, un produit…"
                className="flex-1 h-14 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searchLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded text-[10px] border border-border text-muted-foreground">Esc</kbd>
            </div>
            {/* Résultats */}
            <div className="max-h-80 overflow-y-auto py-2">
              {searchResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucun résultat</p>
              ) : (
                <>
                  {!searchQ && <p className="px-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Services populaires</p>}
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setSearchOpen(false); navigate(r.path); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition text-left">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {r.type === 'product' ? '🛍️' : '📍'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ─── TopBtn helper ─────────────────────────────────────────────── */
function TopBtn({ to, label, children, className = '' }: {
  to: string; label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Link to={to} aria-label={label}
      className={`items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-muted ${className}`}
      style={{ color: 'hsl(var(--foreground))' }}>
      {children}
    </Link>
  );
}

export default ClientHeader;
