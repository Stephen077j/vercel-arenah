import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Hotel, Users, BedDouble, Check, Calendar, Loader2, Star,
  Wifi, Tv, Wind, Car, Coffee, Waves, Utensils, Lock, Bath,
  AlertTriangle, X, ShieldCheck, CreditCard, Clock, Flame,
  ChevronLeft, ChevronRight, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { hotelApi } from '@/api/bookings';
import { formatPrice, typedFavStore } from '../lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import StarRating from '../components/StarRating';
import { toast } from 'sonner';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { HOTEL_SLIDES } from '../lib/bannerSlides';

interface Room {
  id: string; name: string; type: string; capacity: number;
  price_per_night: number; description: string | null;
  amenities: string[]; image_url: string | null; active: boolean;
}
interface HotelStats { total: number; occupied: number; free: number; rate: number; }

// Galerie multi-images par type de chambre (image principale + fallbacks)
const ROOM_GALLERY: Record<string, string[]> = {
  standard:   [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80&auto=format&fit=crop',
  ],
  superieure: [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800&q=80&auto=format&fit=crop',
  ],
  familiale:  [
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80&auto=format&fit=crop',
  ],
  suite:      [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614649024145-7f847b1af1a4?w=800&q=80&auto=format&fit=crop',
  ],
};

function RoomGallery({ room }: { room: Room }) {
  const images = room.image_url
    ? [room.image_url, ...(ROOM_GALLERY[room.type] ?? []).slice(1)]
    : (ROOM_GALLERY[room.type] ?? []);
  const [idx, setIdx] = React.useState(0);
  if (!images.length) return <BedDouble className="w-16 h-16 text-indigo-400" />;
  return (
    <div className="relative w-full h-full">
      <img src={images[idx]} alt={room.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" />
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx((idx + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
interface HotelBooking {
  id: string; room_name: string; check_in: string; check_out: string;
  nights: number; guests: number; total: number; deposit: number;
  status: string; customer_name: string | null;
}

const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

// Icônes par amenité (matching partiel insensible à la casse)
const AMENITY_ICONS: [RegExp, React.ElementType, string][] = [
  [/wifi|internet/i,    Wifi,      'Wifi'],
  [/tv|télé/i,          Tv,        'TV'],
  [/clim|air/i,         Wind,      'Climatisation'],
  [/park/i,             Car,       'Parking'],
  [/café|petit.déj/i,   Coffee,    'Petit-déjeuner'],
  [/piscin|pool/i,      Waves,     'Piscine'],
  [/restau|repas/i,     Utensils,  'Restaurant'],
  [/coffre|safe/i,      Lock,      'Coffre-fort'],
  [/baign|bain|jacuzzi/i,Bath,     'Bain/Jacuzzi'],
];

function AmenityBadge({ label }: { label: string }) {
  const found = AMENITY_ICONS.find(([re]) => re.test(label));
  const Icon = found?.[1];
  const name = found?.[2] ?? label;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      {Icon && <Icon className="w-3 h-3" />} {name}
    </span>
  );
}

const ClientHotel = () => {
  const { user } = useClientAuth();
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [avail,      setAvail]      = useState<Record<string, boolean>>({});
  const [myBookings, setMyBookings] = useState<HotelBooking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [avgRating,  setAvgRating]  = useState<number | null>(null);

  const [checkIn,  setCheckIn]  = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests,   setGuests]   = useState(2);

  const [booking,  setBooking]  = useState<Room | null>(null);
  const [name,     setName]     = useState(user?.fullname ?? '');
  const [phone,    setPhone]    = useState(user?.phone ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [placing,  setPlacing]  = useState(false);
  const [payOpen,  setPayOpen]  = useState(false);
  const [payData,  setPayData]  = useState<{ id: string; amount: number } | null>(null);

  const [cancelId,  setCancelId]  = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [hotelStats, setHotelStats] = useState<HotelStats | null>(null);
  const [, setFavV] = useState(0);

  const nights = nightsBetween(checkIn, checkOut);

  const loadMyBookings = useCallback(() =>
    hotelApi.getMyBookings().then(setMyBookings).catch(() => {}), []);

  useEffect(() => {
    Promise.all([
      hotelApi.getRooms(),
      user ? loadMyBookings() : Promise.resolve(null),
      fetch('/api/reviews/module/hotel').then(r => r.json()).catch(() => null),
      fetch('/api/bookings/hotel/stats').then(r => r.json()).catch(() => null),
    ]).then(([r, , rev, stats]) => {
      setRooms(r as Room[]);
      if (rev?.average) setAvgRating(rev.average);
      if (stats?.total) setHotelStats(stats as HotelStats);
    }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [user, loadMyBookings]);

  // Batch availability — 1 seul appel
  useEffect(() => {
    if (!rooms.length || !checkIn || !checkOut || nights <= 0) return;
    hotelApi.availBatch(checkIn, checkOut).then((data: Record<string, boolean>) => {
      const filtered: Record<string, boolean> = {};
      for (const [id, ok] of Object.entries(data)) {
        const room = rooms.find(r => r.id === id);
        filtered[id] = ok && !!room && room.capacity >= guests;
      }
      setAvail(filtered);
    }).catch(() => {});
  }, [rooms, checkIn, checkOut, guests, nights]);

  const confirm = async () => {
    if (!booking || !name || !phone || nights <= 0) { toast.error('Remplissez tous les champs'); return; }
    setPlacing(true);
    try {
      const res = await hotelApi.book({
        room_id: booking.id, check_in: checkIn, check_out: checkOut,
        guests, customer_name: name, customer_phone: phone, customer_email: email,
      });
      const deposit = Math.round(booking.price_per_night * nights * 0.3);
      setBooking(null);
      setPayData({ id: (res as { id: string }).id, amount: deposit });
      setPayOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally { setPlacing(false); }
  };

  const doCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await hotelApi.cancel(cancelId);
      toast.success('Réservation annulée');
      setCancelId(null);
      loadMyBookings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setCancelling(false); }
  };

  const displayRooms = useMemo(
    () => rooms.map(r => ({ ...r, isAvail: avail[r.id] ?? true })),
    [rooms, avail]
  );

  const STATUS_STYLES: Record<string, string> = {
    confirme: 'bg-emerald-500/15 text-emerald-700',
    annule:   'bg-red-500/15 text-red-700',
    pending:  'bg-amber-500/15 text-amber-700',
  };

  return (
    <div>
      <ModuleBanner slides={HOTEL_SLIDES} badge="Hôtel" ctaLabel="Voir les chambres" ctaHref="#chambres" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Hôtel</div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">Réservez votre séjour</h1>
            <p className="text-muted-foreground mt-2">Vérifiez les disponibilités et réservez en ligne.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { icon: ShieldCheck, label: 'Tarif direct garanti', color: 'text-emerald-600' },
                { icon: CreditCard,  label: 'Paiement sécurisé',   color: 'text-primary'     },
                { icon: Clock,       label: 'Annulation flexible',  color: 'text-amber-600'   },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                  <t.icon className={`w-3.5 h-3.5 ${t.color}`} /> {t.label}
                </div>
              ))}
            </div>
          </div>
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
              ))}
              <span className="text-sm font-semibold text-amber-700 ml-1">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <Tabs defaultValue="book" id="chambres">
          <TabsList className="mb-6">
            <TabsTrigger value="book">Réserver une chambre</TabsTrigger>
            {user && <TabsTrigger value="my">Mes réservations ({myBookings.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="book">
            {/* Search bar */}
            <div className="rounded-2xl border border-border bg-card p-5 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Arrivée</Label>
                <Input type="date" value={checkIn} min={today} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Départ</Label>
                <Input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Personnes</Label>
                <Input type="number" min={1} value={guests} onChange={e => setGuests(+e.target.value)} />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  {nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : 'Choisissez vos dates'}
                </div>
              </div>
            </div>

            {/* Bannière occupation temps réel */}
            {hotelStats && (
              <div className={`flex items-center gap-4 rounded-xl px-4 py-3 mb-6 border ${
                hotelStats.rate >= 80
                  ? 'bg-red-500/8 border-red-500/20'
                  : hotelStats.rate >= 50
                    ? 'bg-amber-500/8 border-amber-500/20'
                    : 'bg-emerald-500/8 border-emerald-500/20'
              }`}>
                <BedDouble className={`w-5 h-5 shrink-0 ${hotelStats.rate >= 80 ? 'text-red-500' : hotelStats.rate >= 50 ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {hotelStats.free > 0 ? `${hotelStats.free} chambre${hotelStats.free > 1 ? 's' : ''} disponible${hotelStats.free > 1 ? 's' : ''}` : 'Aucune chambre disponible ce soir'}
                    </span>
                    {hotelStats.rate >= 75 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                        <Flame className="w-3 h-3" /> Demande élevée
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        hotelStats.rate >= 80 ? 'bg-red-500' : hotelStats.rate >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${hotelStats.rate}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Taux d'occupation : {hotelStats.rate}%</span>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayRooms.map(r => (
                  <article key={r.id} className="card-lift rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="aspect-[16/9] bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center relative overflow-hidden">
                      <RoomGallery room={r} />
                      {!r.isAvail && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">Indisponible ces dates</span>
                        </div>
                      )}
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-card/90 text-xs font-medium capitalize">{r.type}</span>
                      {r.isAvail && hotelStats && hotelStats.free <= 3 && hotelStats.free > 0 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                          🔥 Il reste {hotelStats.free} chambre{hotelStats.free > 1 ? 's' : ''} !
                        </span>
                      )}
                      {r.isAvail && hotelStats && hotelStats.free > 3 && hotelStats.rate >= 70 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                          ⚡ Forte demande
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Hotel className="w-4 h-4 text-primary" /> {r.name}
                        </h3>
                        <div className="text-right">
                          <div className="font-bold">{formatPrice(r.price_per_night)}</div>
                          <div className="text-xs text-muted-foreground">/ nuit</div>
                        </div>
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(r.amenities || []).map(a => <AmenityBadge key={a} label={a} />)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" /> Jusqu'à {r.capacity} pers.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { typedFavStore.toggle({ type: 'hotel', id: r.id, label: r.name, sub: `${formatPrice(r.price_per_night)} / nuit`, img: r.image_url ?? undefined, path: '/hotel' }); setFavV(v => v + 1); }}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-50 transition shrink-0">
                            <Heart className={`w-4 h-4 ${typedFavStore.has('hotel', r.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                          </button>
                          <Button size="sm" disabled={!r.isAvail || nights <= 0} onClick={() => setBooking(r)}>
                            Réserver — {nights > 0 ? formatPrice(r.price_per_night * nights) : '…'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="my" className="mt-2 space-y-4">
              {myBookings.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                  <Hotel className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucune réservation pour le moment.</p>
                </div>
              ) : myBookings.map(b => (
                <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-primary" /> {b.room_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Du {b.check_in} au {b.check_out} · {b.nights} nuit(s) · {b.guests} pers.
                      </div>
                      {b.customer_name && <div className="text-xs text-muted-foreground">{b.customer_name}</div>}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="font-bold">{formatPrice(b.total)}</div>
                      <div className="text-xs text-primary">Acompte : {formatPrice(b.deposit)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {b.status}
                      </span>
                      {b.status !== 'annule' && (
                        <button
                          onClick={() => setCancelId(b.id)}
                          className="text-xs text-destructive hover:underline flex items-center gap-1 mt-1">
                          <X className="w-3 h-3" /> Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          )}
        </Tabs>

        {/* Booking dialog */}
        <Dialog open={!!booking} onOpenChange={o => !o && setBooking(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Réservation — {booking?.name}</DialogTitle></DialogHeader>
            {booking && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Du {checkIn} au {checkOut}</span><span>{nights} nuit(s)</span></div>
                  <div className="flex justify-between"><span>Personnes</span><span>{guests}</span></div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                    <span>Total</span><span>{formatPrice(booking.price_per_night * nights)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Acompte (30%)</span><span>{formatPrice(Math.round(booking.price_per_night * nights * 0.3))}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2"><Label>Nom complet</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Email (facture)</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                </div>
                <Button onClick={confirm} disabled={placing} className="w-full gap-2">
                  {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmer la réservation
                </Button>
                <p className="text-xs text-muted-foreground text-center">Un email de confirmation vous sera envoyé.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm cancel dialog */}
        <Dialog open={!!cancelId} onOpenChange={o => !o && setCancelId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Annuler la réservation</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Cette action est irréversible. Confirmer l'annulation ?</p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelId(null)}>Non, garder</Button>
              <Button variant="destructive" className="flex-1" disabled={cancelling} onClick={doCancel}>
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Oui, annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Avis clients */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 mb-10">
        <h2 className="font-display text-xl mb-4">Avis clients</h2>
        <StarRating module="hotel" />
      </div>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Réservation hôtel confirmée !'); loadMyBookings(); }}
          amount={payData.amount}
          bookingType="hotel"
          bookingId={payData.id}
          label={`Acompte 30% — ${booking?.name ?? 'Chambre'}`}
        />
      )}
    </div>
  );
};

export default ClientHotel;
