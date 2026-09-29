import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, CreditCard, Loader2, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cartApi, ordersApi } from '@/api/orders';
import { formatPrice, apiCartCount } from '../lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import { toast } from 'sonner';
import PaymentModal from '@/client/components/PaymentModal';

interface CartItem {
  id: string;
  quantity: number;
  note: string | null;
  product_id: string;
  name: string;
  price: number;
  module: string;
  stock: number;
}

type DeliveryMode = 'livraison' | 'retrait' | 'sur_place';

const ClientCart = () => {
  const { user } = useClientAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [orderId, setOrderId]   = useState<string | null>(null);

  const [name, setName] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('');
  const [mode, setMode] = useState<DeliveryMode>('livraison');
  const [notes, setNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number; description: string } | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const data: CartItem[] = await cartApi.getCart();
      setItems(data);
      apiCartCount.set(data.reduce((s, i) => s + i.quantity, 0));
    } catch {
      toast.error('Impossible de charger le panier');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discount = promoApplied?.discount ?? 0;
  const finalTotal = Math.max(0, total - discount);
  const hasRestaurant = items.some(i => i.module === 'restaurant');

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const token = localStorage.getItem('arenah_token');
      const module = items.some(i => i.module === 'restaurant') ? 'restaurant' : 'boutique';
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: promoInput.trim(), amount: total, module }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || 'Code invalide ou expiré');
      } else {
        setPromoApplied({ code: promoInput.trim().toUpperCase(), discount: data.discount, description: data.description });
        setPromoInput('');
      }
    } catch {
      setPromoError('Erreur réseau');
    } finally {
      setPromoLoading(false);
    }
  };

  const updateQty = async (item: CartItem, newQty: number) => {
    if (newQty <= 0) {
      await removeItem(item);
      return;
    }
    try {
      await cartApi.updateItem(item.id, newQty);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
      apiCartCount.set(items.reduce((s, i) => s + (i.id === item.id ? newQty : i.quantity), 0));
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const removeItem = async (item: CartItem) => {
    try {
      await cartApi.removeItem(item.id);
      const next = items.filter(i => i.id !== item.id);
      setItems(next);
      apiCartCount.set(next.reduce((s, i) => s + i.quantity, 0));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Étape 1 : créer la commande → ouvrir le PaymentModal
  const checkout = async () => {
    if (!name || !phone) { toast.error('Nom et téléphone requis'); return; }
    if (mode === 'livraison' && !address) { toast.error('Adresse de livraison requise'); return; }
    setPlacing(true);
    try {
      const order = await ordersApi.create({
        module: items.some(i => i.module === 'restaurant') ? 'restaurant' : 'boutique',
        type:   items.some(i => i.module === 'restaurant') ? 'restaurant' : 'boutique',
        mode,
        items: items.map(i => ({
          product_id: i.product_id,
          name:       i.name,
          price:      i.price,
          quantity:   i.quantity,
          note:       i.note ?? undefined,
        })),
        address:         mode === 'livraison' ? address : undefined,
        notes: [notes, pickupTime ? `Retrait à ${pickupTime}` : ''].filter(Boolean).join(' — ') || undefined,
        customer_name:   name,
        customer_phone:  phone,
        promo_code:      promoApplied?.code,
      });
      setOrderId(order.id);
      setPayOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la commande');
    } finally {
      setPlacing(false);
    }
  };

  // Étape 2 : paiement validé → vider panier + rediriger
  const handlePaySuccess = () => {
    setItems([]);
    apiCartCount.set(0);
    setPayOpen(false);
    toast.success('Commande & paiement confirmés !');
    nav('/mes-commandes');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-display text-3xl mb-3">Votre panier est vide</h1>
        <p className="text-muted-foreground mb-6">Découvrez nos produits et services.</p>
        <div className="flex gap-2 justify-center">
          <Button asChild><Link to="/boutique">Voir la boutique</Link></Button>
          <Button asChild variant="outline"><Link to="/restaurant">Voir le menu</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-4xl mb-8">Mon panier</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.module}</div>
                <div className="font-semibold truncate">{item.name}</div>
                {item.note && <div className="text-xs text-muted-foreground italic">Note: {item.note}</div>}
                <div className="text-sm text-muted-foreground">{formatPrice(item.price)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item, item.quantity - 1)}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="font-bold w-28 text-right">{formatPrice(item.quantity * item.price)}</div>
              <Button size="icon" variant="ghost" onClick={() => removeItem(item)} className="hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 h-fit sticky top-24 space-y-4">
          <h2 className="font-semibold text-lg">Validation</h2>

          <div className="space-y-2">
            <Label>Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as DeliveryMode)}>
              <div className="flex items-center gap-2"><RadioGroupItem value="livraison" id="m1" /><Label htmlFor="m1" className="cursor-pointer">Livraison</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="retrait" id="m2" /><Label htmlFor="m2" className="cursor-pointer">Retrait</Label></div>
              {hasRestaurant && <div className="flex items-center gap-2"><RadioGroupItem value="sur_place" id="m3" /><Label htmlFor="m3" className="cursor-pointer">Sur place</Label></div>}
            </RadioGroup>
          </div>

          <div className="space-y-1"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          {mode === 'livraison' && <div className="space-y-1"><Label>Adresse</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Quartier, rue…" /></div>}
          {mode === 'retrait' && hasRestaurant && (
            <div className="space-y-1">
              <Label>Heure de retrait souhaitée</Label>
              <Input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
              <p className="text-xs text-muted-foreground">Prêt en 15–20 min après commande</p>
            </div>
          )}
          <div className="space-y-1"><Label>Notes (optionnel)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

          {/* Code promo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Code promo</Label>
            {promoApplied ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{promoApplied.code}</p>
                    <p className="text-[10px] text-muted-foreground">{promoApplied.description}</p>
                  </div>
                </div>
                <button onClick={() => setPromoApplied(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                  onKeyDown={e => e.key === 'Enter' && validatePromo()}
                  placeholder="Ex: BIENVENUE20"
                  className="font-mono text-xs tracking-widest"
                />
                <Button size="sm" variant="outline" onClick={validatePromo} disabled={promoLoading || !promoInput.trim()}>
                  {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{formatPrice(total)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Remise ({promoApplied?.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-foreground"><span>Total</span><span>{formatPrice(finalTotal)}</span></div>
            {finalTotal > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                <span>Points fidélité</span>
                <span className="font-medium" style={{ color: '#d4a843' }}>+{Math.floor(finalTotal / 100)} pts ⭐</span>
              </div>
            )}
          </div>

          <Button onClick={checkout} disabled={placing} className="w-full gap-2">
            {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {placing ? 'Préparation…' : 'Choisir le paiement'}
            {!placing && <ArrowRight className="w-4 h-4" />}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            MVola · Orange Money · Airtel · Espèces · Carte
          </p>
        </div>
      </div>

      {orderId && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={handlePaySuccess}
          amount={finalTotal}
          bookingType="order"
          bookingId={orderId}
          label={`Commande — ${items.length} article${items.length > 1 ? 's' : ''}`}
        />
      )}
    </div>
  );
};

export default ClientCart;
