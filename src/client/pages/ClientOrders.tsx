import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Hotel, Dumbbell, Scissors, Trophy, Waves, CalendarDays,
  Ticket, Monitor, ChefHat, Clock, Check, X, Loader2, RefreshCw,
  CreditCard, Filter, Star, MessageSquare, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { cartApi } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ordersApi } from '@/api/orders';
import { paymentsApi } from '@/api/payments';
import {
  hotelApi, gymApi, salonApi, fieldApi, poolApi, eventApi, showApi, cybercafeApi,
} from '@/api/bookings';
import { formatPrice } from '../lib/clientStore';
import { toast } from 'sonner';

// ── Types normalisés ───────────────────────────────────────────────────────
type ActivityType =
  | 'order' | 'restaurant'
  | 'hotel'
  | 'gym' | 'gym_coach'
  | 'salon'
  | 'field'
  | 'pool' | 'pool_course'
  | 'event'
  | 'show'
  | 'cybercafe';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  statusLabel: string;
  statusColor: string;
  date: string;
  canCancel: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function statusMeta(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    en_attente:  { label: 'En attente',     color: 'bg-amber-500/15 text-amber-700' },
    preparation: { label: 'En préparation', color: 'bg-blue-500/15 text-blue-700' },
    expediee:    { label: 'Expédiée',       color: 'bg-indigo-500/15 text-indigo-700' },
    livree:      { label: 'Livrée',         color: 'bg-emerald-500/15 text-emerald-700' },
    confirme:    { label: 'Confirmé',       color: 'bg-emerald-500/15 text-emerald-700' },
    active:      { label: 'Actif',          color: 'bg-emerald-500/15 text-emerald-700' },
    paid:        { label: 'Payé',           color: 'bg-emerald-500/15 text-emerald-700' },
    completed:   { label: 'Terminé',        color: 'bg-slate-500/15 text-slate-600' },
    pending:     { label: 'En attente',     color: 'bg-amber-500/15 text-amber-700' },
    annule:      { label: 'Annulé',         color: 'bg-red-500/15 text-red-700' },
    annulee:     { label: 'Annulée',        color: 'bg-red-500/15 text-red-700' },
    canceled:    { label: 'Annulé',         color: 'bg-red-500/15 text-red-700' },
    cancelled:   { label: 'Annulé',         color: 'bg-red-500/15 text-red-700' },
  };
  return map[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
}

const TYPE_META: Record<ActivityType, { label: string; Icon: React.ElementType; color: string; module: string }> = {
  order:       { label: 'Boutique',        Icon: Package,      color: '#6366f1', module: 'boutique'   },
  restaurant:  { label: 'Restaurant',      Icon: ChefHat,      color: '#f59e0b', module: 'restaurant' },
  hotel:       { label: 'Hôtel',           Icon: Hotel,        color: '#0ea5e9', module: 'hotel'      },
  gym:         { label: 'Gym',             Icon: Dumbbell,     color: '#ef4444', module: 'gym'        },
  gym_coach:   { label: 'Coach',           Icon: Dumbbell,     color: '#f97316', module: 'gym'        },
  salon:       { label: 'Salon',           Icon: Scissors,     color: '#ec4899', module: 'salon'      },
  field:       { label: 'Terrain',         Icon: Trophy,       color: '#84cc16', module: 'field'      },
  pool:        { label: 'Piscine',         Icon: Waves,        color: '#06b6d4', module: 'pool'       },
  pool_course: { label: 'Cours piscine',   Icon: Waves,        color: '#0284c7', module: 'pool'       },
  event:       { label: 'Événementiel',    Icon: CalendarDays, color: '#8b5cf6', module: 'event'      },
  show:        { label: 'Spectacle',       Icon: Ticket,       color: '#d946ef', module: 'show'       },
  cybercafe:   { label: 'Cybercafé',       Icon: Monitor,      color: '#475569', module: 'cybercafe'  },
};

const REVIEWABLE_STATUSES = new Set(['livree', 'completed', 'confirme', 'active', 'paid']);
const REORDERABLE_STATUSES = new Set(['livree', 'completed', 'annulee', 'annule', 'canceled', 'cancelled']);

// ── Timeline pour commandes boutique/restaurant ───────────────────────────
const ORDER_STEPS = [
  { key: 'en_attente',  label: 'Reçue' },
  { key: 'preparation', label: 'Préparation' },
  { key: 'expediee',    label: 'En route' },
  { key: 'livree',      label: 'Livrée' },
];
const STEP_IDX: Record<string, number> = {
  en_attente: 0, preparation: 1, expediee: 2, livree: 3, completed: 3,
};

function OrderTimeline({ status }: { status: string }) {
  const current = STEP_IDX[status] ?? -1;
  if (current < 0) return null;
  return (
    <div className="flex items-center gap-0 mt-3 mb-1">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border'
              } ${active ? 'ring-2 ring-primary/30' : ''}`}>
                {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </div>
              <span className={`text-[9px] mt-1 font-medium ${active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                {step.label}
              </span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${i < current ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stars interactives ─────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const labels = ['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const active = n <= (hovered || value);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="transition-all duration-100 hover:scale-110 active:scale-95 focus:outline-none"
            >
              <Star
                className="transition-all duration-150"
                style={{ width: 40, height: 40 }}
                fill={active ? '#f59e0b' : 'transparent'}
                stroke={active ? '#f59e0b' : '#94a3b8'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      <span className="text-sm font-medium text-muted-foreground h-5 transition-all">
        {labels[hovered || value] ?? ''}
      </span>
    </div>
  );
}

// ── Modal avis ─────────────────────────────────────────────────────────────
function ReviewModal({ activity, onClose, onDone }: {
  activity: Activity;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const meta = TYPE_META[activity.type];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (rating === 0) { toast.error('Sélectionnez une note'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: meta.module,
          booking_type: activity.type,
          booking_id: activity.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (res.status === 409) { toast.error('Vous avez déjà noté cette prestation'); onClose(); return; }
      if (!res.ok) throw new Error('Erreur serveur');
      setDone(true);
      onDone(activity.id);
      setTimeout(onClose, 2000);
    } catch {
      toast.error("Impossible d'envoyer votre avis");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-background rounded-3xl w-full max-w-md shadow-2xl border border-border overflow-hidden">

        {done ? (
          /* ─── Succès ─── */
          <div className="flex flex-col items-center justify-center py-14 px-8 gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xl">Merci pour votre avis !</p>
              <p className="text-muted-foreground text-sm mt-1">Votre note aide la communauté ARENAH</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} style={{ width: 24, height: 24 }}
                  fill={n <= rating ? '#f59e0b' : 'transparent'}
                  stroke={n <= rating ? '#f59e0b' : '#94a3b8'}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ─── Formulaire ─── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${meta.color}18` }}
                >
                  <meta.Icon style={{ color: meta.color, width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{activity.title}</p>
                  <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 pb-6 pt-6 space-y-6">
              {/* Question */}
              <div className="text-center">
                <h3 className="font-semibold text-lg">Comment était votre expérience ?</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Votre avis compte pour nous</p>
              </div>

              {/* Stars */}
              <StarRating value={rating} onChange={setRating} />

              {/* Commentaire */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Partagez les détails de votre expérience…"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                />
                <p className="text-right text-[10px] text-muted-foreground mt-1">{comment.length}/500</p>
              </div>

              {/* Submit */}
              <Button
                className="w-full h-11 rounded-xl text-sm font-medium"
                onClick={submit}
                disabled={rating === 0 || submitting}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publication…</>
                  : <><Check className="w-4 h-4 mr-2" />Publier mon avis</>
                }
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Normalisation par source ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrder(o: any): Activity {
  const type: ActivityType = o.module === 'restaurant' ? 'restaurant' : 'order';
  const { label: statusLabel, color: statusColor } = statusMeta(o.status);
  return {
    id: o.id, type, title: `${TYPE_META[type].label} — commande`,
    subtitle: o.items_summary ?? `${o.type} · ${o.mode}`,
    amount: o.total, status: o.status, statusLabel, statusColor,
    date: o.created_at, canCancel: ['en_attente', 'preparation'].includes(o.status),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeHotel(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'hotel', title: b.room_name ?? 'Chambre hôtel',
    subtitle: `Du ${b.check_in} au ${b.check_out} · ${b.nights} nuit(s) · ${b.guests} pers.`,
    amount: b.deposit ?? b.total, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: b.status === 'confirme',
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGym(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'gym', title: b.plan_label ?? 'Abonnement salle',
    subtitle: `${b.days_remaining ?? '?'} j restants · ${b.customer_name ?? ''}`,
    amount: b.price ?? 0, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGymCoach(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status ?? 'confirme');
  return {
    id: b.id, type: 'gym_coach', title: `Séance avec ${b.coach_name ?? 'Coach'}`,
    subtitle: `${b.date} · ${b.hours ?? 1}h`,
    amount: b.price ?? 0, status: b.status ?? 'confirme', statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSalon(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'salon', title: b.service_label ?? 'RDV salon',
    subtitle: `${b.date} à ${b.slot} · ${b.customer_name ?? ''}`,
    amount: b.price ?? 0, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: b.status === 'confirme',
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeField(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'field', title: 'Terrain de foot — ARENAH',
    subtitle: `${b.date} · ${b.slot_label ?? b.slot}`,
    amount: b.price ?? 0, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: b.status === 'confirme',
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePool(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status ?? 'active');
  return {
    id: b.id, type: 'pool', title: b.pass_label ?? 'Pass piscine',
    subtitle: `${b.entries_left ?? '?'} entrées restantes · exp. ${b.expires_at ? new Date(b.expires_at).toLocaleDateString('fr-FR') : '?'}`,
    amount: b.price ?? 0, status: b.status ?? 'active', statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePoolCourse(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'pool_course', title: b.course_name ?? 'Cours piscine',
    subtitle: `${b.date} à ${b.slot} · ${b.instructor ?? ''}`,
    amount: b.price ?? 0, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEvent(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status);
  return {
    id: b.id, type: 'event', title: b.hall_name ?? 'Salle événementielle',
    subtitle: `${b.event_date} · ${b.guests ?? '?'} invités`,
    amount: b.deposit ?? 0, status: b.status, statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeShow(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status ?? 'confirme');
  return {
    id: b.id, type: 'show', title: b.show_title ?? 'Spectacle',
    subtitle: `${b.seats_count ?? '?'} place(s) · ${b.customer_name ?? ''}`,
    amount: b.total ?? 0, status: b.status ?? 'confirme', statusLabel, statusColor,
    date: b.created_at, canCancel: b.status !== 'annule',
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCyber(b: any): Activity {
  const { label: statusLabel, color: statusColor } = statusMeta(b.status ?? 'confirme');
  return {
    id: b.id, type: 'cybercafe', title: `Cybercafé — Poste ${b.station_number ?? '?'}`,
    subtitle: `${b.duration_label ?? '?'} · ${b.customer_name ?? ''}`,
    amount: b.total ?? b.duration_price ?? 0, status: b.status ?? 'confirme', statusLabel, statusColor,
    date: b.created_at, canCancel: false,
  };
}

// ── Composant carte ────────────────────────────────────────────────────────
function ActivityCard({ a, onCancel, cancelling, onReview, reviewed, onReorder }: {
  a: Activity;
  onCancel: (id: string, type: ActivityType) => void;
  cancelling: string | null;
  onReview: (a: Activity) => void;
  reviewed: Set<string>;
  onReorder?: (id: string) => void;
}) {
  const meta = TYPE_META[a.type];
  const { Icon } = meta;
  const d = new Date(a.date);
  const dateStr = isNaN(d.getTime()) ? a.date : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const canReview = REVIEWABLE_STATUSES.has(a.status) && !reviewed.has(a.id);
  const alreadyReviewed = reviewed.has(a.id);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex gap-4 transition-shadow hover:shadow-sm">
      {/* Icon badge */}
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: `${meta.color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <div className="font-semibold">{a.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{a.subtitle}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold">{formatPrice(a.amount)}</div>
            <div className="text-[10px] text-muted-foreground">{dateStr}</div>
          </div>
        </div>

        {/* Timeline pour commandes boutique/restaurant */}
        {(a.type === 'order' || a.type === 'restaurant') && !['annulee', 'annule'].includes(a.status) && (
          <OrderTimeline status={a.status} />
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.statusColor}`}>
              {a.statusLabel}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${meta.color}15`, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {alreadyReviewed && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Noté
              </div>
            )}
            {canReview && (
              <button
                onClick={() => onReview(a)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted/60 transition-colors group"
              >
                <Star
                  className="w-3.5 h-3.5 text-amber-400 group-hover:fill-amber-400 transition-all"
                  strokeWidth={2}
                />
                Laisser un avis
              </button>
            )}
            {onReorder && (a.type === 'order' || a.type === 'restaurant') && REORDERABLE_STATUSES.has(a.status) && (
              <button
                onClick={() => onReorder(a.id)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted/60 transition-colors text-primary"
              >
                <RotateCcw className="w-3 h-3" />
                Commander à nouveau
              </button>
            )}
            {a.canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(a.id, a.type)}
                disabled={cancelling === a.id}
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {cancelling === a.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <X className="w-3 h-3" />}
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',      label: 'Tout' },
  { key: 'order',    label: 'Commandes' },
  { key: 'hotel',    label: 'Hôtel' },
  { key: 'sport',    label: 'Sport' },
  { key: 'wellness', label: 'Bien-être' },
  { key: 'leisure',  label: 'Loisirs' },
] as const;
type TabKey = typeof TABS[number]['key'];

function matchesTab(a: Activity, tab: TabKey): boolean {
  if (tab === 'all') return true;
  if (tab === 'order') return ['order', 'restaurant'].includes(a.type);
  if (tab === 'hotel') return a.type === 'hotel';
  if (tab === 'sport') return ['gym', 'gym_coach', 'pool', 'pool_course', 'field'].includes(a.type);
  if (tab === 'wellness') return a.type === 'salon';
  if (tab === 'leisure') return ['event', 'show', 'cybercafe'].includes(a.type);
  return false;
}

const ClientOrders = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');
  const [reviewModal, setReviewModal] = useState<Activity | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      ordersApi.getMyOrders(),
      hotelApi.getMyBookings(),
      gymApi.getMySubs(),
      gymApi.getMyCoachBookings(),
      salonApi.getMyBookings(),
      fieldApi.getMyBookings(),
      poolApi.getMyPasses(),
      poolApi.getMyCourses(),
      eventApi.getMyBookings(),
      showApi.getMyTickets(),
      cybercafeApi.getMySessions(),
    ]);

    const all: Activity[] = [];
    const [orders, hotels, gymSubs, gymCoach, salon, field, pools, courses, events, shows, cyber] = results;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (orders.status === 'fulfilled') (orders.value as any[]).forEach(o => all.push(normalizeOrder(o)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (hotels.status === 'fulfilled') (hotels.value as any[]).forEach(b => all.push(normalizeHotel(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (gymSubs.status === 'fulfilled') (gymSubs.value as any[]).forEach(b => all.push(normalizeGym(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (gymCoach.status === 'fulfilled') (gymCoach.value as any[]).forEach(b => all.push(normalizeGymCoach(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (salon.status === 'fulfilled') (salon.value as any[]).forEach(b => all.push(normalizeSalon(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (field.status === 'fulfilled') (field.value as any[]).forEach(b => all.push(normalizeField(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (pools.status === 'fulfilled') (pools.value as any[]).forEach(b => all.push(normalizePool(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (courses.status === 'fulfilled') (courses.value as any[]).forEach(b => all.push(normalizePoolCourse(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (events.status === 'fulfilled') (events.value as any[]).forEach(b => all.push(normalizeEvent(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (shows.status === 'fulfilled') (shows.value as any[]).forEach(b => all.push(normalizeShow(b)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (cyber.status === 'fulfilled') (cyber.value as any[]).forEach(b => all.push(normalizeCyber(b)));

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivities(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string, type: ActivityType) => {
    setCancelling(id);
    try {
      if (type === 'order' || type === 'restaurant') await ordersApi.cancel(id);
      else if (type === 'hotel') await hotelApi.cancel(id);
      else if (type === 'salon') await salonApi.cancel(id);
      else if (type === 'field') await fieldApi.cancel(id);
      else if (type === 'show') await showApi.cancel(id);
      else {
        toast.error('Annulation non disponible pour ce service');
        return;
      }
      toast.success('Annulé avec succès');
      setActivities(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'annule', statusLabel: 'Annulé', statusColor: 'bg-red-500/15 text-red-700', canCancel: false } : a
      ));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible d'annuler");
    } finally {
      setCancelling(null);
    }
  };

  const handleReviewDone = (id: string) => {
    setReviewed(prev => new Set([...prev, id]));
    toast.success('Avis publié — merci !');
  };

  const handleReorder = async (orderId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order: any = await ordersApi.getOrder(orderId);
      if (!order?.items?.length) { toast.error('Impossible de récupérer les articles'); return; }
      let added = 0;
      for (const item of order.items) {
        if (item.product_id) {
          try { await cartApi.addItem(item.product_id, item.quantity); added++; }
          catch { /* article peut être épuisé */ }
        }
      }
      if (added > 0) toast.success(`${added} article${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au panier !`);
      else toast.error('Articles non disponibles à la commande');
    } catch {
      toast.error('Erreur lors de la récupération de la commande');
    }
  };

  const filtered = activities.filter(a => matchesTab(a, tab));
  const count = (t: TabKey) => activities.filter(a => matchesTab(a, t)).length;
  const reviewableCount = activities.filter(a => REVIEWABLE_STATUSES.has(a.status) && !reviewed.has(a.id)).length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-4xl">Mes activités</h1>
          <p className="text-muted-foreground mt-1">Toutes vos commandes et réservations ARENAH</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link to="/mes-paiements"><CreditCard className="w-4 h-4" /> Paiements</Link>
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {!loading && activities.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 mt-4">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{activities.length}</div>
            <div className="text-xs text-muted-foreground">Total activités</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {activities.filter(a => ['confirme', 'active', 'livree', 'paid'].includes(a.status)).length}
            </div>
            <div className="text-xs text-muted-foreground">Confirmées</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {formatPrice(activities.reduce((s, a) => s + a.amount, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Total dépensé</div>
          </div>
        </div>
      )}

      {/* Bandeau avis en attente */}
      {!loading && reviewableCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 px-4 py-3 mb-6">
          <div className="flex shrink-0">
            {[1,2,3,4,5].map(n => (
              <Star key={n} style={{ width: 14, height: 14 }} fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5} />
            ))}
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-400 flex-1">
            <span className="font-semibold">{reviewableCount} service{reviewableCount > 1 ? 's' : ''}</span>{' '}
            en attente de votre avis
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Chargement de vos activités…</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-lg mb-1">Aucune activité</p>
          <p className="text-muted-foreground text-sm mb-4">Commandez ou réservez un service ARENAH pour commencer.</p>
          <Button asChild><Link to="/">Explorer les services</Link></Button>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                <Filter className="w-3 h-3 mr-1 opacity-50" />
                {t.label}
                <span className="ml-1.5 text-[10px] opacity-60">({count(t.key)})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(t => (
            <TabsContent key={t.key} value={t.key} className="space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Aucune activité dans cette catégorie</p>
              ) : (
                filtered.map(a => (
                  <ActivityCard
                    key={`${a.type}-${a.id}`}
                    a={a}
                    onCancel={handleCancel}
                    cancelling={cancelling}
                    onReview={setReviewModal}
                    reviewed={reviewed}
                    onReorder={handleReorder}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Modal avis */}
      {reviewModal && (
        <ReviewModal
          activity={reviewModal}
          onClose={() => setReviewModal(null)}
          onDone={handleReviewDone}
        />
      )}
    </div>
  );
};

export default ClientOrders;
