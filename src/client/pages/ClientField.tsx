import { useEffect, useState, lazy, Suspense } from 'react';
const FieldTimeBooking = lazy(() => import('../components/FieldTimeBooking'));
import { motion } from 'framer-motion';
import { Trophy, X, AlertCircle, Loader2, Check, RefreshCw, Info, Share2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fieldApi } from '@/api/bookings';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { FIELD_SLIDES } from '../lib/bannerSlides';

interface FieldSlot {
  id: string; label: string; price: number;
  sport_type?: string; equipment?: string | null; available?: boolean;
}
interface FieldBooking {
  id: string; date: string; slot: string; slot_label: string | null;
  price: number; status: string; customer_name: string | null; recurrence?: string | null;
}

const SPORT_LABELS: Record<string, string> = {
  foot: '⚽ Football', basket: '🏀 Basket', tennis: '🎾 Tennis', multisport: '🏆 Multisport', volley: '🏐 Volley',
};
const SPORT_COLORS: Record<string, string> = {
  foot: 'border-green-500/40 bg-green-500/5 hover:border-green-600/50 text-green-800 dark:text-green-400',
  basket: 'border-orange-500/40 bg-orange-500/5 hover:border-orange-600/50 text-orange-800 dark:text-orange-400',
  tennis: 'border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-600/50 text-yellow-800 dark:text-yellow-400',
  multisport: 'border-blue-500/40 bg-blue-500/5 hover:border-blue-600/50 text-blue-800 dark:text-blue-400',
  volley: 'border-purple-500/40 bg-purple-500/5 hover:border-purple-600/50 text-purple-800 dark:text-purple-400',
};
const ALL_SPORTS = 'Tous';

const ClientField = () => {
  const { user } = useClientAuth();

  const [availSlots, setAvailSlots] = useState<FieldSlot[]>([]);
  const [bookings, setBookings] = useState<FieldBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('');
  const [name, setName] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [placing, setPlacing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payData, setPayData] = useState<{ id: string; amount: number } | null>(null);

  // Filtre sport
  const [sportFilter, setSportFilter] = useState(ALL_SPORTS);

  // Récurrence
  const [recurrence, setRecurrence] = useState<string>('');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  // Info équipement
  const [equipInfo, setEquipInfo] = useState<FieldSlot | null>(null);

  const fetchAvail = async (d: string) => {
    try {
      const data: FieldSlot[] = await fieldApi.getAvailability(d);
      setAvailSlots(data); setSlot('');
    } catch { toast.error('Erreur de chargement des créneaux'); }
  };

  const loadBookings = () => fieldApi.getMyBookings().then(setBookings).catch(() => {});

  useEffect(() => {
    fetchAvail(date).finally(() => setLoading(false));
    if (user) loadBookings();
  }, []);

  useEffect(() => { fetchAvail(date); }, [date]);

  // Sports distincts dans les créneaux
  const sports = [ALL_SPORTS, ...Array.from(new Set(availSlots.map(s => s.sport_type ?? 'foot').filter(Boolean)))];
  const filtered = sportFilter === ALL_SPORTS ? availSlots : availSlots.filter(s => s.sport_type === sportFilter);

  const book = async () => {
    if (!name || !phone || !slot) return toast.error('Tous les champs requis');
    setPlacing(true);
    try {
      const res = await fieldApi.book({
        date, slot, customer_name: name, customer_phone: phone,
        recurrence: recurrence || undefined,
        recurrence_weeks: recurrence ? recurrenceWeeks : undefined,
      });
      const slotData = availSlots.find(s => s.id === slot);
      const r = res as { id?: string; booked?: number; first_date?: string };
      if (recurrence && r.booked && r.booked > 1) {
        toast.success(`${r.booked} créneaux réservés !`);
        setPayOpen(false); setSlot('');
        loadBookings(); fetchAvail(date);
      } else if (r.id) {
        setPayData({ id: r.id, amount: slotData?.price ?? 0 });
        setPayOpen(true); setSlot('');
        loadBookings(); fetchAvail(date);
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Créneau déjà pris'); }
    finally { setPlacing(false); }
  };

  const cancelBooking = async (id: string) => {
    setCancelling(id);
    try {
      await fieldApi.cancel(id);
      toast.success('Réservation annulée'); loadBookings();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Impossible d\'annuler'); }
    finally { setCancelling(null); }
  };

  const selectedSlot = availSlots.find(s => s.id === slot);

  return (
    <div>
      <ModuleBanner slides={FIELD_SLIDES} badge="Terrain de sport" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-600 text-xs font-medium mb-3">
            <Trophy className="w-3.5 h-3.5" /> Terrain de sport
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-3">Réservez votre créneau, jouez.</h1>
          <p className="text-muted-foreground max-w-2xl">Football, basket, tennis, multisport. Paiement sur place, annulation jusqu'à 24h avant.</p>
        </motion.div>

        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-lime-500/10 to-transparent border border-lime-500/20 p-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-lime-500/15 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-lime-700" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Pack récurrent — <span className="text-lime-700">économisez jusqu'à 15%</span></div>
            <div className="text-xs text-muted-foreground">Réservez chaque semaine sur 4 semaines ou plus et bénéficiez du tarif réduit</div>
          </div>
          <span className="text-xs font-bold text-lime-700 px-2.5 py-1 rounded-full bg-lime-500/15 border border-lime-500/20 flex-shrink-0">-15%</span>
        </div>

        <Tabs defaultValue="reserver">
          <TabsList>
            <TabsTrigger value="horaire">⏱️ Par horaire</TabsTrigger>
            <TabsTrigger value="reserver">Créneaux fixes</TabsTrigger>
            {user && <TabsTrigger value="mes">Mes réservations ({bookings.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="horaire" className="mt-6">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>}>
              <FieldTimeBooking />
            </Suspense>
          </TabsContent>

          <TabsContent value="reserver" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
              <div className="space-y-1.5 mb-4">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>

              {/* Filtre sport */}
              <div className="flex flex-wrap gap-2 mb-4">
                {sports.map(s => (
                  <button key={s} onClick={() => setSportFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${sportFilter === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}>
                    {SPORT_LABELS[s] ?? s}
                  </button>
                ))}
              </div>

              <Label className="mb-2 block">Créneaux disponibles</Label>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {filtered.map(s => (
                    <div key={s.id} className="relative">
                      <button
                        disabled={!s.available}
                        onClick={() => setSlot(s.id)}
                        className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium border transition ${
                          !s.available ? 'opacity-30 cursor-not-allowed line-through border-border bg-card'
                          : slot === s.id ? 'border-primary bg-primary text-primary-foreground'
                          : (SPORT_COLORS[s.sport_type ?? ''] ?? 'border-border bg-card hover:border-primary/40')}`}>
                        <div className="font-semibold">{s.label}</div>
                        <div className="text-xs mt-0.5 opacity-75">{formatPrice(s.price)}</div>
                        {s.sport_type && <div className="text-[10px] mt-1 opacity-60">{SPORT_LABELS[s.sport_type] ?? s.sport_type}</div>}
                      </button>
                      {s.equipment && (
                        <button onClick={() => setEquipInfo(s)} className="absolute top-2 right-2 text-muted-foreground hover:text-primary">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-3">Aucun créneau pour ce sport</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              </div>

              {/* Option récurrence */}
              <div className="rounded-xl bg-muted/50 border border-border p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium">Récurrence (optionnel)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ label: 'Une fois', val: '' }, { label: 'Chaque semaine', val: 'weekly' }, { label: 'Toutes les 2 sem.', val: 'biweekly' }].map(o => (
                    <button key={o.val} onClick={() => setRecurrence(o.val)}
                      className={`px-3 py-1 rounded-lg text-xs border transition ${recurrence === o.val ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                      {o.label}
                    </button>
                  ))}
                  {recurrence && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-muted-foreground">pendant</span>
                      <input type="number" min={2} max={12} value={recurrenceWeeks} onChange={e => setRecurrenceWeeks(+e.target.value)}
                        className="w-14 border border-border rounded-lg px-2 py-1 text-xs bg-background" />
                      <span className="text-xs text-muted-foreground">semaines</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5" /> Annulation possible jusqu'à 24h avant le créneau.
              </div>
              {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Connectez-vous pour réserver.</p>}
              <Button onClick={book} disabled={placing || !user || !slot} className="w-full h-12" size="lg">
                {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {recurrence
                  ? `Réserver ${recurrenceWeeks} créneaux — ${selectedSlot ? formatPrice(selectedSlot.price * recurrenceWeeks) : '…'}`
                  : `Confirmer${selectedSlot ? ` — ${formatPrice(selectedSlot.price)}` : ''}`}
              </Button>
              {slot && (
                <button
                  onClick={() => {
                    const sd = availSlots.find(s => s.id === slot);
                    const txt = `🏟️ Match ARENAH — ${date}${sd ? ` · ${sd.label}` : ''}.\nRejoins-moi ! Réserve sur arenah.mg`;
                    navigator.clipboard.writeText(txt)
                      .then(() => toast.success('Message copié — partagez avec vos coéquipiers !'))
                      .catch(() => {});
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-xl py-2.5 hover:border-primary/40 hover:text-primary transition">
                  <Share2 className="w-4 h-4" /> Inviter des coéquipiers
                </button>
              )}
            </div>
          </TabsContent>

          {user && (
            <TabsContent value="mes" className="mt-6">
              {bookings.length === 0 ? (
                <p className="text-muted-foreground">Aucune réservation.</p>
              ) : (
                <div className="space-y-3">
                  {bookings.map(b => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-semibold">{b.date} — {b.slot_label ?? b.slot}</div>
                          <div className="text-sm text-muted-foreground">{b.customer_name}</div>
                          {b.recurrence && <div className="text-xs text-primary mt-0.5"><RefreshCw className="w-3 h-3 inline mr-1" />Récurrent</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatPrice(b.price)}</div>
                          <div className={`text-xs ${b.status === 'annule' ? 'text-destructive' : 'text-emerald-600'}`}>
                            {b.status === 'annule' ? 'Annulé' : <span className="flex items-center gap-1 justify-end"><Check className="w-3 h-3" /> Confirmé</span>}
                          </div>
                        </div>
                      </div>
                      {b.status === 'confirme' && (
                        <Button size="sm" variant="ghost" onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id} className="gap-1">
                          {cancelling === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          Annuler
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialog info équipement */}
      <Dialog open={!!equipInfo} onOpenChange={o => !o && setEquipInfo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{equipInfo && (SPORT_LABELS[equipInfo.sport_type ?? ''] ?? equipInfo.sport_type)} — Équipements</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{equipInfo?.equipment ?? 'Aucune information'}</p>
          </div>
        </DialogContent>
      </Dialog>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Terrain réservé !'); }}
          amount={payData.amount}
          bookingType="field"
          bookingId={payData.id}
          label={`${SPORT_LABELS[selectedSlot?.sport_type ?? ''] ?? 'Terrain'} — ARENAH`}
        />
      )}
    </div>
  );
};

export default ClientField;
