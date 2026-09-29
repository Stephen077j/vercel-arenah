import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Monitor, Gamepad2, Check, Circle } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

interface Station {
  id: string; label: string; station_type: string; specs: string;
  hourly_rate: number; active: boolean;
  booking?: { time_from: string; time_to: string } | null;
}

interface Game { id: string; title: string; genre: string; players: number; }

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pc:      { icon: <Monitor className="w-5 h-5"/>,   label: 'PC',      color: '#3b82f6' },
  ps4:     { icon: <Gamepad2 className="w-5 h-5"/>,  label: 'PS4',     color: '#7c3aed' },
  billard: { icon: <Circle className="w-5 h-5"/>,    label: 'Billard', color: '#d4a843' },
};

export default function CybercafeStations() {
  const { user } = useClientAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [games, setGames]       = useState<Game[]>([]);
  const [loading, setLoading]   = useState(true);
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom]         = useState('09:00');
  const [hours, setHours]       = useState(1);
  const [filter, setFilter]     = useState<'all' | 'pc' | 'ps4' | 'billard'>('all');
  const [selected, setSelected] = useState<Station | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [booking, setBooking]   = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const toTime = (from: string, h: number) => {
    const [hh, mm] = from.split(':').map(Number);
    const total = hh * 60 + mm + h * 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  const timeTo = toTime(from, hours);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const [sRes, gRes] = await Promise.all([
        fetch(`/api/bookings/cybercafe/stations?date=${date}&time_from=${from}&time_to=${timeTo}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/bookings/cybercafe/ps4-games'),
      ]);
      if (sRes.ok) setStations(await sRes.json());
      if (gRes.ok) setGames(await gRes.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStations(); }, [date, from, hours]);

  const amount = (selected?.hourly_rate ?? 2000) * hours;

  const handleBook = async () => {
    if (!selected || !user) return;
    setBooking(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const res = await fetch('/api/bookings/cybercafe/by-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          station_id: selected.id, date, time_from: from, time_to: timeTo,
          duration_hours: hours, customer_name: custName,
          game_title: selectedGame || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id || data.booking_id || 'temp');
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  const filtered = stations.filter(s => filter === 'all' || s.station_type === filter);

  if (done) return (
    <div className="text-center py-12 space-y-3">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-emerald-600"/>
      </div>
      <h3 className="font-bold text-lg">Poste réservé ! 🎮</h3>
      <p className="text-sm text-muted-foreground">
        {selected?.label} · {date} · {from} → {timeTo}
      </p>
      <Button variant="outline" onClick={() => { setDone(false); setSelected(null); fetchStations(); }}>
        Nouvelle réservation
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="h-9 w-36"/>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Début</Label>
          <Input type="time" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-28"/>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Durée</Label>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setHours(h => Math.max(1,h-1))}>-</Button>
            <span className="w-12 text-center font-semibold">{hours}h</span>
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setHours(h => Math.min(8,h+1))}>+</Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground self-end pb-1">→ {timeTo}</div>

        {/* Type filter */}
        <div className="flex rounded-lg overflow-hidden border border-border ml-auto">
          {(['all', 'pc', 'ps4', 'billard'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
              style={{ background: filter === f ? '#d4a843' : 'transparent', color: filter === f ? '#111' : 'inherit' }}>
              {f === 'all' ? 'Tout' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Grille postes */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground"/></div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden"
              style={{ background: '#0a0f1e' }}>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#d4a843', opacity: 0.7 }}>
                Postes disponibles — {from} à {timeTo}
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">Aucun poste disponible</div>
                )}
                {filtered.map(station => {
                  const free   = !station.booking;
                  const isSel  = selected?.id === station.id;
                  const cfg    = TYPE_CONFIG[station.station_type] ?? TYPE_CONFIG.pc;
                  return (
                    <button key={station.id}
                      disabled={!free}
                      onClick={() => { setSelected(isSel ? null : station); setSelectedGame(''); }}
                      className="rounded-xl p-4 text-center transition-all duration-200 relative"
                      style={{
                        background: isSel ? cfg.color + '22' : free ? '#111827' : '#1a1010',
                        border: `2px solid ${isSel ? cfg.color : free ? cfg.color + '66' : '#ef444466'}`,
                        opacity: !free ? 0.6 : 1,
                        cursor: free ? 'pointer' : 'not-allowed',
                        transform: isSel ? 'scale(1.04)' : 'scale(1)',
                      }}>
                      <div className="flex justify-center mb-2" style={{ color: isSel ? cfg.color : free ? cfg.color : '#ef4444' }}>
                        {cfg.icon}
                      </div>
                      <div className="text-sm font-bold text-white">{station.label || cfg.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: cfg.color + 'aa' }}>{cfg.label}</div>
                      <div className="text-[10px] mt-1" style={{ color: free ? '#22c55e' : '#ef4444' }}>
                        {free ? `Libre · ${station.hourly_rate?.toLocaleString()} Ar/h` : 'Occupé'}
                      </div>
                      {isSel && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: cfg.color }}>
                        <Check className="w-3 h-3 text-white"/>
                      </div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panneau réservation */}
        <div className="space-y-4">
          {selected ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="font-bold">{selected.label}</h3>
                <p className="text-xs text-muted-foreground capitalize">{selected.station_type} · {selected.specs || 'Standard'}</p>
              </div>
              {/* Jeux PS4 */}
              {selected.station_type === 'ps4' && games.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Choisir un jeu (optionnel)</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {games.map(g => (
                      <button key={g.id}
                        onClick={() => setSelectedGame(selectedGame === g.title ? '' : g.title)}
                        className="text-left rounded-lg px-2 py-1.5 text-xs transition-colors"
                        style={{
                          background: selectedGame === g.title ? '#7c3aed22' : 'hsl(var(--muted))',
                          border: `1px solid ${selectedGame === g.title ? '#7c3aed' : 'transparent'}`,
                          color: selectedGame === g.title ? '#7c3aed' : undefined,
                        }}>
                        <div className="font-medium truncate">{g.title}</div>
                        <div className="text-[10px] opacity-60">{g.genre} · {g.players}j</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-0.5">
                <div className="flex justify-between"><span>Date</span><span className="font-medium">{date}</span></div>
                <div className="flex justify-between"><span>Créneau</span><span className="font-medium">{from} → {timeTo} ({hours}h)</span></div>
                {selectedGame && <div className="flex justify-between"><span>Jeu</span><span className="font-medium">{selectedGame}</span></div>}
              </div>
              <div className="space-y-1"><Label className="text-xs">Votre nom</Label>
                <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: '#d4a84312', border: '1px solid #d4a84330' }}>
                <span className="text-xs">Total</span>
                <span className="font-bold" style={{ color: '#d4a843' }}>{amount.toLocaleString()} Ar</span>
              </div>
              <Button className="w-full gap-2" onClick={handleBook} disabled={booking || !custName}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : '🎮'} Réserver & payer
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              <div className="text-3xl mb-3">🖥️</div>
              <p className="text-sm">Sélectionnez un poste sur le plan</p>
            </div>
          )}
        </div>
      </div>

      {bookingId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); toast.success('Poste réservé ! 🎉'); }}
          amount={amount}
          bookingType="cybercafe"
          bookingId={bookingId}
          label={`${selected?.label} · ${hours}h`}
        />
      )}
    </div>
  );
}
