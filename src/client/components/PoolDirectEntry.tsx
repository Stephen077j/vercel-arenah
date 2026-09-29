import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check, Plus, Minus } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

const ENTRY = 5000, COMPANION = 2000;

export default function PoolDirectEntry() {
  const { user } = useClientAuth();
  const [companions, setCompanions] = useState(0);
  const [custName, setCustName]     = useState(user?.fullname ?? '');
  const [booking, setBooking]       = useState(false);
  const [payOpen, setPayOpen]       = useState(false);
  const [bookingId, setBookingId]   = useState<string | null>(null);
  const [done, setDone]             = useState(false);

  const total = ENTRY + companions * COMPANION;
  const token = localStorage.getItem('arenah_token');

  const handleBook = async () => {
    if (!user) { toast.error('Connectez-vous pour acheter une entrée'); return; }
    setBooking(true);
    try {
      const res = await fetch('/api/bookings/pool/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companion_count: companions, customer_name: custName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id);
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  if (done) return (
    <div className="max-w-sm mx-auto text-center py-16 space-y-3">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-blue-600"/>
      </div>
      <h3 className="font-bold text-lg">Entrée confirmée ! 🏊</h3>
      <p className="text-sm text-muted-foreground">
        {companions > 0 ? `+ ${companions} accompagnant(s) · ` : ''}Total : {total.toLocaleString()} Ar
      </p>
      <Button variant="outline" onClick={() => { setDone(false); setCompanions(0); setBookingId(null); }}>
        Nouvelle entrée
      </Button>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div>
          <h3 className="font-bold">Entrée piscine — Tarif</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Valable pour la journée</p>
        </div>

        {/* Tarifs */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span>Entrée adulte</span>
            <span className="font-bold text-blue-500">{ENTRY.toLocaleString()} Ar</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border text-muted-foreground">
            <span>Accompagnant</span>
            <span className="font-medium">{COMPANION.toLocaleString()} Ar / pers.</span>
          </div>
        </div>

        {/* Nombre d'accompagnants */}
        <div className="space-y-2">
          <Label className="text-xs">Nombre d'accompagnants</Label>
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCompanions(c => Math.max(0, c-1))} disabled={companions === 0}>
              <Minus className="w-4 h-4"/>
            </Button>
            <span className="w-8 text-center font-bold text-lg">{companions}</span>
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCompanions(c => Math.min(9, c+1))}>
              <Plus className="w-4 h-4"/>
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Votre nom</Label>
          <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
        </div>

        {/* Total */}
        <div className="rounded-xl p-4 space-y-1" style={{ background: '#3b82f615', border: '1px solid #3b82f630' }}>
          <div className="flex justify-between text-sm">
            <span>1 entrée</span><span>{ENTRY.toLocaleString()} Ar</span>
          </div>
          {companions > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{companions} accompagnant(s)</span><span>{(companions * COMPANION).toLocaleString()} Ar</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border/50 pt-2 mt-2">
            <span>Total</span>
            <span style={{ color: '#3b82f6' }}>{total.toLocaleString()} Ar</span>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={handleBook} disabled={booking || !custName}>
          {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : '🌊'} Payer l'entrée
        </Button>
      </div>

      {bookingId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); toast.success('Bonne baignade ! 🏊'); }}
          amount={total}
          bookingType="pool"
          bookingId={bookingId}
          label={`Entrée piscine${companions > 0 ? ` + ${companions} accompagnant(s)` : ''}`}
        />
      )}
    </div>
  );
}
