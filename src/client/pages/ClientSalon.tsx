import { useEffect, useState, lazy, Suspense } from 'react';
const SalonCombos = lazy(() => import('../components/SalonCombos'));
import { motion } from 'framer-motion';
import { Scissors, Star, X, Bell, Check, Loader2, CalendarRange, ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { salonApi } from '@/api/bookings';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { SALON_SLIDES } from '../lib/bannerSlides';

const STYLIST_COLORS = [
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-600',
  'from-teal-400 to-emerald-600',
];

const TENDANCES = [
  { src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80', style: 'Balayage',      service: 'Colorisation', cat: 'coiffure' },
  { src: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=300&q=80', style: 'Cut moderne',   service: 'Coupe femme',  cat: 'coiffure' },
  { src: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=300&q=80', style: 'Lissage',       service: 'Traitement',   cat: 'coiffure' },
  { src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=80', style: 'Boucles',          service: 'Coiffage',     cat: 'coiffure' },
  { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=80', style: 'Barber Style',  service: 'Taille barbe', cat: 'barbier'  },
  { src: 'https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=300&q=80', style: 'Rasage pro',    service: 'Rasage',       cat: 'barbier'  },
  { src: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&q=80', style: 'Nail Art',      service: 'Nail art',     cat: 'ongles'   },
  { src: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&q=80', style: 'Gel pose',      service: 'Pose gel',     cat: 'ongles'   },
];

// Libellés des catégories connues ; une catégorie ajoutée par l'admin et
// absente d'ici s'affiche avec son nom brut.
const CAT_LABELS: Record<string, string> = {
  coiffure:   '✂️ Coiffure',
  barbier:    '🪒 Barbier',
  ongles:     '💅 Ongles & Beauté',
  soins:      '🧖 Soins du visage',
  massage:    '💆 Massage & spa',
  maquillage: '💄 Maquillage',
  epilation:  '🌸 Épilation',
};

interface SalonService  { id: string; label: string; price: number; duration: number; category?: string; }
interface Hairdresser   { id: string; name: string; specialty: string; }
interface SlotAvail     { slot: string; available: boolean; }
interface WeekDay       { date: string; slots: SlotAvail[]; }
interface SalonBooking  {
  id: string; service_label: string; hairdresser_name: string | null;
  date: string; slot: string; price: number; status: string;
  rating: number | null; comment: string | null; customer_name: string | null;
}

const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function weekStart(offset = 0): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + offset * 7);
  return d.toISOString().slice(0, 10);
}

const ClientSalon = () => {
  const { user } = useClientAuth();

  const [services, setServices] = useState<SalonService[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [slots, setSlots] = useState<SlotAvail[]>([]);
  const [weekSlots, setWeekSlots] = useState<WeekDay[]>([]);
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const [catFilter, setCatFilter] = useState<string>('tout');
  const [serviceId, setServiceId] = useState('');
  const [hId, setHId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('');
  const [name, setName] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [placing, setPlacing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payData, setPayData] = useState<{ id: string; amount: number; label: string } | null>(null);

  const [rateOpen, setRateOpen] = useState(false);
  const [rateId, setRateId] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  // Reporter RDV
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedId, setReschedId] = useState('');
  const [reschedDate, setReschedDate] = useState('');
  const [reschedSlots, setReschedSlots] = useState<SlotAvail[]>([]);
  const [reschedSlot, setReschedSlot] = useState('');
  const [reschedSaving, setReschedSaving] = useState(false);

  const loadBookings = () => salonApi.getMyBookings().then(setBookings).catch(() => {});

  useEffect(() => {
    Promise.all([salonApi.getServices(), salonApi.getHairdressers()])
      .then(([svcs, hds]: [SalonService[], Hairdresser[]]) => {
        setServices(svcs); setHairdressers(hds);
        if (svcs.length) setServiceId(svcs[0].id);
        if (hds.length) setHId(hds[0].id);
      }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
    if (user) loadBookings();
  }, [user]);

  // Créneaux journaliers
  useEffect(() => {
    if (!date) return;
    salonApi.getAvailability(date, hId || undefined)
      .then((s: SlotAvail[]) => { setSlots(s); setSlot(''); })
      .catch(() => {});
  }, [date, hId]);

  // Vue semaine
  useEffect(() => {
    salonApi.getWeekSlots(weekStart(weekOffset), hId || undefined)
      .then((w: WeekDay[]) => setWeekSlots(w))
      .catch(() => {});
  }, [weekOffset, hId]);

  // Créneaux pour reporter
  useEffect(() => {
    if (!reschedDate) return;
    salonApi.getAvailability(reschedDate, hId || undefined)
      .then((s: SlotAvail[]) => { setReschedSlots(s); setReschedSlot(''); })
      .catch(() => {});
  }, [reschedDate, hId]);

  const book = async () => {
    if (!name || !phone || !slot) return toast.error('Tous les champs requis');
    setPlacing(true);
    try {
      const res = await salonApi.book({ service_id: serviceId, hairdresser_id: hId || undefined, date, slot, customer_name: name, customer_phone: phone });
      const svc = services.find(s => s.id === serviceId);
      setPayData({ id: (res as { id: string }).id, amount: svc?.price ?? 0, label: svc?.label ?? 'RDV Salon' });
      setPayOpen(true); setSlot('');
      loadBookings();
      salonApi.getAvailability(date, hId || undefined).then(s => setSlots(s as SlotAvail[])).catch(() => {});
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const cancelBooking = async (id: string) => {
    try {
      await salonApi.cancel(id);
      loadBookings(); toast.success('RDV annulé');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Impossible d\'annuler'); }
  };

  const doReschedule = async () => {
    if (!reschedSlot) return toast.error('Choisissez un créneau');
    setReschedSaving(true);
    try {
      await salonApi.reschedule(reschedId, reschedDate, reschedSlot);
      toast.success('RDV reporté');
      setReschedOpen(false); loadBookings();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setReschedSaving(false); }
  };

  const submitRate = async () => {
    try {
      await salonApi.rate(rateId, stars, comment);
      setRateOpen(false); setComment(''); setStars(5);
      toast.success('Merci pour votre avis !'); loadBookings();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  return (
    <div>
      <ModuleBanner slides={SALON_SLIDES} badge="Salon de coiffure" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium mb-3">
            <Scissors className="w-3.5 h-3.5" /> Salon de coiffure
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-3">Votre nouveau style, en un clic.</h1>
          <p className="text-muted-foreground max-w-2xl">Choisissez votre service, votre coiffeur, votre créneau. Rappel automatique avant votre RDV.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="reserver">
            <TabsList>
              <TabsTrigger value="combos">✨ Forfaits composés</TabsTrigger>
              <TabsTrigger value="reserver">Réserver</TabsTrigger>
              <TabsTrigger value="semaine"><CalendarRange className="w-3.5 h-3.5 mr-1" />Vue semaine</TabsTrigger>
              {user && <TabsTrigger value="mes">Mes RDV ({bookings.length})</TabsTrigger>}
            </TabsList>

            {/* FORFAITS COMPOSÉS */}
            <TabsContent value="combos" className="mt-6">
              <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>}>
                <SalonCombos />
              </Suspense>
            </TabsContent>

            {/* RÉSERVER */}
            <TabsContent value="reserver" className="mt-6 space-y-6">
              {/* Tendances du moment */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold text-sm">Tendances du moment</span>
                  <span className="text-xs text-muted-foreground ml-auto">Cliquez pour présélectionner</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {TENDANCES.filter(t => catFilter === 'tout' || t.cat === catFilter).map(t => (
                    <button key={t.style}
                      onClick={() => {
                        const match = services.find(s => s.label.toLowerCase().includes(t.service.toLowerCase().split(' ')[0].toLowerCase()));
                        if (match) { setServiceId(match.id); setCatFilter(t.cat); }
                      }}
                      className="flex-shrink-0 w-32 group relative rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary">
                      <img src={t.src} alt={t.style} className="w-32 h-40 object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-2.5">
                        <div className="text-white text-xs font-bold">{t.style}</div>
                        <div className="text-white/70 text-[10px]">{t.service}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Créneaux disponibles aujourd'hui */}
              {slots.filter(s => s.available).length > 0 && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Dispo {date === new Date().toISOString().split('T')[0] ? "aujourd'hui" : 'ce jour'}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {slots.filter(s => s.available).slice(0, 6).map(s => (
                      <button key={s.slot} onClick={() => setSlot(s.slot)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${slot === s.slot ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-500/30 bg-background text-emerald-700 hover:bg-emerald-500/10'}`}>
                        {s.slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Label>Service</Label>
                  <div className="flex gap-1.5 ml-auto flex-wrap">
                    {['tout', ...new Set(services.map(s => s.category ?? 'coiffure'))].map(c => (
                      <button key={c} onClick={() => setCatFilter(c)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${catFilter === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'}`}>
                        {c === 'tout' ? '🪞 Tout' : CAT_LABELS[c] ?? c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {services
                    .filter(s => catFilter === 'tout' || (s.category ?? 'coiffure') === catFilter)
                    .map(s => (
                    <button key={s.id} onClick={() => setServiceId(s.id)}
                      className={`text-left rounded-xl border-2 p-4 transition ${serviceId === s.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {s.category && s.category !== 'coiffure' && (
                            <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 text-muted-foreground">{CAT_LABELS[s.category] ?? s.category}</div>
                          )}
                          <div className="font-medium text-sm">{s.label}</div>
                        </div>
                        {serviceId === s.id && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50 inline-block" />
                        {s.duration} min
                      </div>
                      <div className="text-sm font-bold text-primary mt-2">{formatPrice(s.price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Coiffeur</Label>
                <div className="grid md:grid-cols-3 gap-3">
                  {hairdressers.map((h, idx) => (
                    <button key={h.id} onClick={() => setHId(h.id)}
                      className={`flex items-center gap-3 text-left rounded-xl border-2 p-4 transition ${hId === h.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                      <div className={`w-12 h-12 rounded-xl text-white font-bold flex items-center justify-center text-lg bg-gradient-to-br flex-shrink-0 ${STYLIST_COLORS[idx % STYLIST_COLORS.length]}`}>
                        {h.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{h.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{h.specialty}</div>
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Disponible
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label className="mb-2 block">Créneau</Label>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(s => (
                      <button key={s.slot} disabled={!s.available} onClick={() => setSlot(s.slot)}
                        className={`px-3 py-2 rounded-lg text-sm border transition ${!s.available ? 'opacity-30 cursor-not-allowed line-through' : slot === s.slot ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}>
                        {s.slot}
                      </button>
                    ))}
                    {slots.length === 0 && <p className="text-sm text-muted-foreground">Aucun créneau</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 max-w-xl">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted rounded-lg px-3 py-2">
                  <Bell className="w-3.5 h-3.5 text-primary" /> Rappel automatique J-1 envoyé par SMS et email
                </div>
                {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Connectez-vous pour réserver.</p>}
                <Button onClick={book} disabled={placing || !user} className="w-full h-12" size="lg">
                  {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirmer le RDV — paiement sur place
                </Button>
              </div>
            </TabsContent>

            {/* VUE SEMAINE */}
            <TabsContent value="semaine" className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setWeekOffset(p => p - 1)} className="p-2 border rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-medium">Semaine du {weekStart(weekOffset)}</span>
                <button onClick={() => setWeekOffset(p => p + 1)} className="p-2 border rounded-lg hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-muted-foreground w-16">Heure</th>
                      {weekSlots.map((d, i) => (
                        <th key={d.date} className="p-2 text-center font-medium">
                          <div>{DAY_NAMES[i]}</div>
                          <div className="text-muted-foreground font-normal">{d.date.slice(8)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['09:00','10:00','11:00','14:00','15:00','16:00','17:00'].map(s => (
                      <tr key={s} className="border-t border-border">
                        <td className="p-2 text-muted-foreground font-medium">{s}</td>
                        {weekSlots.map(d => {
                          const cell = d.slots.find(sl => sl.slot === s);
                          return (
                            <td key={d.date} className="p-1 text-center">
                              <button
                                disabled={!cell?.available}
                                onClick={() => { setDate(d.date); setSlot(s); }}
                                className={`w-full rounded-md py-1.5 text-xs transition ${
                                  !cell?.available
                                    ? 'bg-red-500/10 text-red-400 cursor-not-allowed'
                                    : slot === s && date === d.date
                                      ? 'bg-primary text-primary-foreground font-semibold'
                                      : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                                }`}>
                                {cell?.available ? 'Libre' : 'Pris'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {slot && date && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                  Créneau sélectionné : <strong>{date} à {slot}</strong>
                  <Button size="sm" className="ml-4" onClick={() => document.querySelector<HTMLElement>('[data-value="reserver"]')?.click()}>
                    Réserver ce créneau
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* MES RDV */}
            {user && (
              <TabsContent value="mes" className="mt-6">
                {bookings.length === 0 ? <p className="text-muted-foreground">Aucun RDV.</p> : (
                  <div className="space-y-3">
                    {bookings.map(b => (
                      <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="font-semibold">{b.service_label}</div>
                            <div className="text-sm text-muted-foreground">
                              {b.hairdresser_name ? `Avec ${b.hairdresser_name} · ` : ''}{b.date} à {b.slot}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatPrice(b.price)}</div>
                            <div className={`text-xs ${b.status === 'confirme' ? 'text-emerald-600' : b.status === 'annule' ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {b.status === 'confirme' ? 'Confirmé' : b.status === 'annule' ? 'Annulé' : b.status === 'no_show' ? 'Absent' : 'Terminé'}
                            </div>
                          </div>
                        </div>
                        {b.rating != null && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                            {Array.from({ length: b.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                            {b.comment && <span className="text-muted-foreground ml-1">"{b.comment}"</span>}
                          </div>
                        )}
                        {b.status === 'confirme' && (
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="ghost" onClick={() => cancelBooking(b.id)}><X className="w-3.5 h-3.5 mr-1" /> Annuler</Button>
                            <Button size="sm" variant="outline" onClick={() => { setReschedId(b.id); setReschedDate(b.date); setReschedOpen(true); }}>
                              <CalendarRange className="w-3.5 h-3.5 mr-1" /> Reporter
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRateId(b.id); setRateOpen(true); }}>
                              <Check className="w-3.5 h-3.5 mr-1" /> Évaluer
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Dialog noter */}
        <Dialog open={rateOpen} onOpenChange={setRateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Noter votre expérience</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setStars(n)}>
                    <Star className={`w-8 h-8 ${n <= stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Votre commentaire (optionnel)" />
            </div>
            <DialogFooter><Button onClick={submitRate}>Envoyer</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog reporter */}
        <Dialog open={reschedOpen} onOpenChange={o => !o && setReschedOpen(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle><CalendarRange className="w-4 h-4 inline mr-2" />Reporter mon RDV</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nouvelle date</Label>
                <Input type="date" value={reschedDate} min={new Date().toISOString().split('T')[0]} onChange={e => setReschedDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block">Nouveau créneau</Label>
                <div className="flex flex-wrap gap-2">
                  {reschedSlots.map(s => (
                    <button key={s.slot} disabled={!s.available} onClick={() => setReschedSlot(s.slot)}
                      className={`px-3 py-2 rounded-lg text-sm border transition ${!s.available ? 'opacity-30 cursor-not-allowed' : reschedSlot === s.slot ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}>
                      {s.slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReschedOpen(false)}>Annuler</Button>
              <Button onClick={doReschedule} disabled={reschedSaving || !reschedSlot}>
                {reschedSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('RDV et paiement confirmés !'); }}
          amount={payData.amount}
          bookingType="salon"
          bookingId={payData.id}
          label={payData.label}
        />
      )}
    </div>
  );
};

export default ClientSalon;
