import { useEffect, useState, useCallback, useMemo } from 'react';
import { showApi } from '@/client/../api/bookings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Ticket, MapPin, Clock, Loader2, Music, Users, Theater,
  Laugh, TrendingUp, ChevronLeft, QrCode, CalendarDays, Flame, Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, typedFavStore } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { SPECTACLES_SLIDES } from '../lib/bannerSlides';

/* ── TYPES ─────────────────────────────────────────────────── */

interface Show {
  id: string; title: string; artist: string; date: string; time: string;
  venue: string; category: string; description: string; image_url: string | null;
  base_price: number; seats_sold: number; total_seats: number; sold_pct: number;
}
interface Seat { row: string; number: number; type: string; price: number; taken: boolean; }
interface MyTicket { id: string; title: string; show_date: string; show_time: string; venue: string; seats: Seat[]; total: number; status: string; customer_name: string | null; qr?: string; }

/* ── CATÉGORIES ────────────────────────────────────────────── */

const CATEGORIES = [
  { key: 'Musique',  label: 'Musique',  icon: Music   },
  { key: 'Danse',    label: 'Danse',    icon: Users   },
  { key: 'Humour',   label: 'Humour',   icon: Laugh   },
  { key: 'Théâtre',  label: 'Théâtre',  icon: Theater },
];

const FALLBACK_IMAGES: Record<string, string> = {
  Musique: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop',
  Danse:   'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80&auto=format&fit=crop',
  Humour:  'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80&auto=format&fit=crop',
  Théâtre: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80&auto=format&fit=crop',
};

/* ── COUNTDOWN HOOK ────────────────────────────────────────── */

function useCountdown(dateStr: string, timeStr: string) {
  const [diff, setDiff] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
  useEffect(() => {
    const target = new Date(`${dateStr}T${timeStr}`).getTime();
    const tick = () => {
      const rem = target - Date.now();
      if (rem <= 0) { setDiff(null); return; }
      setDiff({
        days:  Math.floor(rem / 86400000),
        hours: Math.floor((rem % 86400000) / 3600000),
        mins:  Math.floor((rem % 3600000) / 60000),
        secs:  Math.floor((rem % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [dateStr, timeStr]);
  return diff;
}

/* ── COUNTDOWN STRIP ──────────────────────────────────────── */

function CountdownStrip({ days, hours, mins, secs }: { days: number; hours: number; mins: number; secs: number }) {
  const urgent = days === 0;
  return (
    <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 mb-3 text-xs font-semibold ${
      urgent ? 'bg-red-500/10 text-red-700 border border-red-500/20' : 'bg-primary/8 text-primary border border-primary/20'
    }`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Dans </span>
      {days > 0 && <><span className="tabular-nums">{days}</span><span>j </span></>}
      <span className="tabular-nums">{String(hours).padStart(2,'0')}</span><span>h </span>
      <span className="tabular-nums">{String(mins).padStart(2,'0')}</span><span>m </span>
      {days === 0 && <><span className="tabular-nums">{String(secs).padStart(2,'0')}</span><span>s</span></>}
    </div>
  );
}

/* ── SHOW CARD ─────────────────────────────────────────────── */

function ShowCard({ show, onSelect }: { show: Show; onSelect: (id: string) => void }) {
  const countdown = useCountdown(show.date, show.time);
  const [isFav, setIsFav] = useState(typedFavStore.has('show', show.id));
  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    typedFavStore.toggle({ type: 'show', id: show.id, label: show.title, sub: `${show.artist} · ${show.date}`, img: show.image_url ?? undefined, path: '/spectacles' });
    setIsFav(typedFavStore.has('show', show.id));
  };
  const img = show.image_url ?? FALLBACK_IMAGES[show.category] ?? '';
  const soldPct = show.sold_pct ?? 0;
  const isHot = soldPct >= 80;
  const dateLabel = new Date(`${show.date}T${show.time}`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const timeLabel = show.time.slice(0, 5);

  return (
    <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {img
          ? <img src={img} alt={show.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center bg-primary/10"><Ticket className="w-16 h-16 text-primary/30" /></div>
        }
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm">
          {show.category}
        </span>
        {/* Hot badge */}
        {isHot && (
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
            <Flame className="w-3 h-3" /> Presque complet
          </span>
        )}
        {/* Date chip on image */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold capitalize">{dateLabel}</span>
          <span className="text-sm opacity-80">· {timeLabel}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Countdown */}
        {countdown && <CountdownStrip {...countdown} />}

        <h3 className="font-bold text-lg leading-tight mb-0.5">{show.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{show.artist}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> {show.venue}
        </div>

        {/* Sold-out bar */}
        {show.total_seats > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{show.seats_sold} billet{show.seats_sold > 1 ? 's' : ''} vendu{show.seats_sold > 1 ? 's' : ''}</span>
              <span className={`font-semibold ${soldPct >= 80 ? 'text-red-600' : soldPct >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {soldPct}% complet
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  soldPct >= 80 ? 'bg-red-500' : soldPct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(soldPct, 3)}%` }}
              />
            </div>
          </div>
        )}

        {/* Prix + CTA */}
        <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground">À partir de</p>
            <p className="font-bold text-lg">{formatPrice(show.base_price)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFav}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-50 transition">
              <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </button>
            <Button onClick={() => onSelect(show.id)} className="gap-1.5">
              <Ticket className="w-4 h-4" /> Réserver
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── PAGE ──────────────────────────────────────────────────── */

const ClientSpectacles = () => {
  const { user } = useClientAuth();

  const [shows,        setShows]        = useState<Show[]>([]);
  const [seats,        setSeats]        = useState<Seat[]>([]);
  const [myTickets,    setMyTickets]    = useState<MyTicket[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [placing,      setPlacing]      = useState(false);
  const [catFilter,    setCatFilter]    = useState<string>('all');

  const [selectedShowId,  setSelectedShowId]  = useState<string | null>(null);
  const [selectedSeats,   setSelectedSeats]   = useState<Seat[]>([]);
  const [customerName,    setCustomerName]    = useState(user?.fullname ?? '');
  const [customerPhone,   setCustomerPhone]   = useState(user?.phone ?? '');
  const [checkoutOpen,    setCheckoutOpen]    = useState(false);
  const [payOpen,         setPayOpen]         = useState(false);
  const [payData,         setPayData]         = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    showApi.getShows()
      .then(data => setShows(data as Show[]))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
    if (user) {
      showApi.getMyTickets().then(async (tickets) => {
        const list = tickets as MyTicket[];
        // Charger les QR codes en parallèle
        const withQr = await Promise.all(list.map(async t => {
          if (t.status === 'cancelled') return t;
          try {
            const r = await showApi.getTicketQr(t.id) as { qr: string };
            return { ...t, qr: r.qr };
          } catch { return t; }
        }));
        setMyTickets(withQr);
      }).catch(() => {});
    }
  }, [user]);

  const filteredShows = useMemo(() => {
    if (catFilter === 'all') return shows;
    return shows.filter(s => s.category === catFilter);
  }, [shows, catFilter]);

  const selectShow = useCallback(async (id: string) => {
    setSelectedShowId(id);
    setSelectedSeats([]);
    setLoadingSeats(true);
    try {
      const data: Seat[] = await showApi.getSeats(id);
      setSeats(data);
    } catch {
      toast.error('Erreur de chargement des sièges');
    } finally { setLoadingSeats(false); }
  }, []);

  const toggleSeat = (seat: Seat) => {
    if (seat.taken) return;
    const exists = selectedSeats.some(s => s.row === seat.row && s.number === seat.number);
    setSelectedSeats(prev =>
      exists ? prev.filter(s => !(s.row === seat.row && s.number === seat.number)) : [...prev, seat]
    );
  };

  const seatTotal = selectedSeats.reduce((s, seat) => s + seat.price, 0);

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || selectedSeats.length === 0 || !selectedShowId) {
      toast.error('Remplissez tous les champs'); return;
    }
    setPlacing(true);
    try {
      const res = await showApi.book({
        show_id: selectedShowId,
        seats: selectedSeats.map(s => ({ row: s.row, number: s.number, type: s.type, price: s.price })),
        customer_name: customerName, customer_phone: customerPhone,
      });
      setCheckoutOpen(false);
      setSelectedSeats([]);
      setSelectedShowId(null);
      setPayData({ id: (res as { id: string }).id, amount: seatTotal });
      setPayOpen(true);
      if (user) {
        const t = await showApi.getMyTickets();
        setMyTickets(t as MyTicket[]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally { setPlacing(false); }
  };

  const selectedShow = shows.find(s => s.id === selectedShowId);
  const ROWS = ['A','B','C','D','E','F','G','H'];

  // Catégories présentes dans les shows chargés
  const presentCats = useMemo(() => Array.from(new Set(shows.map(s => s.category))), [shows]);

  return (
    <div>
      <ModuleBanner slides={SPECTACLES_SLIDES} badge="Spectacles & Concerts" />
      <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Parcourir</TabsTrigger>
            <TabsTrigger value="my-tickets" className="relative">
              Mes billets
              {myTickets.length > 0 && (
                <Badge className="absolute -top-2 -right-2 rounded-full w-5 h-5 p-0 flex items-center justify-center">
                  {myTickets.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── BROWSING ─────────────────────────────────────── */}
          <TabsContent value="browse" className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Spectacles & Concerts</h1>
              <p className="text-muted-foreground mt-1">Découvrez nos événements et réservez vos billets en ligne.</p>
            </div>

            {/* Filtre catégories */}
            {!loading && !selectedShowId && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCatFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${catFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                >
                  Tous ({shows.length})
                </button>
                {CATEGORIES.filter(c => presentCats.includes(c.key)).map(c => {
                  const Icon = c.icon;
                  const count = shows.filter(s => s.category === c.key).length;
                  return (
                    <button key={c.key} onClick={() => setCatFilter(c.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition ${catFilter === c.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {c.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !selectedShowId ? (
              <>
                {filteredShows.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <Ticket className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Aucun spectacle dans cette catégorie.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredShows.map(show => (
                      <ShowCard key={show.id} show={show} onSelect={selectShow} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── SÉLECTION SIÈGES ──────────────────────────── */
              <div className="space-y-6">
                <Button variant="outline" onClick={() => { setSelectedShowId(null); setSeats([]); }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Retour aux spectacles
                </Button>

                {loadingSeats ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Card className="p-6 space-y-4">
                        <div className="text-center space-y-1">
                          <h2 className="text-2xl font-bold">{selectedShow?.title}</h2>
                          <p className="text-muted-foreground">{selectedShow?.venue}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedShow && new Date(`${selectedShow.date}T${selectedShow.time}`)
                              .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex justify-center gap-6 text-xs pt-4 pb-4 border-t border-b">
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded" /><span>Disponible</span></div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded" /><span>Sélectionné</span></div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-300 rounded" /><span>Vendu</span></div>
                        </div>

                        <div className="text-center py-3 bg-muted rounded-lg font-semibold text-sm">🎭 SCÈNE</div>

                        <div className="flex flex-col gap-3">
                          {ROWS.map(row => {
                            const rowSeats = seats.filter(s => s.row === row);
                            return (
                              <div key={row} className="flex items-center justify-center gap-1">
                                <span className="w-6 text-right text-xs font-semibold text-muted-foreground">{row}</span>
                                <div className="flex gap-1 flex-wrap justify-center flex-1 max-w-lg">
                                  {rowSeats.map(seat => {
                                    const isSelected = selectedSeats.some(s => s.row === seat.row && s.number === seat.number);
                                    return (
                                      <button
                                        key={`${seat.row}${seat.number}`}
                                        onClick={() => toggleSeat(seat)}
                                        disabled={seat.taken}
                                        title={`${seat.row}${seat.number} — ${seat.type} — ${formatPrice(seat.price)}`}
                                        className={`w-7 h-7 rounded text-[10px] font-semibold transition ${
                                          seat.taken ? 'bg-gray-200 cursor-not-allowed text-gray-400' :
                                          isSelected  ? 'bg-yellow-500 text-white scale-110 shadow-md' :
                                          'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                      >
                                        {seat.number}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Légende types */}
                        <div className="flex flex-wrap justify-center gap-4 text-xs pt-2 border-t border-border">
                          {[
                            { type: 'vip',      label: 'VIP (rangées A-B)',       color: 'bg-purple-100 text-purple-700' },
                            { type: 'premium',  label: 'Premium (rangées C-D)',   color: 'bg-blue-100 text-blue-700'   },
                            { type: 'standard', label: 'Standard (rangées E-H)', color: 'bg-gray-100 text-gray-700'  },
                          ].map(t => (
                            <span key={t.type} className={`px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Résumé commande */}
                    <div>
                      <Card className="p-4 sticky top-6 space-y-4">
                        <h3 className="font-semibold">Résumé</h3>
                        {selectedSeats.length === 0 ? (
                          <div className="text-center py-6">
                            <Ticket className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">Sélectionnez vos sièges</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedSeats.map(seat => (
                              <div key={`${seat.row}${seat.number}`} className="flex items-center justify-between text-sm p-2 bg-muted rounded-lg">
                                <div>
                                  <p className="font-medium">Siège {seat.row}{seat.number}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{seat.type}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{formatPrice(seat.price)}</p>
                                  <button onClick={() => toggleSeat(seat)} className="text-xs text-destructive hover:underline">Retirer</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="border-t pt-3 space-y-3">
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span className="text-primary text-lg">{formatPrice(seatTotal)}</span>
                          </div>
                          {!user && (
                            <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-2 py-1">
                              Connectez-vous pour réserver.
                            </p>
                          )}
                          <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full" disabled={selectedSeats.length === 0 || !user}>
                                Commander ({selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''})
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Finaliser la commande</DialogTitle>
                                <DialogDescription>Entrez vos informations pour recevoir vos billets</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Nom</label>
                                  <Input placeholder="Votre nom complet" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Téléphone</label>
                                  <Input placeholder="Votre numéro" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                </div>
                                <div className="bg-muted p-3 rounded-lg">
                                  <p className="text-sm text-muted-foreground">{selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''}</p>
                                  <p className="text-2xl font-bold">{formatPrice(seatTotal)}</p>
                                </div>
                                <Button onClick={handleCheckout} disabled={placing} className="w-full">
                                  {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  Confirmer — {formatPrice(seatTotal)}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── MES BILLETS ─────────────────────────────────── */}
          <TabsContent value="my-tickets">
            {myTickets.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <QrCode className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Aucun billet pour le moment.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => document.querySelector<HTMLButtonElement>('[value="browse"]')?.click()}>
                  Parcourir les spectacles
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myTickets.map(t => (
                  <div key={t.id} className={`rounded-2xl border bg-card overflow-hidden ${t.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/50">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{t.title}</span>
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        t.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/15 text-emerald-700'
                      }`}>
                        {t.status === 'cancelled' ? 'Annulé' : 'Confirmé'}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {t.show_date}</div>
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t.show_time}</div>
                        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {t.venue}</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(Array.isArray(t.seats) ? t.seats : []).map((s: Seat, i: number) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {s.row}{s.number}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                        <div className="font-bold text-sm">{formatPrice(t.total)}</div>
                        {t.qr ? (
                          <div className="flex flex-col items-end gap-1">
                            <img src={t.qr} alt="QR code billet" className="w-16 h-16 rounded-lg border border-border" />
                            <span className="text-[10px] text-muted-foreground">Scanner à l'entrée</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <QrCode className="w-4 h-4" /> QR code
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Billets confirmés !'); }}
          amount={payData.amount}
          bookingType="show"
          bookingId={payData.id}
          label={`${selectedSeats.length} billet(s) — ${selectedShow?.title ?? 'Spectacle'}`}
        />
      )}
    </div>
  );
};

export default ClientSpectacles;
