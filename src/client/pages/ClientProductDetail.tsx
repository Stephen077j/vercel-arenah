import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package, ShoppingBag, Heart, ArrowLeft, Star,
  CheckCircle2, AlertCircle, Loader2, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { productsApi, cartApi } from '@/api/orders';
import { favStore, useFavoris, formatPrice, apiCartCount } from '../lib/clientStore';
import { toast } from 'sonner';

interface Product {
  id: string;
  module: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  image_url: string | null;
  active: boolean;
}

export default function ClientProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const favIds = useFavoris();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    productsApi.getById(id)
      .then((p: Product) => setProduct(p))
      .catch(() => toast.error('Produit introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = async () => {
    if (!product || product.stock <= 0) return;
    setAdding(true);
    try {
      await cartApi.addItem(product.id, qty);
      apiCartCount.set(apiCartCount.get() + qty);
      toast.success(`${product.name} ajouté au panier`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAdding(false);
    }
  };

  const isFav = product ? favIds.includes(product.id) : false;

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!product) return (
    <div className="text-center py-32">
      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">Produit introuvable</p>
      <Button asChild><Link to="/boutique">Retour à la boutique</Link></Button>
    </div>
  );

  const inStock = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
        <span>/</span>
        <Link to="/boutique" className="hover:text-foreground transition-colors">Boutique</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="aspect-square rounded-2xl border border-border bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center overflow-hidden relative">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            : <Package className="w-24 h-24 text-primary/30" />
          }
          {!inStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground font-semibold">
                Rupture de stock
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex flex-col">
          {/* Catégorie + badges */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {product.category}
            </span>
            <Badge variant="outline" className="text-[10px] capitalize">{product.module}</Badge>
          </div>

          {/* Nom */}
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">{product.name}</h1>

          {/* Étoiles fictives */}
          <div className="flex items-center gap-1.5 mb-4">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-sm text-muted-foreground ml-1">5.0 · ARENAH</span>
          </div>

          {/* Prix */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-4xl font-bold">{formatPrice(product.price)}</span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground leading-relaxed mb-5">{product.description}</p>
          )}

          {/* Stock status */}
          <div className={`flex items-center gap-2 text-sm mb-5 ${
            !inStock ? 'text-destructive' : lowStock ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {inStock
              ? <CheckCircle2 className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />
            }
            {!inStock ? 'Rupture de stock'
              : lowStock ? `Plus que ${product.stock} en stock`
              : 'En stock — livraison/retrait disponible'}
          </div>

          {/* Quantité */}
          {inStock && (
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-muted-foreground">Quantité</span>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                >−</button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                >+</button>
              </div>
              <span className="text-sm text-muted-foreground">{product.stock} disponible(s)</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button
              size="lg"
              className="flex-1 gap-2 h-12"
              onClick={addToCart}
              disabled={adding || !inStock}
            >
              {adding
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ShoppingBag className="w-5 h-5" />
              }
              {inStock ? `Ajouter au panier · ${formatPrice(product.price * qty)}` : 'Indisponible'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 shrink-0"
              onClick={() => {
                favStore.toggle(product.id);
                toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris');
              }}
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 shrink-0"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success('Lien copié');
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Voir panier */}
          {inStock && (
            <Button variant="ghost" asChild className="w-full">
              <Link to="/panier">Voir le panier →</Link>
            </Button>
          )}

          {/* Garanties */}
          <div className="mt-6 pt-5 border-t border-border space-y-2">
            {[
              '✓ Produit authentique ARENAH IVATO',
              '✓ Retrait sur place ou livraison Antananarivo',
              '✓ Paiement sécurisé MVola · Orange · Airtel',
            ].map(g => (
              <p key={g} className="text-xs text-muted-foreground">{g}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Retour */}
      <div className="mt-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
      </div>
    </div>
  );
}
