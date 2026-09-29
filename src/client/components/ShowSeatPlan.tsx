import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

interface Seat {
  id: string; row_label: string; seat_number: number;
  category: string; price: number; status: string;
}

const CAT_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  VIP:      { bg: '#7c3aed22', border: '#7c3aed', label: 'VIP' },
  premium:  { bg: '#d4a84322', border: '#d4a843', label: 'Premium' },
  standard: { bg: '#1e3a5f22', border: '#3b82f6', label: 'Standard' },
};

export default function ShowSeatPlan({ showId, basePrice }: { showId: string; basePrice: number }) {
  const { user } = useClientAuth();
  const [seats, setSeats]       = useState<Seat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [custPhone, setCustPhone] = useState(user?.phone ?? '');
  const [booking, setBooking]   = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{ seats: string[]; total: number } | null>(null);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bookings/shows/${showId}/seats`)
      .then(r => r.json())
      .then(data => { setSeats(Array.isArray(data) ? data : []); })
      .catch(() => toast.error('Impossible de charger le plan'))
      .finally(() => setLoading(false));
  }, [showId]);

  const rows = [...new Set(seats.map(s => s.row_label))].sort();
  const toggle = (id: string, status: string) => {
    if (status !== 'free') return;
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const total = seats.filter(s => selected.includes(s.id)).reduce((a, s) => a + s.price, 0);

  const handleBook = async () => {
    if (!user || selected.length === 0) return;
    setBooking(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const res = await fetch(`/api/bookings/shows/${showId}/book-seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seat_ids: selected, customer_name: custName, customer_phone: custPhone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.booking_id);
      setBookingResult({ seats: data.seats, total: data.total });
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  if (done && bookingResult) return (
    <div className="text-center py-10 space-y-3">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-emerald-600"/>
      </div>
      <h3 className="font-bold text-lg">Billets réservés ! 🎭</h3>
      <p className="text-sm text-muted-foreground">Sièges : <span className="font-semibold text-foreground">{bookingResult.seats.join(', ')}</span></p>
      <p className="text-sm text-muted-foreground">Total payé : <span className="font-semibold" style={{ color: '#d4a843' }}>{bookingResult.total.toLocaleString()} Ar</span></p>
      <Button variant="outline" onClick={() => { setDone(false); setSelected([]); window.location.reload(); }}>Retour aux spectacles</Button>
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-5">
      {/* Scène */}
      <div className="rounded-xl py-3 text-center text-sm font-bold uppercase tracking-widest"
        style={{ background: 'linear-gradient(90deg,#d4a84320,#d4a84340,#d4a84320)', color: '#d4a843', border: '1px solid #d4a84440' }}>
        🎤 Scène
      </div>

      {/* Plan sièges */}
      <div className="overflow-x-auto">
        <div className="space-y-1.5 min-w-[480px]">
          {rows.map(row => {
            const rowSeats = seats.filter(s => s.row_label === row).sort((a, b) => a.seat_number - b.seat_number);
            const cat = rowSeats[0]?.category ?? 'standard';
            const style = CAT_STYLE[cat] ?? CAT_STYLE.standard;
            return (
              <div key={row} className="flex items-center gap-1.5">
                <span className="w-6 text-right text-xs font-bold text-muted-foreground shrink-0">{row}</span>
                <div className="flex gap-1 flex-wrap">
                  {rowSeats.map(seat => {
                    const isSel = selected.includes(seat.id);
                    const free  = seat.status === 'free';
                    return (
                      <button key={seat.id}
                        disabled={!free}
                        onClick={() => toggle(seat.id, seat.status)}
                        title={`${row}${seat.seat_number} — ${seat.price.toLocaleString()} Ar`}
                        className="w-8 h-8 rounded-md text-[11px] font-bold transition-all duration-150 flex items-center justify-center"
                        style={{
                          background: isSel ? style.border : free ? style.bg : '#333',
                          border: `1.5px solid ${isSel ? style.border : free ? style.border + '80' : '#555'}`,
                          color: isSel ? '#fff' : free ? style.border : '#666',
                          cursor: free ? 'pointer' : 'not-allowed',
                          transform: isSel ? 'scale(1.1)' : 'scale(1)',
                        }}>
                        {seat.seat_number}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground ml-1 capitalize">{cat}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-3">
        {Object.entries(CAT_STYLE).map(([cat, s]) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded inline-block" style={{ background: s.bg, border: `1.5px solid ${s.border}` }}/>
            {s.label} · {seats.find(se => se.category === cat)?.price.toLocaleString()} Ar
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-[#333] border border-[#555] inline-block"/>Occupé</span>
        <span className="flex items-center gap-1.5 ml-auto font-medium text-foreground">
          Sélectionnés : <span style={{ color: '#d4a843' }}>{selected.length}</span>
        </span>
      </div>

      {/* Formulaire + total */}
      {selected.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1"><Label className="text-xs">Nom</Label>
              <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
            </div>
            <div className="flex-1 space-y-1"><Label className="text-xs">Téléphone</Label>
              <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} className="h-9"/>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{selected.length} siège(s) sélectionné(s)</p>
              <p className="text-lg font-bold" style={{ color: '#d4a843' }}>{total.toLocaleString()} Ar</p>
            </div>
            <Button onClick={handleBook} disabled={booking || !custName} className="gap-2">
              {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : '🎟️'} Réserver & payer
            </Button>
          </div>
        </div>
      )}

      {bookingId && bookingResult && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); }}
          amount={bookingResult.total}
          bookingType="show"
          bookingId={bookingId}
          label={`Billets — sièges ${bookingResult.seats.join(', ')}`}
        />
      )}
    </div>
  );
}
