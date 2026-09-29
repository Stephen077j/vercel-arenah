import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, ArrowRight, ShoppingBag, UtensilsCrossed, Hotel, Dumbbell,
  Waves, Scissors, Calendar, MonitorPlay, Ticket, Trophy, Star,
  Sparkles, ShieldCheck, Clock, CreditCard, MapPin, ChevronRight, Quote,
  Mail, Phone, Facebook, ExternalLink, Tag, Loader2, Baby,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '../lib/clientStore';

/* ── Countdown hook ──────────────────────────────────────────────────────── */
function useCountdown(targetMs: number) {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetMs - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, done: diff === 0 };
  }, [targetMs]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

/* ── CountdownBadge ──────────────────────────────────────────────────────── */
function CountdownBadge({ offsetHours, accent }: { offsetHours: number; accent: string }) {
  const midnight = new Date(); midnight.setHours(23 - offsetHours, 59, 59, 0);
  const { h, m, s } = useCountdown(midnight.getTime());
  return (
    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-white/80">
      <Clock className="w-3 h-3" style={{ color: accent }} />
      <span>Expire dans</span>
      <span style={{ color: accent }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
    </div>
  );
}

/* ── MODULE METADATA ─────────────────────────────────────────────────────── */

const MODULE_META: Record<string, { label: string; path: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  hotel:      { label: 'Hôtel',          path: '/hotel',          icon: Hotel,         accent: '#6366f1' },
  gym:        { label: 'Salle de sport', path: '/salle-de-sport', icon: Dumbbell,      accent: '#10b981' },
  salon:      { label: 'Salon',          path: '/salon',          icon: Scissors,      accent: '#f43f5e' },
  field:      { label: 'Terrain foot',   path: '/terrain-foot',   icon: Trophy,        accent: '#84cc16' },
  pool:       { label: 'Piscine',        path: '/piscine',        icon: Waves,         accent: '#0ea5e9' },
  cybercafe:  { label: 'Cybercafé',      path: '/cybercafe',      icon: MonitorPlay,   accent: '#06b6d4' },
  event:      { label: 'Événementiel',   path: '/evenementiel',   icon: Calendar,      accent: '#a855f7' },
  show:       { label: 'Spectacles',     path: '/spectacles',     icon: Ticket,        accent: '#e879f9' },
  boutique:   { label: 'Boutique',       path: '/boutique',       icon: ShoppingBag,   accent: '#3b82f6' },
  restaurant: { label: 'Restaurant',     path: '/restaurant',     icon: UtensilsCrossed, accent: '#f59e0b' },
  order:      { label: 'Commandes',      path: '/restaurant',     icon: UtensilsCrossed, accent: '#f59e0b' },
  pool_course:{ label: 'Cours piscine',  path: '/piscine',        icon: Waves,         accent: '#0ea5e9' },
  kids:       { label: 'Espace Enfants', path: '/espace-enfants', icon: Baby,          accent: '#ec4899' },
};

const PROMO_ACCENTS = ['bg-amber-500','bg-indigo-500','bg-emerald-500','bg-rose-500','bg-sky-500','bg-violet-500'];

const CATEGORIES = [
  { icon: ShoppingBag,   label: 'Boutique',     hint: 'Produits & équipements', path: '/boutique',       img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80&auto=format&fit=crop', accent: '#3b82f6' },
  { icon: UtensilsCrossed,label:'Restaurant',   hint: 'Menu & réservation',     path: '/restaurant',     img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80&auto=format&fit=crop', accent: '#f59e0b' },
  { icon: Hotel,          label: 'Hôtel',       hint: '24 chambres',            path: '/hotel',          img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80&auto=format&fit=crop', accent: '#6366f1' },
  { icon: Dumbbell,       label: 'Salle de sport',hint:'Abonnements',           path: '/salle-de-sport', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&auto=format&fit=crop', accent: '#10b981' },
  { icon: Waves,          label: 'Piscine',     hint: 'Cours & forfaits',       path: '/piscine',        img: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=600&q=80&auto=format&fit=crop', accent: '#0ea5e9' },
  { icon: Scissors,       label: 'Salon',       hint: 'Prise de RDV',           path: '/salon',          img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80&auto=format&fit=crop', accent: '#f43f5e' },
  { icon: Trophy,         label: 'Terrain foot',hint: 'Créneaux dispo',         path: '/terrain-foot',   img: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=80&auto=format&fit=crop', accent: '#84cc16' },
  { icon: Calendar,       label: 'Événementiel',hint: 'Devis instantané',       path: '/evenementiel',   img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80&auto=format&fit=crop', accent: '#a855f7' },
  { icon: MonitorPlay,    label: 'Cybercafé',   hint: 'Réserver un poste',      path: '/cybercafe',      img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80&auto=format&fit=crop', accent: '#06b6d4' },
  { icon: Ticket,         label: 'Spectacles',  hint: 'E-tickets',              path: '/spectacles',     img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80&auto=format&fit=crop', accent: '#e879f9' },
  { icon: Baby,           label: 'Espace Enfants', hint: 'Jeux & anniversaires', path: '/espace-enfants', img: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80&auto=format&fit=crop', accent: '#ec4899' },
];

const TRUSTS = [
  { icon: ShieldCheck, label: 'Paiements sécurisés' },
  { icon: Clock,       label: 'Confirmation instantanée' },
  { icon: CreditCard,  label: 'MVola • Orange • Airtel • Visa' },
  { icon: MapPin,      label: 'Disponible dans toute la ville' },
];

// Fallback statique si aucune donnée DB
const FALLBACK_SERVICES = [
  { module: 'hotel',      bookings: 0 },
  { module: 'restaurant', bookings: 0 },
  { module: 'salon',      bookings: 0 },
  { module: 'show',       bookings: 0 },
];

/* ── TYPES ───────────────────────────────────────────────────────────────── */

interface FeedProduct {
  id: string; name: string; price: number; category: string;
  image_url: string | null; module: string;
  order_count: number; avg_rating: number | null; review_count: number;
}
interface FeedPromo {
  code: string; type: string; value: number; module: string | null;
  valid_until: string | null; label: string; badge: string; hint: string;
}
interface FeedTestimonial {
  module: string; rating: number; comment: string | null; fullname: string; created_at: string;
}
interface FeedService { module: string; bookings: number; }
interface TonightShow { id: string; title: string; artist: string; date: string; time: string; venue: string; category: string; base_price: number; }

/* ── CARTES PUBLICITAIRES EN VEDETTE ─────────────────────────────────────── */

const FEATURED_CARDS = [
  {
    tag: 'Offre exclusive',
    title: 'Suite & Vue Piscine',
    desc: 'Chambre avec petit-déjeuner inclus · Late checkout · Room service 24h',
    cta: 'Réserver ma suite',
    path: '/hotel',
    code: 'HOTEL10',
    codeBadge: '-10%',
    from: '#312e81',
    to: '#4c1d95',
    icon: '🏨',
    accent: '#818cf8',
  },
  {
    tag: 'Ce soir au restaurant',
    title: 'Dîner gastronomique 4 plats',
    desc: 'Pour 2 personnes — livraison en 25 min ou en salle · Chef étoilé',
    cta: 'Voir le menu',
    path: '/restaurant',
    code: 'RESTO15',
    codeBadge: '-15%',
    from: '#78350f',
    to: '#92400e',
    icon: '🍽️',
    accent: '#fbbf24',
  },
  {
    tag: 'Sport & Bien-être',
    title: 'Gym + Piscine illimité',
    desc: 'Abonnement mensuel · Accès coach personnel · Vestiaires premium',
    cta: "S'abonner maintenant",
    path: '/salle-de-sport',
    code: 'GYM5000',
    codeBadge: '-5 000 Ar',
    from: '#064e3b',
    to: '#065f46',
    icon: '💪',
    accent: '#34d399',
  },
];

/* ── PAGE ────────────────────────────────────────────────────────────────── */

const ClientHome = () => {
  const navigate = useNavigate();

  const [products, setProducts]       = useState<FeedProduct[]>([]);
  const [promos, setPromos]           = useState<FeedPromo[]>([]);
  const [testimonials, setTestimonials] = useState<FeedTestimonial[]>([]);
  const [services, setServices]       = useState<FeedService[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [tonightShow, setTonightShow] = useState<TonightShow | null>(null);
  const [activeCard, setActiveCard]   = useState(0);
  const [reco, setReco]               = useState<string[]>([]);
  const [recoPersonalized, setRecoPersonalized] = useState(false);
  const [recoReason, setRecoReason]   = useState('');

  useEffect(() => {
    fetch('/api/home/feed')
      .then(r => r.json())
      .then(data => {
        setProducts(data.top_products ?? []);
        setPromos(data.promos ?? []);
        setTestimonials(data.testimonials ?? []);
        setServices(data.top_services?.length ? data.top_services : FALLBACK_SERVICES);
      })
      .catch(() => setServices(FALLBACK_SERVICES))
      .finally(() => setFeedLoading(false));

    // Show ce soir
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/bookings/show/events?date=${today}`)
      .then(r => r.json())
      .then((shows: TonightShow[]) => {
        if (Array.isArray(shows) && shows.length > 0) setTonightShow(shows[0]);
      })
      .catch(() => {});

    // Recommandations personnalisées (JWT optionnel)
    const token = localStorage.getItem('arenah_token');
    fetch('/api/home/recommendations', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setReco(d.modules ?? []);
        setRecoPersonalized(d.personalized ?? false);
        setRecoReason(d.reason ?? '');
      })
      .catch(() => {});

    // Rotation automatique des cartes vedettes
    const interval = setInterval(() => setActiveCard(c => (c + 1) % FEATURED_CARDS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const displayServices = services.slice(0, 4);

  return (
    <div>
      {/* ══ BANNIÈRE ÉVÉNEMENT CE SOIR ══════════════════════════════════════ */}
      {tonightShow && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #e879f9 50%, #ec4899 100%)' }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">🎭</span>
              <div className="min-w-0">
                <span className="font-bold text-white text-sm">Ce soir · {tonightShow.time}</span>
                <span className="text-white/80 text-sm ml-2 truncate">{tonightShow.title} — {tonightShow.artist}</span>
              </div>
            </div>
            <Link to="/spectacles"
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition">
              Réserver <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-foreground mb-6">
                Tout ce dont vous avez besoin,
                <span className="block text-primary italic">en un seul endroit.</span>
              </h1>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/20 text-xs font-medium text-primary mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Nouvelle expérience self-service • 100% en ligne
              </div>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
                Réservez une chambre, commandez votre repas, achetez vos billets, gérez votre abonnement gym — sans appeler personne.
              </p>
              <div className="bg-card rounded-2xl shadow-trust-lg border border-border p-2 max-w-2xl">
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex items-center gap-3 flex-1 px-4">
                    <Search className="w-5 h-5 text-primary shrink-0" />
                    <input
                      placeholder="Que cherchez-vous ? (chambre, plat, créneau, spectacle…)"
                      className="flex-1 bg-transparent outline-none py-3 text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button size="lg" className="bg-primary-gradient text-white border-0 shadow-trust px-6">
                    Rechercher <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-1">
                  <span className="text-xs text-muted-foreground mr-1">Suggestions :</span>
                  {['Chambre ce week-end','Pizza margherita','Cours de natation','Concert samedi','Coupe homme'].map(s => (
                    <button key={s} className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-foreground transition">{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8">
                {TRUSTS.map(t => (
                  <div key={t.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <t.icon className="w-4 h-4 text-primary" /> {t.label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5 relative h-[460px] hidden lg:block"
            >
              <FloatingCard className="absolute bottom-0 right-12 w-72 z-10" delay={0.6}
                title="Concert Riake" meta="Samedi 20h • E-ticket QR" tag="Spectacle" rating={4.9} icon={Ticket} />
              <FloatingCard className="absolute top-0 right-4 w-72 z-20" delay={0}
                title="Suite Vue Mer" meta="420 000 Ar / nuit" tag="Hôtel" rating={4.9} icon={Hotel} />
              <FloatingCard className="absolute top-40 left-0 w-64 z-30" delay={0.3}
                title="Menu Découverte" meta="85 000 Ar — Livraison 25 min" tag="Restaurant" rating={4.9} icon={UtensilsCrossed} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ CARTES VEDETTES (PUBLICITÉ) ════════════════════════════════════ */}
      <section className="py-10 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl">Offres du moment</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Sélection exclusive ARENAH · Renouvelée chaque semaine</p>
            </div>
            <div className="flex gap-1.5">
              {FEATURED_CARDS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCard(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: activeCard === i ? 24 : 6,
                    background: activeCard === i ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURED_CARDS.map((card, i) => (
              <motion.div
                key={card.path}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="relative overflow-hidden rounded-2xl cursor-pointer group"
                style={{
                  background: `linear-gradient(135deg, ${card.from} 0%, ${card.to} 100%)`,
                  boxShadow: activeCard === i ? `0 8px 32px ${card.from}60` : 'none',
                  transform: activeCard === i ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                }}
                onClick={() => navigate(card.path)}
              >
                {/* Subtle dot pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `radial-gradient(circle, ${card.accent} 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }} />

                {/* Big icon watermark */}
                <div className="absolute -right-3 -bottom-3 text-8xl opacity-15 select-none pointer-events-none">
                  {card.icon}
                </div>

                <div className="relative p-6">
                  {/* Tag + badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${card.accent}25`, color: card.accent }}>
                      {card.tag}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/90">
                      {card.codeBadge}
                    </span>
                  </div>

                  <CountdownBadge offsetHours={i * 3} accent={card.accent} />
                  <h3 className="font-display text-2xl text-white leading-tight mb-2 mt-3">{card.title}</h3>
                  <p className="text-xs text-white/65 leading-relaxed mb-5">{card.desc}</p>

                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all group-hover:gap-2.5"
                      style={{ background: card.accent, color: '#000' }}
                      onClick={e => { e.stopPropagation(); navigate(card.path); }}
                    >
                      {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50">Code promo</p>
                      <p className="font-mono text-xs font-bold text-white/90 tracking-widest">{card.code}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CATÉGORIES ═════════════════════════════════════════════════════ */}
      <Section title="Explorez par catégorie" sub="Tous les services ARENAH, accessibles 24/7.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {CATEGORIES.map((c, i) => (
            <motion.button
              key={c.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              onClick={() => navigate(c.path)}
              className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ '--cat-accent': c.accent } as React.CSSProperties}
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <img src={c.img} alt={c.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${c.accent}33, ${c.accent}11)` }} />
                <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ background: c.accent }}>
                  <c.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="p-3.5">
                <div className="font-semibold text-sm text-foreground leading-tight">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 mb-3">{c.hint}</div>
                <div className="inline-flex items-center gap-1 text-xs font-medium transition-all duration-200 group-hover:gap-2" style={{ color: c.accent }}>
                  Explorer <ArrowRight className="w-3 h-3" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-400 rounded-full" style={{ background: c.accent }} />
            </motion.button>
          ))}
        </div>
      </Section>

      {/* ══ RECOMMANDATIONS PERSONNALISÉES ═══════════════════════════════ */}
      {reco.length > 0 && (
        <Section
          title={recoPersonalized ? 'Pour vous' : 'Vous aimerez peut-être'}
          sub={recoReason}
          action={
            recoPersonalized ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Personnalisé par l'IA
              </span>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {reco.map((mod, i) => {
              const meta = MODULE_META[mod] ?? { label: mod, path: '/', icon: ShoppingBag, accent: '#6366f1' };
              const Icon = meta.icon;
              return (
                <motion.div
                  key={mod}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="group rounded-2xl border border-border bg-card p-5 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  onClick={() => navigate(meta.path)}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 duration-200"
                    style={{ background: `${meta.accent}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: meta.accent }} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {mod === 'hotel'      && 'Chambres & suites disponibles'}
                    {mod === 'restaurant' && 'Menu & commande en ligne'}
                    {mod === 'gym'        && 'Abonnements & coaching'}
                    {mod === 'salon'      && 'Prendre un rendez-vous'}
                    {mod === 'pool'       && 'Forfaits & cours de natation'}
                    {mod === 'show'       && 'Concerts & spectacles'}
                    {mod === 'boutique'   && 'Produits & équipements'}
                    {mod === 'field'      && 'Réserver un créneau terrain'}
                    {mod === 'event'      && 'Salles & événements'}
                    {mod === 'cybercafe'  && 'Postes & durées disponibles'}
                    {!['hotel','restaurant','gym','salon','pool','show','boutique','field','event','cybercafe'].includes(mod) && 'Découvrir ce service'}
                  </p>
                  <div
                    className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all duration-200"
                    style={{ color: meta.accent }}
                  >
                    Découvrir <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ══ PRODUITS POPULAIRES ════════════════════════════════════════════ */}
      <Section
        title="Produits & services populaires"
        sub="Ce que nos clients adorent en ce moment."
        action={
          <Link to="/boutique">
            <Button variant="ghost" size="sm" className="gap-1">Tout voir <ChevronRight className="w-4 h-4" /></Button>
          </Link>
        }
      >
        {feedLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Les produits populaires apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {products.map((p, i) => {
              const mod = MODULE_META[p.module] ?? MODULE_META['boutique'];
              return (
                <motion.article
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.03 }}
                  className="card-lift rounded-2xl border border-border bg-card overflow-hidden cursor-pointer"
                  onClick={() => navigate(p.module === 'boutique' ? `/boutique/${p.id}` : mod.path)}
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <>
                        <div className="absolute inset-0 grid-pattern opacity-40" />
                        <div className="relative w-14 h-14 rounded-2xl bg-card shadow-trust flex items-center justify-center">
                          <mod.icon className="w-6 h-6 text-primary" />
                        </div>
                      </>
                    )}
                    {p.order_count > 0 && (
                      <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider">
                        {p.order_count >= 100 ? 'Bestseller' : p.order_count >= 20 ? 'Populaire' : 'Top'}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{p.category || mod.label}</div>
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">{p.name}</h3>
                    <div className="flex items-center gap-1.5 mb-3 text-xs">
                      {p.avg_rating != null ? (
                        <>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3.5 h-3.5 ${j < Math.round(p.avg_rating!) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                          ))}
                          <span className="font-semibold text-amber-600">{Number(p.avg_rating).toFixed(1)}</span>
                          <span className="text-muted-foreground">({p.review_count})</span>
                        </>
                      ) : (
                        <>
                          {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-muted-foreground/20" />)}
                          <span className="text-muted-foreground text-[10px]">Pas encore noté</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="font-bold text-sm text-foreground">{formatPrice(p.price)}</div>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={e => { e.stopPropagation(); navigate(mod.path); }}>
                        Voir
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </Section>

      {/* ══ SERVICES LES PLUS RÉSERVÉS ════════════════════════════════════ */}
      <div className="w-full overflow-hidden leading-none" style={{ marginBottom: '-2px' }}>
        <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '56px', display: 'block' }}>
          <path d="M0,28 C240,56 480,0 720,28 C960,56 1200,0 1440,28 L1440,56 L0,56 Z" fill="#1a1814" />
        </svg>
      </div>
      <section className="relative overflow-hidden py-10" style={{ background: 'linear-gradient(160deg,#1a1814 0%,#111009 60%,#0e0d0b 100%)' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs><pattern id="bp-sb" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(212,175,55,0.05)" strokeWidth="0.5" />
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#bp-sb)" />
        </svg>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-7">
            <div className="text-xs uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: '#d4af37', opacity: 0.8 }}>
              Services les plus réservés
            </div>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight" style={{ color: '#f5f0e8' }}>
              Réservez, payez,{' '}<span style={{ color: '#d4af37' }}>c'est fait.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.55)' }}>
              Plus de file d'attente, plus de coup de téléphone. Vos demandes sont confirmées instantanément.
            </p>
          </div>

          {feedLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <div className="w-9 h-9 rounded-xl bg-muted/20 mb-3" />
                  <div className="h-4 bg-muted/20 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-muted/10 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayServices.map((s, i) => {
                const meta = MODULE_META[s.module] ?? { label: s.module, path: '/', icon: ShoppingBag, accent: '#d4af37' };
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={s.module}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="group rounded-2xl p-4 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                    style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.05)')}
                    onClick={() => navigate(meta.path)}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                      <Icon className="w-5 h-5" style={{ color: '#d4af37' }} />
                    </div>
                    <h3 className="font-semibold mb-1" style={{ color: '#f5f0e8', fontSize: '14px' }}>{meta.label}</h3>
                    {s.bookings > 0 && (
                      <p className="text-xs mb-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                        {Number(s.bookings).toLocaleString('fr-FR')} réservation{s.bookings > 1 ? 's' : ''}
                      </p>
                    )}
                    <button
                      className="flex items-center gap-1 mt-3 text-xs font-medium group-hover:gap-2 transition-all duration-200 bg-transparent border-0 p-0"
                      style={{ color: '#d4af37', opacity: 0.8 }}
                      onClick={e => { e.stopPropagation(); navigate(meta.path); }}
                    >
                      Réserver maintenant <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none" style={{ marginTop: '-2px' }}>
        <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '56px', display: 'block' }}>
          <path d="M0,28 C240,0 480,56 720,28 C960,0 1200,56 1440,28 L1440,0 L0,0 Z" fill="#1a1814" />
        </svg>
      </div>

      {/* ══ PROMOTIONS DYNAMIQUES ═════════════════════════════════════════ */}
      <Section title="Promotions du moment" sub="Offres actives — utilisez le code à la caisse.">
        {feedLoading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-3xl border border-border bg-card h-44 animate-pulse" />)}
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl text-muted-foreground">
            <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Aucune promotion active pour le moment.</p>
            <p className="text-xs mt-1">Revenez bientôt pour des offres exclusives !</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {promos.slice(0, 3).map((p, i) => (
              <motion.div
                key={p.code}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-lift relative overflow-hidden rounded-3xl bg-card border border-border p-7"
              >
                <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full ${PROMO_ACCENTS[i % PROMO_ACCENTS.length]} opacity-15 blur-2xl`} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Promo</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border font-bold tracking-wider">{p.code}</span>
                  </div>
                  <h3 className="font-display text-3xl mb-2 leading-tight">{p.badge}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{p.hint}</p>
                  <Button
                    variant="outline" size="sm" className="gap-1"
                    onClick={() => navigate(p.module ? (MODULE_META[p.module]?.path ?? '/') : '/')}
                  >
                    En profiter <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ══ TÉMOIGNAGES DYNAMIQUES ════════════════════════════════════════ */}
      <Section title="Ils nous font confiance" sub="Avis vérifiés laissés par nos clients après leur expérience.">
        {feedLoading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl border border-border bg-card h-48 animate-pulse" />)}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl text-muted-foreground">
            <Quote className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Soyez les premiers à laisser un avis !</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.slice(0, 3).map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-6 relative"
              >
                <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/15" />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6">"{t.comment}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center text-white font-semibold text-sm">
                    {t.fullname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.fullname}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      Client {MODULE_META[t.module]?.label ?? t.module}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ══ NOUS TROUVER ══════════════════════════════════════════════════ */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <MapPin className="w-3.5 h-3.5" /> Comment nous trouver
            </div>
            <h2 className="font-display text-3xl sm:text-4xl">ARENAH IVATO</h2>
            <p className="text-muted-foreground mt-2">Arenah Space · Route vers Anjomakely, Ivato</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 340 }}>
              <iframe
                title="ARENAH IVATO sur Google Maps"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d252.9!2d47.4662223!3d-18.7877524!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x21f0831832a67263%3A0x4017dba0715b2356!2sARENAH%20IVATO!5e0!3m2!1sfr!2smg!4v1750000000000"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                  <span className="font-bold text-lg">5.0</span>
                </div>
                <p className="text-xs text-muted-foreground">Note Google · Parc de loisirs</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Adresse</p>
                    <p className="text-sm text-muted-foreground">Route vers Anjomakely, Ivato<br/>Antananarivo, Madagascar</p>
                    <a href="https://maps.app.goo.gl/Dm9JAzTVqHCLgECaA" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      Voir sur Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Téléphone</p>
                    <a href="tel:+261344946939" className="text-sm text-muted-foreground hover:text-primary transition-colors">+261 34 49 469 39</a>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Horaires</p>
                    <p className="text-sm text-muted-foreground">Ouvert <span className="text-green-600 font-semibold">09h00 – 18h00</span> · Lun–Dim</p>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <Facebook className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Facebook</p>
                    <a href="https://web.facebook.com/profile.php?id=61588144163314" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                      Arenah Space <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              <a href="https://maps.app.goo.gl/Dm9JAzTVqHCLgECaA" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary text-primary text-sm font-medium py-3 hover:bg-primary hover:text-white transition-colors">
                <MapPin className="w-4 h-4" /> Obtenir l'itinéraire
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary-gradient p-10 sm:p-14 text-white">
            <div className="absolute inset-0 grid-pattern opacity-15" />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs mb-5">
                  <Mail className="w-3.5 h-3.5" /> Newsletter
                </div>
                <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-3">Recevez nos meilleures offres</h2>
                <p className="text-white/85 max-w-md">Promotions exclusives, nouveautés et événements — directement dans votre boîte mail.</p>
              </div>
              <form className="flex flex-col sm:flex-row gap-3" onSubmit={e => e.preventDefault()}>
                <Input type="email" placeholder="votre@email.com" className="h-12 bg-white text-foreground border-0 placeholder:text-muted-foreground" />
                <Button size="lg" className="h-12 bg-foreground text-background hover:bg-foreground/90 border-0 px-6">S'inscrire</Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ── HELPERS ─────────────────────────────────────────────────────────────── */

const Section = ({ title, sub, action, children }: {
  title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <section className="py-16">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight">{title}</h2>
          {sub && <p className="text-muted-foreground mt-2 text-sm">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  </section>
);

const CARD_BG_IMAGES: Record<string, string> = {
  Hôtel:      'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=600&q=50&auto=format&fit=crop',
  Restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=50&auto=format&fit=crop',
  Spectacle:  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=50&auto=format&fit=crop',
};

const FloatingCard = ({ className, delay, title, meta, tag, rating, icon: Icon }: {
  className?: string; delay: number; title: string; meta: string;
  tag: string; rating: number; icon: React.ComponentType<{ className?: string }>;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay }}
    className={`rounded-2xl bg-card shadow-trust-lg border border-border p-4 ${className}`}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(43 90% 92%)', color: 'hsl(43 96% 40%)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{tag}</div>
        <div className="font-semibold text-sm truncate">{title}</div>
      </div>
    </div>
    <div className="text-xs text-muted-foreground mb-3">{meta}</div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 text-xs">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="font-semibold">{rating}</span>
      </div>
      <Button size="sm" className="h-7 px-3 text-xs text-white border-0" style={{ background: 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))' }}>
        Réserver
      </Button>
    </div>
  </motion.div>
);

export default ClientHome;
