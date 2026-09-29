import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check, Users } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

const SKILLS = [
  { value: 'debutant',  label: 'Débutant',  desc: 'Premiers pas en salle' },
  { value: 'moyen',     label: 'Intermédiaire', desc: 'Pratique régulière' },
  { value: 'avance',   label: 'Avancé',    desc: 'Athlète confirmé' },
];

const SPORTS = ['Musculation', 'Cardio', 'Cross-training', 'Boxe / MMA', 'Yoga', 'Stretching'];

export default function GymSessionBooking() {
  const { user } = useClientAuth();
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom]       = useState('08:00');
  const [to, setTo]           = useState('09:00');
  const [skill, setSkill]     = useState('debutant');
  const [sport, setSport]     = useState('');
  const [objective, setObjective] = useState('');
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [capacity, setCapacity] = useState<{ current: number; max: number; full: boolean } | null>(null);
  const [booking, setBooking] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  const PRICE = 5000;
  const token = localStorage.getItem('arenah_token');

  const fetchCapacity = async () => {
    const r = await fetch(`/api/bookings/gym/sessions/capacity?date=${date}&time_from=${from}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (r.ok) setCapacity(await r.json());
  };

  useEffect(() => { fetchCapacity(); }, [date, from]);

  const handleBook = async () => {
    if (!user || !custName) { toast.error('Connectez-vous et remplissez votre nom'); return; }
    setBooking(true);
    try {
      const res = await fetch('/api/bookings/gym/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, time_from: from, time_to: to, skill_level: skill, sport, objective, customer_name: custName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id);
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  if (done) return (
    <div className="text-center py-16 space-y-3">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-emerald-600"/>
      </div>
      <h3 className="font-bold text-lg">Séance réservée ! 💪</h3>
      <p className="text-sm text-muted-foreground">{date} · {from} → {to}</p>
      <Button variant="outline" onClick={() => { setDone(false); setBookingId(null); fetchCapacity(); }}>
        Réserver une autre séance
      </Button>
    </div>
  );

  const pct = capacity ? Math.round(capacity.current / capacity.max * 100) : 0;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Jauge de remplissage */}
      {capacity && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium"><Users className="w-4 h-4"/>{capacity.current} / {capacity.max} personnes</div>
            <span className="text-xs" style={{ color: capacity.full ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e' }}>
              {capacity.full ? 'Salle complète' : pct > 70 ? 'Presque plein' : 'Places disponibles'}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${pct}%`,
              background: capacity.full ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
            }}/>
          </div>
          {capacity.full && (
            <p className="text-xs text-red-500">Salle complète sur ce créneau. Choisissez un autre horaire.</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Arrivée</Label>
            <Input type="time" value={from} onChange={e => setFrom(e.target.value)} min="06:00" max="22:00" className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Départ</Label>
            <Input type="time" value={to} onChange={e => setTo(e.target.value)} min="06:00" max="23:00" className="h-9"/>
          </div>
        </div>

        {/* Niveau */}
        <div className="space-y-1">
          <Label className="text-xs">Niveau</Label>
          <div className="grid grid-cols-3 gap-2">
            {SKILLS.map(s => (
              <button key={s.value} onClick={() => setSkill(s.value)}
                className="rounded-xl p-3 text-left transition-all border"
                style={{
                  borderColor: skill === s.value ? '#22c55e' : 'hsl(var(--border))',
                  background: skill === s.value ? '#22c55e15' : undefined,
                }}>
                <div className="text-xs font-bold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sport */}
        <div className="space-y-1">
          <Label className="text-xs">Activité</Label>
          <div className="flex flex-wrap gap-1.5">
            {SPORTS.map(s => (
              <button key={s} onClick={() => setSport(sport === s ? '' : s)}
                className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                style={{
                  background: sport === s ? '#22c55e' : 'transparent',
                  color: sport === s ? '#fff' : undefined,
                  borderColor: sport === s ? '#22c55e' : 'hsl(var(--border))',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Objectif (optionnel)</Label>
          <Input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex: Prise de masse, perte de poids…" className="h-9"/>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Votre nom</Label>
          <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
        </div>

        <div className="rounded-lg px-3 py-2 flex justify-between items-center"
          style={{ background: '#22c55e12', border: '1px solid #22c55e30' }}>
          <span className="text-xs">Entrée séance</span>
          <span className="font-bold text-emerald-600">{PRICE.toLocaleString()} Ar</span>
        </div>

        <Button className="w-full" onClick={handleBook} disabled={booking || !custName || capacity?.full}>
          {booking ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : '💪 '}
          {capacity?.full ? 'Salle complète' : 'Réserver & payer'}
        </Button>
      </div>

      {bookingId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); toast.success('Séance réservée ! 💪'); }}
          amount={PRICE}
          bookingType="gym"
          bookingId={bookingId}
          label={`Séance gym · ${date} ${from}–${to}`}
        />
      )}
    </div>
  );
}
