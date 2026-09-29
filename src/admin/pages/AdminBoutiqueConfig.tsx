import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Product { id: string; name: string; description: string|null; price: number; category: string|null; stock: number; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminBoutiqueConfig() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string|null>(null);
  const [saving, setSaving]   = useState(false);

  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [price, setPrice]       = useState(0);
  const [category, setCategory] = useState('');
  const [stock, setStock]       = useState(0);
  const [newCat, setNewCat]     = useState('');

  const load = async () => {
    setLoading(true);
    const [prodData, catData] = await Promise.all([api('GET','/boutique/products'), api('GET','/boutique/categories')]);
    setProducts(Array.isArray(prodData) ? prodData : []);
    setCategories(Array.isArray(catData) ? catData : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setName(''); setDesc(''); setPrice(0); setCategory(''); setStock(0); setNewCat(''); setEditId(null); setShowForm(false); };

  const startEdit = (p: Product) => {
    setName(p.name); setDesc(p.description??''); setPrice(p.price); setCategory(p.category??''); setStock(p.stock);
    setEditId(p.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || price <= 0) { toast.error('Nom et prix requis'); return; }
    const cat = newCat.trim() || category;
    setSaving(true);
    try {
      const body = { name, description: desc||null, price, category: cat||null, stock };
      const res = editId
        ? await api('PUT', `/boutique/products/${editId}`, { ...body, active: true })
        : await api('POST', '/boutique/products', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Produit mis à jour' : 'Produit ajouté');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (p: Product) => {
    await api('PUT', `/boutique/products/${p.id}`, { name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock, active: !p.active });
    toast.success(p.active ? 'Produit désactivé' : 'Produit activé'); load();
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Désactiver le produit "${p.name}" ?`)) return;
    await api('DELETE', `/boutique/products/${p.id}`);
    toast.success('Produit désactivé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-violet-400"/>Catalogue Boutique</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{products.filter(p=>p.active).length} produit(s) actif(s) · {categories.length} catégorie(s)</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4"/> Nouveau produit
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold">{editId ? 'Modifier le produit' : 'Nouveau produit'}</h3>

          <div className="space-y-1">
            <Label>Nom du produit</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: T-shirt Arenah, Bouteille isotherme…" className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Description (optionnel)</Label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Description du produit…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prix (Ar)</Label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} step={500} className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Stock</Label>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setStock(n => Math.max(0,n-1))}>-</Button>
                <Input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} min={0} className="h-9 text-center"/>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setStock(n => n+1)}>+</Button>
              </div>
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <Label>Catégorie</Label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.map(c => (
                  <button key={c} onClick={() => { setCategory(c); setNewCat(''); }}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={{ borderColor: category===c && !newCat ? '#a78bfa' : 'hsl(var(--border))', background: category===c && !newCat ? '#a78bfa22' : undefined, color: category===c && !newCat ? '#a78bfa' : undefined }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newCat} onChange={e => { setNewCat(e.target.value); if (e.target.value) setCategory(''); }}
                placeholder="Ou créer une nouvelle catégorie…" className="h-8 text-xs"/>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background:'#a78bfa' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : `Ajouter · ${price.toLocaleString()} Ar`}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="h-8 pl-9 text-sm"/>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterCat('')}
            className="px-2.5 py-1 text-xs rounded-full border transition-all"
            style={{ borderColor: !filterCat ? '#a78bfa' : 'hsl(var(--border))', background: !filterCat ? '#a78bfa22' : undefined, color: !filterCat ? '#a78bfa' : undefined }}>
            Tout ({products.length})
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="px-2.5 py-1 text-xs rounded-full border transition-all"
              style={{ borderColor: filterCat===c ? '#a78bfa' : 'hsl(var(--border))', background: filterCat===c ? '#a78bfa22' : undefined, color: filterCat===c ? '#a78bfa' : undefined }}>
              {c} ({products.filter(p => p.category===c).length})
            </button>
          ))}
        </div>
      </div>

      {/* Grille produits */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          {products.length === 0 ? 'Aucun produit. Ajoutez-en un.' : 'Aucun résultat pour cette recherche.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="rounded-2xl border bg-card p-4 space-y-3"
              style={{ borderColor: p.active ? '#a78bfa44' : 'hsl(var(--border))', opacity: p.active ? 1 : 0.55 }}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.name}</p>
                  {p.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{p.category}</span>}
                </div>
                <p className="font-bold text-sm text-violet-400 ml-2 shrink-0">{p.price.toLocaleString()} Ar</p>
              </div>
              {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-green-500'}`}>
                  Stock : {p.stock}
                </span>
                {!p.active && <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactif</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEdit(p)}>
                  <Pencil className="w-3 h-3"/> Modifier
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleToggle(p)}
                  title={p.active ? 'Désactiver' : 'Activer'}>
                  {p.active ? '⏸' : '▶'}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(p)}>
                  <Trash2 className="w-3 h-3"/>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
