import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ModuleConfigPanel from '@/admin/components/ModuleConfigPanel';
import { toast } from 'sonner';

interface Table { id: string; name: string; capacity: number; zone: string; }

const ZONES = ['intérieur', 'terrasse'] as const;

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminRestaurantConfig() {
  const [tab, setTab] = useState<'tables'|'config'>('tables');
  const [tables, setTables]   = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName]         = useState('');
  const [capacity, setCapacity] = useState(4);
  const [zone, setZone]         = useState<'intérieur' | 'terrasse'>('intérieur');
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/restaurant/tables');
    setTables(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setName(''); setCapacity(4); setZone('intérieur'); setEditId(null); setShowForm(false); };

  const startEdit = (t: Table) => {
    setName(t.name); setCapacity(t.capacity); setZone(t.zone as typeof zone);
    setEditId(t.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nom de table requis'); return; }
    setSaving(true);
    try {
      const res = editId
        ? await api('PUT', `/restaurant/tables/${editId}`, { name, capacity, zone })
        : await api('POST', '/restaurant/tables', { name, capacity, zone });
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Table mise à jour' : 'Table ajoutée');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, tname: string) => {
    if (!confirm(`Supprimer la table "${tname}" ?`)) return;
    const res = await api('DELETE', `/restaurant/tables/${id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Table supprimée'); load();
  };

  const grouped = ZONES.reduce((acc, z) => {
    acc[z] = tables.filter(t => t.zone === z);
    return acc;
  }, {} as Record<string, Table[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Configuration — Restaurant</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{tables.length} table(s) configurée(s)</p>
        </div>
        {tab === 'tables' && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4"/> Ajouter une table
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['tables','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            style={{ borderColor: tab===t ? '#f59e0b' : 'transparent', color: tab===t ? '#f59e0b' : undefined }}>
            {t === 'tables' ? '🍽️ Tables' : '⚙️ Paramètres'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <ModuleConfigPanel
          module="restaurant"
          color="#f59e0b"
          fields={[{ key:'arrhes_par_personne', label:'Arrhes par personne (Ar)', suffix:'Ar', step:500 }]}
        />
      )}

      {tab === 'tables' && (<>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editId ? 'Modifier la table' : 'Nouvelle table'}</h3>
          <div className="space-y-1">
            <Label>Nom / Numéro</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: T10, VIP1, Terrasse A…" className="h-9"/>
          </div>
          <div className="space-y-1">
            <Label>Capacité (personnes)</Label>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCapacity(c => Math.max(1,c-1))}>-</Button>
              <span className="w-12 text-center font-bold text-lg">{capacity}</span>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCapacity(c => Math.min(20,c+1))}>+</Button>
              <span className="text-xs text-muted-foreground">max 20</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Zone</Label>
            <div className="flex gap-2">
              {ZONES.map(z => (
                <button key={z} onClick={() => setZone(z)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize"
                  style={{ background: zone === z ? '#d4a843' : 'transparent', color: zone === z ? '#111' : undefined, borderColor: zone === z ? '#d4a843' : 'hsl(var(--border))' }}>
                  {z === 'intérieur' ? '🏠 Intérieur' : '☀️ Terrasse'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : 'Créer la table'}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>
      ) : (
        <div className="space-y-6">
          {ZONES.map(z => grouped[z]?.length > 0 && (
            <div key={z}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 capitalize">
                {z === 'intérieur' ? '🏠 Salle intérieure' : '☀️ Terrasse'} · {grouped[z].length} tables
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {grouped[z].map(t => (
                  <div key={t.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.capacity} pers. max</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground"/>
                      </button>
                      <button onClick={() => handleDelete(t.id, t.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {tables.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
              Aucune table configurée. Ajoutez-en une pour commencer.
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  );
}
