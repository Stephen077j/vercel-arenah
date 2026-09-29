import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Users, Clock, Check } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

interface Table {
  id: string; name: string; capacity: number; zone: string; pos_x: number; pos_y: number;
  bookings: { time_from: string; time_to: string }[];
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function isTableFree(table: Table, from: string, to: string) {
  if (!from || !to) return true;
  const f = timeToMin(from), t = timeToMin(to);
  return !table.bookings.some(b => timeToMin(b.time_from) < t && timeToMin(b.time_to) > f);
}

const ZONE_COLORS = { 'intérieur': '#1a1a2e', 'terrasse': '#0f3460' };
const CAP_COLOR  = (cap: number) => cap <= 2 ? '#7c3aed' : '#d4a843';

export default function RestaurantFloorPlan() {
  const { user } = useClientAuth();
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom]         = useState('12:00');
  const [to, setTo]             = useState('13:30');
  const [zone, setZone]         = useState<'intérieur' | 'terrasse'>('intérieur');
  const [tables, setTables]     = useState<Table[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<Table | null>(null);
  const [guests, setGuests]     = useState(2);
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [custPhone, setCustPhone] = useState(user?.phone ?? '');
  const [booking, setBooking]   = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const fetchLayout = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/bookings/tables/layout?date=${date}`);
      setTables(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLayout(); }, [date]);

  const COVER_CHARGE = 5000; // Ar par personne (arrhes)

  const handleBook = async () => {
    if (!selected || !user) return;
    setBooking(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const res = await fetch('/api/bookings/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: selected.id, date, time_from: from, time_to: to, guests, customer_name: custName, customer_phone: custPhone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id);
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  const zoned = tables.filter(t => t.zone === zone);

  if (done) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold">Réservation confirmée !</h3>
      <p className="text-muted-foreground text-center text-sm">Table {selected?.name} le {date} de {from} à {to}.<br/>Présentez-vous directement au restaurant.</p>
      <Button variant="outline" onClick={() => { setDone(false); setSelected(null); setBookingId(null); fetchLayout(); }}>
        Nouvelle réservation
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filtres date/heure */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="h-9 w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Arrivée</Label>
          <Input type="time" value={from} onChange={e => setFrom(e.target.value)} min="07:00" max="22:00" className="h-9 w-28" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Départ</Label>
          <Input type="time" value={to} onChange={e => setTo(e.target.value)} min="07:00" max="23:00" className="h-9 w-28" />
        </div>
        <Button size="sm" onClick={fetchLayout} variant="outline">Actualiser</Button>
        {/* Zone toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border ml-auto">
          {(['intérieur', 'terrasse'] as const).map(z => (
            <button key={z} onClick={() => setZone(z)}
              className="px-4 py-1.5 text-xs font-medium transition-colors capitalize"
              style={{ background: zone === z ? '#d4a843' : 'transparent', color: zone === z ? '#111' : 'inherit' }}>
              {z === 'intérieur' ? '🏠 Intérieur' : '☀️ Terrasse'}
            </button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>Occupée</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block"/>Sélectionnée</span>
        <span className="flex items-center gap-1.5"><Users className="w-3 h-3"/>2 = 2 places · 4 = 4 places</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Plan visuel */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground"/></div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden"
              style={{ background: zone === 'intérieur' ? '#0f0f1a' : '#0a1628' }}>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#d4a843', opacity: 0.7 }}>
                {zone === 'intérieur' ? '🏠 Salle intérieure' : '☀️ Terrasse'}
              </div>
              {/* Zone scène/entrée */}
              {zone === 'intérieur' && (
                <div className="mx-4 mb-3 rounded-lg py-2 text-center text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ background: '#d4a84320', color: '#d4a843', border: '1px dashed #d4a84340' }}>
                  🎤 Scène
                </div>
              )}
              {/* Grille tables */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {zoned.map(table => {
                  const free = isTableFree(table, from, to);
                  const isSel = selected?.id === table.id;
                  return (
                    <button
                      key={table.id}
                      disabled={!free}
                      onClick={() => setSelected(isSel ? null : table)}
                      className="rounded-xl p-3 text-center transition-all duration-200 relative"
                      style={{
                        background: isSel ? '#d4a84330' : free ? '#1a2a1a' : '#2a1a1a',
                        border: `2px solid ${isSel ? '#d4a843' : free ? '#22c55e' : '#ef4444'}`,
                        opacity: !free ? 0.7 : 1,
                        cursor: free ? 'pointer' : 'not-allowed',
                        transform: isSel ? 'scale(1.04)' : 'scale(1)',
                      }}
                    >
                      <div className="text-lg font-bold text-white mb-0.5">{table.name}</div>
                      <div className="flex items-center justify-center gap-1 text-xs"
                        style={{ color: CAP_COLOR(table.capacity) }}>
                        <Users className="w-3 h-3"/>{table.capacity}
                      </div>
                      <div className="mt-1 text-[10px]" style={{ color: free ? '#22c55e' : '#ef4444' }}>
                        {free ? 'Libre' : 'Occupée'}
                      </div>
                      {isSel && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                          <Check className="w-3 h-3 text-black"/>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {zone === 'intérieur' && (
                <div className="mx-4 mb-3 mt-1 rounded-lg py-1.5 text-center text-xs"
                  style={{ color: '#d4a84380', border: '1px dashed #d4a84420' }}>
                  Entrée principale
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panneau réservation */}
        <div className="space-y-4">
          {selected ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-base">Table {selected.name}</h3>
                <p className="text-xs text-muted-foreground">{selected.capacity} places · {selected.zone}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-0.5">
                <div className="flex justify-between"><span>Date</span><span className="font-medium">{date}</span></div>
                <div className="flex justify-between"><span>Créneau</span><span className="font-medium">{from} → {to}</span></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre de convives</Label>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setGuests(g => Math.max(1, g-1))}>-</Button>
                  <span className="w-8 text-center font-bold">{guests}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setGuests(g => Math.min(selected.capacity, g+1))}>+</Button>
                  <span className="text-xs text-muted-foreground">/ {selected.capacity} max</span>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Votre nom</Label>
                <Input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Nom complet" className="h-9"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Téléphone</Label>
                <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+261…" className="h-9"/>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Arrhes ({guests} × 5 000 Ar)</span>
                  <span style={{ color: '#d4a843' }}>{(guests * COVER_CHARGE).toLocaleString()} Ar</span>
                </div>
                <p className="text-muted-foreground mt-0.5">Déduites sur l'addition</p>
              </div>
              <Button className="w-full gap-2" onClick={handleBook} disabled={booking || !custName}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : <Clock className="w-4 h-4"/>}
                Réserver & payer
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              <div className="text-3xl mb-3">🍽️</div>
              <p className="text-sm">Sélectionnez une table sur le plan</p>
              <p className="text-xs mt-1">Les tables vertes sont disponibles</p>
            </div>
          )}

          {/* Info tables libres */}
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2">Disponibilité {from}–{to}</p>
            <div className="flex gap-3 text-sm font-semibold">
              <span className="text-emerald-500">{zoned.filter(t => isTableFree(t, from, to)).length} libres</span>
              <span className="text-red-500">{zoned.filter(t => !isTableFree(t, from, to)).length} occupées</span>
            </div>
          </div>
        </div>
      </div>

      {bookingId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => {
            setPayOpen(false);
            setDone(true);
            toast.success('Réservation confirmée ! 🎉');
          }}
          amount={guests * COVER_CHARGE}
          bookingType="restaurant"
          bookingId={bookingId}
          label={`Table ${selected?.name} · ${date} ${from}–${to}`}
        />
      )}
    </div>
  );
}
