import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Package, Loader2, ExternalLink, Trash2, Hotel, Ticket, Scissors, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { productsApi, cartApi } from '@/api/orders';
import { useFavoris, favStore, formatPrice, typedFavStore, TypedFav } from '../lib/clientStore';
import { toast } from 'sonner';
import { apiCartCount } from '../lib/clientStore';

interface Product { id: string; name: string; price: number; stock: number; category: string; image_url: string | null; }

const TYPE_LABELS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  boutique:  { icon: <ShoppingBag className="w-4 h-4" />, color: '#3b82f6', label: 'Boutique' },
  hotel:     { icon: <Hotel className="w-4 h-4" />,       color: '#6366f1', label: 'Hôtel' },
  show:      { icon: <Ticket className="w-4 h-4" />,      color: '#e879f9', label: 'Spectacle' },
  salon:     { icon: <Scissors className="w-4 h-4" />,    color: '#f43f5e', label: 'Salon' },
  gym:       { icon: <Dumbbell className="w-4 h-4" />,    color: '#10b981', label: 'Gym' },
  restaurant:{ icon: <Package className="w-4 h-4" />,     color: '#f59e0b', label: 'Restaurant' },
};

const ClientFavoris = () => {
  const navigate = useNavigate();
  const favIds = useFavoris();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [typedFavs, setTypedFavs] = useState<TypedFav[]>(typedFavStore.get);

  useEffect(() => {
    productsApi.getAll()
      .then((data: unknown) => setAllProducts(data as Product[]))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  // écouter les changements locaux dans typedFavStore
  useEffect(() => {
    const interval = setInterval(() => setTypedFavs(typedFavStore.get()), 500);
    return () => clearInterval(interval);
  }, []);

  const productItems = allProducts.filter(p => favIds.includes(p.id));

  const addToCart = async (p: Product) => {
    if (p.stock <= 0) { toast.error('Rupture de stock'); return; }
    setAdding(p.id);
    try {
      await cartApi.addItem(p.id, 1);
      apiCartCount.set(apiCartCount.get() + 1);
      toast.success(`${p.name} ajouté au panier`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setAdding(null); }
  };

  const totalCount = productItems.length + typedFavs.length;

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-4xl">Mes favoris</h1>
          {totalCount > 0 && (
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{totalCount}</span>
          )}
        </div>
        <p className="text-muted-foreground mb-8">
          {totalCount > 0
            ? `${productItems.length} produit${productItems.length > 1 ? 's' : ''}${typedFavs.length > 0 ? ` · ${typedFavs.length} service${typedFavs.length > 1 ? 's' : ''}` : ''} sauvegardé${totalCount > 1 ? 's' : ''}`
            : 'Aucun favori pour le moment — cliquez sur ♡ dans n\'importe quel module'
          }
        </p>

        {totalCount === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-4">Sauvegardez vos produits, chambres, spectacles préférés</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/boutique">Boutique</Link></Button>
              <Button asChild variant="outline"><Link to="/hotel">Hôtel</Link></Button>
              <Button asChild variant="outline"><Link to="/spectacles">Spectacles</Link></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Produits boutique */}
            {productItems.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Produits</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productItems.map(p => (
                    <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col group">
                      <div className="aspect-square bg-gradient-to-br from-accent/30 to-secondary/30 flex items-center justify-center relative overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          : <Package className="w-10 h-10 text-primary/40" />
                        }
                        {p.stock <= 0 && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <span className="text-xs font-semibold text-destructive">Rupture</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{p.category}</div>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1 flex-1">{p.name}</h3>
                        <div className="font-bold text-sm mb-2">{formatPrice(p.price)}</div>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="flex-1 gap-1 text-xs" disabled={adding === p.id || p.stock <= 0} onClick={() => addToCart(p)}>
                            {adding === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                            Panier
                          </Button>
                          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0"
                            onClick={() => { favStore.toggle(p.id); toast.success('Retiré des favoris'); }}>
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Favoris multi-module */}
            {typedFavs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Services & Expériences</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {typedFavs.map((fav, i) => {
                    const meta = TYPE_LABELS[fav.type] ?? { icon: <Package className="w-4 h-4" />, color: '#6b7280', label: fav.type };
                    return (
                      <motion.div key={`${fav.type}:${fav.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 group hover:shadow-md transition-all">
                        {fav.img ? (
                          <img src={fav.img} alt={fav.label} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
                            <span style={{ color: meta.color }}>{meta.icon}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${meta.color}18`, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="font-semibold text-sm truncate">{fav.label}</p>
                          {fav.sub && <p className="text-xs text-muted-foreground truncate">{fav.sub}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => navigate(fav.path)}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition">
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => { typedFavStore.remove(fav.type, fav.id); setTypedFavs(typedFavStore.get()); toast.success('Retiré des favoris'); }}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition text-muted-foreground">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClientFavoris;
