import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileSignature, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { eventApi } from '@/api/bookings';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { EVENT_SLIDES } from '../lib/bannerSlides';

interface Hall { id: string; name: string; desc: string; capacity: number; base_price: number; }
interface EventOption { id: string; label: string; price: number; }
interface EventBooking {
  id: string; hall_id: string; hall_name: string; event_date: string; guests: number;
  options: string[]; total: number; deposit: number; status: string;
  customer_name: string | null; signature_data: string | null;
}

const DEPOSIT_RATE = 0.3;

const ClientEvent = () => {
  const { user } = useClientAuth();

  const [halls, setHalls] = useState<Hall[]>([]);
  const [options, setOptions] = useState<EventOption[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payData, setPayData] = useState<{ id: string; amount: number } | null>(null);

  const [hallId, setHallId] = useState('');
  const [guests, setGuests] = useState(50);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [name, setName] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const [signOpen, setSignOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([eventApi.getHalls(), eventApi.getOptions()])
      .then(([h, o]: [Hall[], EventOption[]]) => {
        setHalls(h);
        setOptions(o);
        if (h.length) setHallId(h[0].id);
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));

    if (user) eventApi.getMyBookings().then(setBookings).catch(() => {});
  }, [user]);

  const toggleOpt = (id: string) => setSelectedOptions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const quote = useMemo(() => {
    const hall = halls.find(h => h.id === hallId);
    if (!hall) return { total: 0, deposit: 0, breakdown: [] };
    const breakdown: { label: string; amount: number }[] = [{ label: hall.name, amount: hall.base_price }];
    let total = hall.base_price;
    selectedOptions.forEach(id => {
      const o = options.find(x => x.id === id);
      if (o) { breakdown.push({ label: o.label, amount: o.price }); total += o.price; }
    });
    return { total, deposit: Math.round(total * DEPOSIT_RATE), breakdown };
  }, [halls, options, hallId, selectedOptions]);

  // Signature pad
  const drawing = useRef(false);
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearSign = () => { canvasRef.current!.getContext('2d')!.clearRect(0, 0, 500, 180); setSignature(''); };
  const confirmSign = () => { setSignature(canvasRef.current!.toDataURL()); setSignOpen(false); toast.success('Devis signé'); };

  const submit = async () => {
    if (!name || !phone || !date || guests <= 0) return toast.error('Remplissez tous les champs');
    setPlacing(true);
    try {
      const res: EventBooking = await eventApi.book({
        hall_id: hallId,
        event_date: date,
        guests,
        options: selectedOptions,
        customer_name: name,
        customer_phone: phone,
      });
      if (signature) await eventApi.sign(res.id, signature);
      setSignature('');
      setPayData({ id: res.id, amount: res.deposit });
      setPayOpen(true);
      const b = await eventApi.getMyBookings();
      setBookings(b);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <ModuleBanner slides={EVENT_SLIDES} badge="Événementiel" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 text-xs font-medium mb-3">
            <Calendar className="w-3.5 h-3.5" /> Espace événementiel
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-3">Configurez votre événement en 3 minutes.</h1>
          <p className="text-muted-foreground max-w-2xl">Salle, catering, décoration, DJ — composez votre pack, obtenez un devis instantané, signez et payez l'acompte ({Math.round(DEPOSIT_RATE * 100)}%).</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="configurer">
            <TabsList>
              <TabsTrigger value="configurer">Configurer</TabsTrigger>
              {user && <TabsTrigger value="mes">Mes devis ({bookings.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="configurer" className="mt-6 space-y-8">
              {/* Social proof counter */}
              <div className="flex items-center gap-6 rounded-2xl bg-muted/50 border border-border px-6 py-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">38</div>
                  <div className="text-xs text-muted-foreground">événements en 2025</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">4.8★</div>
                  <div className="text-xs text-muted-foreground">satisfaction client</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">2h</div>
                  <div className="text-xs text-muted-foreground">setup garanti</div>
                </div>
                <div className="w-px h-10 bg-border hidden md:block" />
                <div className="text-center hidden md:block">
                  <div className="text-2xl font-bold text-primary">30%</div>
                  <div className="text-xs text-muted-foreground">acompte seulement</div>
                </div>
              </div>

              {/* Preset packages */}
              <div>
                <Label className="mb-3 block">Démarrer avec un pack prêt à l'emploi</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: '💍', label: 'Mariage Essentiel', desc: 'Grande salle, traiteur, décoration, DJ — jusqu\'à 150 invités', guests: 150, hallIndex: 0, colors: 'from-rose-500/10 to-pink-500/5 border-rose-200 dark:border-rose-900' },
                    { icon: '🎂', label: 'Anniversaire VIP', desc: 'Fête exclusive avec animation et catering premium', guests: 50, hallIndex: 1, colors: 'from-amber-500/10 to-orange-500/5 border-amber-200 dark:border-amber-900' },
                    { icon: '🏢', label: 'Séminaire Corporate', desc: 'Formation ou réunion d\'entreprise tout équipé', guests: 80, hallIndex: 0, colors: 'from-blue-500/10 to-indigo-500/5 border-blue-200 dark:border-blue-900' },
                  ].map(pkg => (
                    <button key={pkg.label}
                      onClick={() => { setGuests(pkg.guests); if (halls[pkg.hallIndex]) setHallId(halls[pkg.hallIndex].id); }}
                      className={`text-left rounded-2xl border bg-gradient-to-br p-5 transition hover:shadow-trust ${pkg.colors}`}>
                      <div className="text-2xl mb-2">{pkg.icon}</div>
                      <div className="font-semibold text-sm">{pkg.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{pkg.desc}</div>
                      <div className="text-xs text-primary font-medium mt-3">→ Appliquer ce pack</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event photos gallery */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Nos événements récents</Label>
                  <span className="text-xs text-muted-foreground">38 organisés</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80', label: 'Mariage' },
                    { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&q=80', label: 'Anniversaire' },
                    { src: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400&q=80', label: 'Corporate' },
                    { src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80', label: 'Gala' },
                  ].map(p => (
                    <div key={p.label} className="relative aspect-video rounded-xl overflow-hidden group">
                      <img src={p.src} alt={p.label} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition flex items-end p-2">
                        <span className="text-white text-xs font-medium">{p.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Halls */}
              <div>
                <Label className="mb-3 block">Choisissez votre salle</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  {halls.map(h => (
                    <button key={h.id} onClick={() => setHallId(h.id)}
                      className={`text-left rounded-2xl border-2 p-5 transition ${hallId === h.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{h.desc}</div>
                      <div className="text-xs text-muted-foreground mt-2">Jusqu'à {h.capacity} invités</div>
                      <div className="text-lg font-bold text-primary mt-2">{formatPrice(h.base_price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">Date de l'événement</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label className="mb-2 block">Nombre d'invités</Label>
                  <Input type="number" min={1} value={guests} onChange={e => setGuests(+e.target.value)} />
                </div>
              </div>

              {/* Options */}
              <div>
                <Label className="mb-3 block">Services additionnels</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {options.map(o => {
                    const sel = selectedOptions.includes(o.id);
                    return (
                      <div key={o.id} onClick={() => toggleOpt(o.id)} role="button" tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleOpt(o.id)}
                        className={`flex items-start gap-3 text-left rounded-xl border-2 p-4 transition cursor-pointer ${sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                        <Checkbox checked={sel} className="mt-0.5 pointer-events-none" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{o.label}</div>
                        </div>
                        <div className="text-sm font-semibold text-primary">{formatPrice(o.price)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quote */}
              <div className="rounded-2xl border-2 border-primary bg-muted/30 p-6 max-w-2xl">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSignature className="w-5 h-5 text-primary" /> Devis automatique</h3>
                <div className="space-y-1.5 text-sm mb-4">
                  {quote.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between"><span className="text-muted-foreground">{b.label}</span><span className="font-medium">{formatPrice(b.amount)}</span></div>
                  ))}
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base"><span>Total</span><span>{formatPrice(quote.total)}</span></div>
                  <div className="flex justify-between text-primary font-semibold"><span>Acompte ({Math.round(DEPOSIT_RATE * 100)}%)</span><span>{formatPrice(quote.deposit)}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>

                {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Vous devez être connecté pour soumettre un devis.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setSignOpen(true)}>
                    <FileSignature className="w-4 h-4 mr-1.5" /> {signature ? 'Signature ajoutée ✓' : 'Signer électroniquement'}
                  </Button>
                  <Button onClick={submit} disabled={placing || !user} className="flex-1 min-w-[200px]">
                    {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Enregistrer le devis
                  </Button>
                </div>
              </div>
            </TabsContent>

            {user && (
              <TabsContent value="mes" className="mt-6">
                {bookings.length === 0 ? <p className="text-muted-foreground">Aucun devis.</p> : (
                  <div className="space-y-3">
                    {bookings.map(b => (
                      <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="font-semibold">{b.hall_name} <span className="text-muted-foreground font-normal">— {b.event_date}</span></div>
                            <div className="text-sm text-muted-foreground">{b.guests} invités · {b.customer_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatPrice(b.total)}</div>
                            <div className="text-xs text-muted-foreground">Acompte {formatPrice(b.deposit)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${
                            b.status === 'devis' ? 'bg-muted text-muted-foreground' :
                            b.status === 'signe' ? 'bg-amber-500/10 text-amber-600' :
                            b.status === 'confirme' ? 'bg-emerald-500/10 text-emerald-600' :
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {b.status === 'devis' ? 'En attente' : b.status === 'signe' ? 'Signé' : b.status === 'confirme' ? 'Confirmé' : 'Annulé'}
                          </span>
                          {b.signature_data && <span className="text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3" /> Signature électronique</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Signature électronique</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Signez ci-dessous avec votre souris ou votre doigt.</p>
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30">
              <canvas ref={canvasRef} width={500} height={180}
                onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw}
                className="w-full h-[180px] touch-none cursor-crosshair" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={clearSign}>Effacer</Button>
              <Button onClick={confirmSign}>Valider la signature</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Acompte événement confirmé !'); }}
          amount={payData.amount}
          bookingType="event"
          bookingId={payData.id}
          label="Acompte 30% — Salle événementielle"
        />
      )}
    </div>
  );
};

export default ClientEvent;
