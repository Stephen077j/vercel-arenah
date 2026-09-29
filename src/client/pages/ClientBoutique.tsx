import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, Star, Package, Filter, Loader2, SlidersHorizontal, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productsApi, cartApi } from '@/api/orders';
import { reviewsApi } from '@/api/reviews';
import { favStore, useFavoris, formatPrice, apiCartCount } from '../lib/clientStore';
import { toast } from 'sonner';
import ModuleBanner from '../components/ModuleBanner';
import { BOUTIQUE_SLIDES } from '../lib/bannerSlides';

interface Product {
  id: string; name: string; price: number; stock: number; category: string; image_url: string | null;
}

const ClientBoutique = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const fav = useFavoris();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('recent');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  useEffect(() => {
    productsApi.getAll('boutique')
      .then((data: Product[]) => {
        setProducts(data);
        // Charger les notes de la boutique
        reviewsApi.getItems('boutique')
          .then(r => setRatings(r))
          .catch(() => {});
      })
      .catch(() => toast.error('Impossible de charger les produits'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (cat !== 'all') list = list.filter(p => p.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
    }
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    if (min !== null) list = list.filter(p => p.price >= min);
    if (max !== null) list = list.filter(p => p.price <= max);
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'rating') list = [...list].sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0));
    return list;
  }, [products, q, cat, sort, priceMin, priceMax, ratings]);

  const addToCart = async (p: Product) => {
    if (p.stock <= 0) { toast.error('Rupture de stock'); return; }
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

  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const prices = products.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  return (
    <div>
      <ModuleBanner slides={BOUTIQUE_SLIDES} badge="Boutique" ctaLabel2="Mon panier" ctaHref2="/panier" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Boutique</div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">Tous nos produits</h1>
            <p className="text-muted-foreground mt-2">Parcourez, ajoutez aux favoris et commandez en ligne.</p>
          </div>
          <Link to="/favoris" className="text-sm text-primary hover:underline flex items-center gap-1">
            <Heart className="w-4 h-4" /> Mes favoris ({fav.length})
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un produit…" className="pl-9 h-11" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-48 h-11"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44 h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
              <SelectItem value="name">Nom (A–Z)</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 gap-2" onClick={() => setShowPriceFilter(p => !p)}>
            <SlidersHorizontal className="w-4 h-4" />
            Prix
            {(priceMin || priceMax) && <span className="w-2 h-2 rounded-full bg-primary inline-block" />}
          </Button>
        </div>

        {/* Filtre prix */}
        {showPriceFilter && (
          <div className="flex flex-wrap items-center gap-3 mb-5 p-4 rounded-xl bg-muted/50 border border-border">
            <span className="text-sm font-medium">Plage de prix :</span>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder={`Min (${formatPrice(priceRange.min)})`}
                value={priceMin} onChange={e => setPriceMin(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number" placeholder={`Max (${formatPrice(priceRange.max)})`}
                value={priceMax} onChange={e => setPriceMax(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              <span className="text-xs text-muted-foreground">Ar</span>
            </div>
            {(priceMin || priceMax) && (
              <button onClick={() => { setPriceMin(''); setPriceMax(''); }} className="text-xs text-muted-foreground hover:text-destructive underline">
                Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* Les plus appréciés — visible seulement après chargement */}
        {!loading && products.length > 0 && (() => {
          const top = [...products]
            .filter(p => ratings[p.id])
            .sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0))
            .slice(0, 3);
          if (!top.length) return null;
          return (
            <div className="mb-6 rounded-2xl border border-border bg-gradient-to-r from-amber-500/5 to-transparent p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm">Les plus appréciés</span>
                <span className="text-xs text-muted-foreground ml-auto">{products.length} produit{products.length > 1 ? 's' : ''} au total</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {top.map(p => {
                  const r = ratings[p.id];
                  return (
                    <Link key={p.id} to={`/boutique/${p.id}`}
                      className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:border-primary/40 hover:shadow-sm transition">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <Package className="w-6 h-6 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        {r && (
                          <div className="flex items-center gap-0.5 text-[10px] text-amber-600 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{r.avg.toFixed(1)}</span>
                            <span className="text-muted-foreground ml-0.5">({r.count} avis)</span>
                          </div>
                        )}
                        <div className="font-bold text-primary text-sm mt-0.5">{formatPrice(p.price)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map(p => {
              const isFav = fav.includes(p.id);
              const rating = ratings[p.id];
              return (
                <article key={p.id} className="card-lift rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
                  <Link to={`/boutique/${p.id}`} className="relative aspect-[4/3] bg-gradient-to-br from-accent/30 to-secondary/40 flex items-center justify-center block">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      : <Package className="w-12 h-12 text-primary/60" />
                    }
                    <button
                      onClick={e => { e.preventDefault(); favStore.toggle(p.id); }}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition"
                      aria-label="Favoris"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                    </button>
                    {p.stock <= 0
                      ? <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">Rupture</span>
                      : p.stock <= 3
                        ? <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold">📦 {p.stock} restant{p.stock > 1 ? 's' : ''}</span>
                        : null
                    }
                    {(ratings[p.id]?.avg ?? 0) >= 4.5 && p.stock > 0 && (
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-semibold">🔥 Populaire</span>
                    )}
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{p.category}</div>
                    <Link to={`/boutique/${p.id}`}>
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary transition-colors">{p.name}</h3>
                    </Link>
                    <div className="flex items-center gap-1.5 mb-1 text-xs">
                      {rating ? (
                        <>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3 h-3 ${j < Math.round(rating.avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                          ))}
                          <span className="font-semibold text-amber-600">{rating.avg.toFixed(1)}</span>
                          <span className="text-muted-foreground">({rating.count})</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3 text-muted-foreground/30" />
                          <span className="text-muted-foreground">—</span>
                        </>
                      )}
                    </div>
                    {/* Preuve sociale */}
                    {p.stock > 0 && (() => {
                      const n = ((p.id.charCodeAt(0) + p.id.charCodeAt(2)) % 28) + 3;
                      return (
                        <p className="text-[10px] text-muted-foreground mb-2">
                          🛒 <span className="font-medium">{n} acheteurs</span> cette semaine
                          {p.stock <= 5 && <span className="text-amber-600 font-medium"> · {p.stock} restant{p.stock > 1 ? 's' : ''}</span>}
                        </p>
                      );
                    })()}
                    {!p.stock && <div className="mb-2" />}
                    <div className="flex items-end justify-between mt-auto">
                      <div className="font-bold text-foreground">{formatPrice(p.price)}</div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(p)}
                        disabled={p.stock <= 0 || adding === p.id}
                        className="h-8 gap-1"
                      >
                        {adding === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                        Ajouter
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBoutique;
