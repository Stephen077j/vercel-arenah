import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check, Clock } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

interface Booking { id: string; customer_name: string; time_from: string; time_to: string; status: string; }

const PRICE_PER_HOUR = 10000;

function timeToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

export default function FieldTimeBooking() {
  const { user } = useClientAuth();
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom]         = useState('09:00');
  const [to, setTo]             = useState('10:00');
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [custPhone, setCustPhone] = useState(user?.phone ?? '');
  const [planning, setPlanning] = useState<Booking[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [booking, setBooking]   = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [price, setPrice]       = useState(0);
  const [done, setDone]         = useState(false);

  const token = localStorage.getItem('arenah_token');

  const fetchPlanning = async () => {
    setLoadingPlan(true);
    try {
      const r = await fetch(`/api/bookings/field/planning?date=${date}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) setPlanning(await r.json());
    } finally { setLoadingPlan(false); }
  };

  useEffect(() => { fetchPlanning(); }, [date]);

  const durationMin = Math.max(0, timeToMin(to) - timeToMin(from));
  const calcPrice   = Math.round((durationMin / 60) * PRICE_PER_HOUR);

  const handleBook = async () => {
    if (!user || !custName) { toast.error('Connectez-vous et remplissez votre nom'); return; }
    if (durationMin <= 0) { toast.error('Heure de fin doit être après heure de début'); return; }
    setBooking(true);
    try {
      const res = await fetch('/api/bookings/field/by-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, time_from: from, time_to: to, customer_name: custName, customer_phone: custPhone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id);
      setPrice(data.price || calcPrice);
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  // Timeline visuelle (06h–22h)
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
  const isOccupied = (hour: number) => planning.some(b => {
    const bFrom = timeToMin(b.time_from ?? '00:00');
    const bTo   = timeToMin(b.time_to ?? '00:00');
    return bFrom <= hour * 60 && bTo > hour * 60;
  });

  if (done) return (
    <div className="max-w-sm mx-auto text-center py-16 space-y-3">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-emerald-600"/>
      </div>
      <h3 className="font-bold text-lg">Terrain réservé ! ⚽</h3>
      <p className="text-sm text-muted-foreground">{date} · {from} → {to}</p>
      <Button variant="outline" onClick={() => { setDone(false); setBookingId(null); fetchPlanning(); }}>
        Nouvelle réservation
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Calendrier visuel du jour */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs whitespace-nowrap">Date du match</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="h-9 w-40"/>
          <Button size="sm" variant="outline" onClick={fetchPlanning} disabled={loadingPlan}>
            {loadingPlan ? <Loader2 className="w-3 h-3 animate-spin"/> : '↻'} Actualiser
          </Button>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Planning du {date}</p>
          <div className="flex gap-px">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center">
                <div className="h-6 rounded-sm" style={{ background: isOccupied(h) ? '#ef444466' : '#22c55e22', border: '1px solid transparent' }}/>
                <div className="text-[8px] text-muted-foreground mt-0.5">{h}h</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-1 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500/30 inline-block"/>Libre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400/40 inline-block"/>Occupé</span>
          </div>
        </div>
      </div>

      {/* Formulaire réservation */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs"><Clock className="w-3 h-3 inline mr-1"/>Heure d'arrivée</Label>
            <Input type="time" value={from} onChange={e => setFrom(e.target.value)} min="06:00" max="22:00" className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs"><Clock className="w-3 h-3 inline mr-1"/>Heure de fin</Label>
            <Input type="time" value={to} onChange={e => setTo(e.target.value)} min="07:00" max="23:00" className="h-9"/>
          </div>
        </div>

        {durationMin > 0 && (
          <div className="rounded-lg px-3 py-2 text-xs space-y-0.5 bg-muted">
            <div className="flex justify-between">
              <span>Durée</span>
              <span className="font-medium">{Math.floor(durationMin / 60)}h{durationMin % 60 > 0 ? String(durationMin % 60).padStart(2, '0') : ''}</span>
            </div>
            <div className="flex justify-between">
              <span>Tarif</span><span>{PRICE_PER_HOUR.toLocaleString()} Ar/h</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t pt-1 mt-1">
              <span>Total</span>
              <span style={{ color: '#d4a843' }}>{calcPrice.toLocaleString()} Ar</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom équipe / responsable</Label>
            <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Téléphone</Label>
            <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+261…" className="h-9"/>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={handleBook} disabled={booking || !custName || durationMin <= 0}>
          {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : '⚽'} Réserver {from}–{to}
        </Button>
      </div>

      {bookingId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); toast.success('Terrain réservé ! ⚽'); }}
          amount={price || calcPrice}
          bookingType="field"
          bookingId={bookingId}
          label={`Terrain · ${date} ${from}–${to}`}
        />
      )}
    </div>
  );
}
