import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
const RestaurantFloorPlan = lazy(() => import('../components/RestaurantFloorPlan'));
import { useNavigate } from 'react-router-dom';
import { Search, UtensilsCrossed, Loader2, Plus, Tag, Package, Flame, Clock, AlertCircle, Star, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { productsApi, cartApi } from '@/api/orders';
import { restaurantReservationApi } from '@/api/bookings';
import { promosApi } from '@/api/promos';
import { formatPrice, apiCartCount } from '../lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import { toast } from 'sonner';
import ModuleBanner from '../components/ModuleBanner';
import { RESTAURANT_SLIDES, getDishImage } from '../lib/bannerSlides';

interface Product { id: string; name: string; description: string | null; price: number; category: string; stock: number; image_url: string | null; }
interface ActivePromo { code: string; type: string; value: number; label: string; }
interface Reservation { id: string; date: string; time: string; guests: number; status: string; notes: string | null; }

const ClientRestaurant = () => {
  const { user } = useClientAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [promos, setPromos] = useState<ActivePromo[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);

  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [vegeOnly, setVegeOnly]   = useState(false);
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});

  const [resOpen, setResOpen] = useState(false);
  const [resName, setResName] = useState(user?.fullname ?? '');
  const [resPhone, setResPhone] = useState(user?.phone ?? '');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resGuests, setResGuests] = useState(2);
  const [resNotes, setResNotes] = useState('');
  const [resSaving, setResSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      productsApi.getAll('restaurant'),
      promosApi.getPublic('restaurant').catch(() => [] as ActivePromo[]),
      fetch('/api/products/today-orders?module=restaurant').then(r => r.json()).catch(() => ({})),
    ]).then(([data, p, counts]) => {
      setProducts(data as Product[]);
      setPromos(p as ActivePromo[]);
      setTodayCounts(counts as Record<string, number>);
    }).catch(() => toast.error('Impossible de charger le menu'))
      .finally(() => setLoading(false));
    if (user) {
      restaurantReservationApi.getMyReservations()
        .then(r => setMyReservations(r as Reservation[])).catch(() => {});
    }
  }, [user]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  // Plat du jour = plat le plus commandé aujourd'hui, sinon premier "Plats"
  const platDuJour = useMemo(() => {
    const topId = Object.entries(todayCounts).sort(([,a],[,b]) => b - a)[0]?.[0];
    if (topId) {
      const found = products.find(p => p.id === topId && p.category === 'Plats');
      if (found) return found;
    }
    return products.find(p => p.category === 'Plats') ?? null;
  }, [products, todayCounts]);

  // Estimation délai livraison selon heure
  const deliveryEstimate = useMemo(() => {
    const h = new Date().getHours();
    if ((h >= 11 && h < 14) || (h >= 18 && h < 21)) return '40–60 min'; // Rush
    return '20–35 min';
  }, []);

  const VEGE_KEYWORDS = ['végé', 'vege', 'salade', 'riz', 'légume', 'fruit', 'tofu', 'champignon', 'quinoa', 'avocat', 'soupe légume'];
  const isVege = (name: string) => VEGE_KEYWORDS.some(k => name.toLowerCase().includes(k));

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== 'all') list = list.filter(p => p.category === activeCat);
    if (vegeOnly) list = list.filter(p => isVege(p.name));
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s));
    }
    return list;
  }, [products, activeCat, vegeOnly, q]);

  const quickAdd = async (p: Product) => {
    setAdding(p.id);
    try {
      await cartApi.addItem(p.id, 1);
      apiCartCount.inc();
      toast.success(`${p.name} ajouté au panier`, {
        action: { label: 'Voir le panier', onClick: () => navigate('/panier') },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau');
    } finally { setAdding(null); }
  };

  const submitReservation = async () => {
    if (!resName || !resPhone || !resDate || !resTime || resGuests <= 0) {
      toast.error('Remplissez tous les champs'); return;
    }
    if (!user) { toast.error('Connectez-vous pour réserver'); return; }
    setResSaving(true);
    try {
      await restaurantReservationApi.make({
        customer_name: resName, customer_phone: resPhone,
        date: resDate, time: resTime, guests: resGuests, notes: resNotes || undefined,
      });
      toast.success('Table réservée ! Confirmation par téléphone sous 30 min.');
      const updated = await restaurantReservationApi.getMyReservations();
      setMyReservations(updated as Reservation[]);
      setResOpen(false);
      setResName(''); setResPhone(''); setResDate(''); setResTime(''); setResGuests(2); setResNotes('');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setResSaving(false); }
  };

  const cancelReservation = async (id: string) => {
    try {
      await restaurantReservationApi.cancel(id);
      toast.success('Réservation annulée');
      setMyReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
    } catch { toast.error('Erreur d\'annulation'); }
  };

  return (
    <div>
      <ModuleBanner
        slides={RESTAURANT_SLIDES}
        badge="Restaurant"
        ctaLabel="Réserver une table"
        onCtaClick={() => setResOpen(true)}
        ctaLabel2="Mon panier"
        ctaHref2="/panier"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <Tabs defaultValue="menu">
          <TabsList>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="plan">🗺️ Plan de table</TabsTrigger>
            <TabsTrigger value="info">Livraison / Retrait</TabsTrigger>
            {user && <TabsTrigger value="mes">Mes réservations ({myReservations.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="plan" className="mt-6">
            <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"/></div>}>
              <RestaurantFloorPlan />
            </Suspense>
          </TabsContent>

          <TabsContent value="menu" className="mt-6">
            {/* Plat du jour */}
            {!loading && platDuJour && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 mb-8 flex gap-4 items-center">
                <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-orange-100 shadow-md">
                  <img src={platDuJour.image_url ?? getDishImage(platDuJour.name)} alt={platDuJour.name}
                    className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.15em]">Plat du jour</span>
                  </div>
                  <h3 className="font-semibold text-base leading-tight truncate">{platDuJour.name}</h3>
                  {platDuJour.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{platDuJour.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-bold text-primary">{formatPrice(platDuJour.price)}</span>
                    {(todayCounts[platDuJour.id] ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-700 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                        <Flame className="w-3 h-3" /> {todayCounts[platDuJour.id]}× commandé ce soir
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => quickAdd(platDuJour)}
                  disabled={adding === platDuJour.id || platDuJour.stock <= 0}
                  className="shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                >
                  {adding === platDuJour.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Bannière promos actives */}
            {promos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {promos.map(p => (
                  <div key={p.code} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                    <Tag className="w-3 h-3" />
                    Code <span className="font-mono bg-primary/10 px-1 rounded">{p.code}</span> : {p.label}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un plat…" className="pl-9 h-11" />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
              {['all', ...categories].map(c => (
                <button key={c} onClick={() => setActiveCat(c)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition border ${
                    activeCat === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {c === 'all' ? 'Tout' : c}
                </button>
              ))}
              <button onClick={() => setVegeOnly(v => !v)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition border ${
                  vegeOnly
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}>
                <Leaf className="w-3.5 h-3.5" /> Végétarien
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-2xl">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun plat trouvé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {filtered.map((p, idx) => {
                  const promo = promos.length > 0 ? promos[idx % promos.length] : null;
                  return (
                    <article key={p.id} className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="relative w-full aspect-square bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={p.image_url ?? getDishImage(p.name)}
                          alt={p.name}
                          className="w-4/5 h-4/5 object-cover rounded-full shadow-md transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        {promo && (
                          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow">
                            {promo.label}
                          </span>
                        )}
                        {p.stock > 0 && p.stock <= 5 && (
                          <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold shadow">
                            Plus que {p.stock} !
                          </span>
                        )}
                        {(todayCounts[p.id] ?? 0) > 0 && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-medium backdrop-blur-sm">
                            <Flame className="w-2.5 h-2.5 text-orange-400" /> {todayCounts[p.id]}× ce soir
                          </div>
                        )}
                        {p.stock <= 0 && (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold uppercase rounded-2xl">Épuisé</span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <h3 className="font-semibold text-sm text-foreground leading-tight mb-1 line-clamp-2">{p.name}</h3>
                        <div className="text-[10px] text-muted-foreground mb-3">{p.category}</div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-base text-primary">{formatPrice(p.price)}</span>
                          <button
                            onClick={() => quickAdd(p)}
                            disabled={adding === p.id || p.stock <= 0}
                            className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                            aria-label={`Ajouter ${p.name}`}
                          >
                            {adding === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Livraison à domicile</h3>
                </div>
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-700">Délai estimé maintenant</div>
                    <div className="text-sm font-bold text-amber-800">{deliveryEstimate}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Commandez depuis le menu, ajoutez au panier et choisissez "Livraison". Suivez l'avancement en temps réel depuis « Mes commandes ».</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">Retrait sur place</h3>
                </div>
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">Prêt en</div>
                    <div className="text-sm font-bold text-emerald-800">15–20 min</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Commandez, choisissez "Retrait" dans le panier et sélectionnez votre heure. Votre commande vous attend à la caisse sans attente.</p>
              </div>
            </div>
            {/* Horaires */}
            <div className="mt-5 rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horaires du restaurant</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Petit-déjeuner', hours: '07h00 – 10h30' },
                  { label: 'Déjeuner',       hours: '11h30 – 14h30' },
                  { label: 'Dîner',          hours: '18h00 – 22h00' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-muted">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="font-semibold text-sm mt-0.5">{s.hours}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {user && (
            <TabsContent value="mes" className="mt-6">
              {myReservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3" />
                  Aucune réservation. <button onClick={() => setResOpen(true)} className="text-primary underline">Réserver une table</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myReservations.map(r => (
                    <div key={r.id} className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{r.date} à {r.time}</div>
                        <div className="text-sm text-muted-foreground">{r.guests} personne{r.guests > 1 ? 's' : ''}{r.notes ? ` — ${r.notes}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                          r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700' :
                          'bg-amber-500/10 text-amber-700'
                        }`}>
                          {r.status === 'cancelled' ? 'Annulée' : r.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                        </span>
                        {r.status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => cancelReservation(r.id)}>Annuler</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog réservation */}
        <Dialog open={resOpen} onOpenChange={setResOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Réserver une table</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Nom</Label><Input value={resName} onChange={e => setResName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Téléphone</Label><Input value={resPhone} onChange={e => setResPhone(e.target.value)} /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={resDate} onChange={e => setResDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
                <div className="space-y-1"><Label>Heure</Label><Input type="time" value={resTime} onChange={e => setResTime(e.target.value)} /></div>
                <div className="space-y-1 col-span-2"><Label>Nombre de convives</Label><Input type="number" min={1} max={50} value={resGuests} onChange={e => setResGuests(+e.target.value)} /></div>
                <div className="space-y-1 col-span-2"><Label>Notes (optionnel)</Label><Textarea value={resNotes} onChange={e => setResNotes(e.target.value)} rows={3} placeholder="Allergie, occasion spéciale…" /></div>
              </div>
              {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">Connectez-vous pour réserver.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResOpen(false)}>Annuler</Button>
              <Button onClick={submitReservation} disabled={resSaving || !user}>
                {resSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ClientRestaurant;
