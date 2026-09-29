import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, Clock } from 'lucide-react';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from './PaymentModal';

interface Combo {
  id: string; name: string; description: string;
  service_ids: string[]; total_price: number; duration_min: number | null;
}

interface Service { id: string; label: string; price: number; duration_min: number; }

export default function SalonCombos() {
  const { user }  = useClientAuth();
  const [combos, setCombos]     = useState<Combo[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Combo | null>(null);
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot]         = useState('09:00');
  const [custName, setCustName] = useState(user?.fullname ?? '');
  const [custPhone, setCustPhone] = useState(user?.phone ?? '');
  const [booking, setBooking]   = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const token = localStorage.getItem('arenah_token');

  useEffect(() => {
    Promise.all([
      fetch('/api/bookings/salon/combos').then(r => r.json()),
      fetch('/api/bookings/salon/services').then(r => r.json()),
    ]).then(([c, s]) => {
      setCombos(Array.isArray(c) ? c : []);
      setServices(Array.isArray(s) ? s : []);
    }).catch(() => toast.error('Erreur chargement'))
    .finally(() => setLoading(false));
  }, []);

  const handleBook = async () => {
    if (!user || !selected) { toast.error('Sélectionnez un forfait'); return; }
    if (!custName) { toast.error('Remplissez votre nom'); return; }
    setBooking(true);
    try {
      // Réserver avec le premier service du combo
      const firstServiceId = selected.service_ids[0];
      const res = await fetch('/api/bookings/salon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          service_id: firstServiceId, date, slot,
          customer_name: custName, customer_phone: custPhone,
          price: selected.total_price,
          notes: `Forfait composé : ${selected.name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setBookingId(data.id || 'temp');
      setPayOpen(true);
    } catch { toast.error('Erreur réseau'); }
    finally { setBooking(false); }
  };

  const getServiceLabel = (id: string) => services.find(s => s.id === id)?.label ?? id;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  if (done) return (
    <div className="text-center py-16 space-y-3">
      <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-pink-600"/>
      </div>
      <h3 className="font-bold text-lg">RDV confirmé ! ✨</h3>
      <p className="text-sm text-muted-foreground">{selected?.name} · {date} à {slot}</p>
      <Button variant="outline" onClick={() => { setDone(false); setSelected(null); setBookingId(null); }}>
        Autre réservation
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {combos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3"/>
          <p className="text-muted-foreground">Aucun forfait composé disponible.</p>
          <p className="text-xs text-muted-foreground mt-1">L'admin peut en créer depuis le panneau administration.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map(combo => {
            const isSel = selected?.id === combo.id;
            const comboServices = combo.service_ids.map(getServiceLabel);
            return (
              <button key={combo.id}
                onClick={() => setSelected(isSel ? null : combo)}
                className="rounded-2xl border p-5 text-left transition-all duration-200"
                style={{
                  borderColor: isSel ? '#ec4899' : 'hsl(var(--border))',
                  background: isSel ? '#ec489912' : undefined,
                  transform: isSel ? 'scale(1.02)' : 'scale(1)',
                }}>
                <div className="flex items-start justify-between mb-3">
                  <Sparkles className="w-5 h-5" style={{ color: '#ec4899' }}/>
                  {isSel && <Check className="w-4 h-4 text-pink-500"/>}
                </div>
                <h3 className="font-bold mb-1">{combo.name}</h3>
                {combo.description && <p className="text-xs text-muted-foreground mb-2">{combo.description}</p>}
                <div className="space-y-0.5 mb-3">
                  {comboServices.map((s, i) => (
                    <div key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-pink-400 inline-block"/>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="font-bold text-lg" style={{ color: '#ec4899' }}>{combo.total_price.toLocaleString()} Ar</span>
                  {combo.duration_min && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3"/>{Math.floor(combo.duration_min / 60)}h{combo.duration_min % 60 > 0 ? String(combo.duration_min % 60).padStart(2, '0') : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Formulaire réservation si combo sélectionné */}
      {selected && (
        <div className="rounded-2xl border border-pink-200 dark:border-pink-900 bg-card p-5 space-y-4 max-w-md">
          <div>
            <h3 className="font-bold">{selected.name}</h3>
            <p className="text-sm text-muted-foreground">{selected.total_price.toLocaleString()} Ar</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure</Label>
              <Input type="time" value={slot} onChange={e => setSlot(e.target.value)} min="09:00" max="18:00" className="h-9"/>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Votre nom</Label>
            <Input value={custName} onChange={e => setCustName(e.target.value)} className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Téléphone</Label>
            <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+261…" className="h-9"/>
          </div>
          <Button className="w-full gap-2" onClick={handleBook} disabled={booking || !custName}
            style={{ background: '#ec4899' }}>
            {booking ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
            Réserver le forfait
          </Button>
        </div>
      )}

      {bookingId && selected && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setDone(true); toast.success('RDV confirmé ! ✨'); }}
          amount={selected.total_price}
          bookingType="salon"
          bookingId={bookingId}
          label={`Forfait ${selected.name}`}
        />
      )}
    </div>
  );
}
