import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ModuleConfigPanel from '@/admin/components/ModuleConfigPanel';
import { PoolCoursesCatalog } from '@/admin/components/catalogs';

interface PassType { id: string; label: string; entries: number; validity_days: number; price: number; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminPoolConfig() {
  const [tab, setTab] = useState<'passes'|'config'>('passes');
  const [passes, setPasses]   = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string|null>(null);
  const [saving, setSaving]   = useState(false);

  const [label, setLabel]           = useState('');
  const [entries, setEntries]       = useState(10);
  const [validity, setValidity]     = useState(30);
  const [price, setPrice]           = useState(50000);

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/pool/pass-types');
    setPasses(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setLabel(''); setEntries(10); setValidity(30); setPrice(50000); setEditId(null); setShowForm(false); };

  const startEdit = (p: PassType) => {
    setLabel(p.label); setEntries(p.entries); setValidity(p.validity_days); setPrice(p.price);
    setEditId(p.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Libellé requis'); return; }
    setSaving(true);
    try {
      const body = { label, entries, validity_days: validity, price };
      const res = editId
        ? await api('PUT', `/pool/pass-types/${editId}`, { ...body, active: true })
        : await api('POST', '/pool/pass-types', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Pass mis à jour' : 'Pass ajouté');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (p: PassType) => {
    await api('PUT', `/pool/pass-types/${p.id}`, { label: p.label, entries: p.entries, validity_days: p.validity_days, price: p.price, active: !p.active });
    toast.success(p.active ? 'Pass désactivé' : 'Pass activé'); load();
  };

  const handleDelete = async (p: PassType) => {
    if (!confirm(`Désactiver le pass "${p.label}" ?`)) return;
    await api('DELETE', `/pool/pass-types/${p.id}`);
    toast.success('Pass désactivé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Waves className="w-5 h-5 text-cyan-400"/>Gestion des pass — Piscine</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{passes.filter(p=>p.active).length} pass actif(s)</p>
        </div>
        {tab === 'passes' && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4"/> Nouveau pass
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['passes','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            style={{ borderColor: tab===t ? '#22d3ee' : 'transparent', color: tab===t ? '#22d3ee' : undefined }}>
            {t === 'passes' ? '🎫 Types de pass' : '⚙️ Tarifs entrée directe'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <ModuleConfigPanel
          module="pool"
          color="#22d3ee"
          fields={[
            { key:'tarif_entree',       label:'Tarif entrée 1 personne (Ar)', suffix:'Ar', step:500 },
            { key:'tarif_accompagnant', label:'Tarif par accompagnant (Ar)',   suffix:'Ar', step:500 },
          ]}
        />
      )}

      {tab === 'passes' && (<>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editId ? 'Modifier le pass' : 'Nouveau type de pass'}</h3>

          <div className="space-y-1">
            <Label>Libellé du pass</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Pass VIP Mensuel, Forfait Famille…" className="h-9"/>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Entrées</Label>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8 text-xs" onClick={() => setEntries(n => Math.max(1,n-1))}>-</Button>
                <span className="w-8 text-center font-bold text-sm">{entries}</span>
                <Button size="icon" variant="outline" className="h-8 w-8 text-xs" onClick={() => setEntries(n => n+1)}>+</Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Validité (jours)</Label>
              <Input type="number" value={validity} onChange={e => setValidity(Number(e.target.value))} min={1} className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Prix (Ar)</Label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} step={5000} className="h-9"/>
            </div>
          </div>

          {/* Résumé */}
          <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 px-3 py-2 text-sm flex justify-between">
            <span className="text-muted-foreground">{entries} entrées · {validity} jours</span>
            <span className="font-bold text-cyan-600">{price.toLocaleString()} Ar</span>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background:'#22d3ee', color:'#000' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : 'Créer le pass'}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Liste des pass */}
      {passes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucun pass configuré.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {passes.map(p => (
            <div key={p.id} className="rounded-2xl border bg-card p-5 space-y-3"
              style={{ borderColor: p.active ? '#22d3ee44' : 'hsl(var(--border))', opacity: p.active ? 1 : 0.55 }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.entries} entrées · {p.validity_days} jours</p>
                </div>
                <p className="font-bold text-cyan-500">{p.price.toLocaleString()} Ar</p>
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ {Math.round(p.price / p.entries).toLocaleString()} Ar / entrée
              </div>
              {!p.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Désactivé</span>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEdit(p)}>
                  <Pencil className="w-3 h-3"/> Modifier
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleToggle(p)}>
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
      </>)}

      <div className="border-t border-border pt-8">
        <PoolCoursesCatalog />
      </div>
    </div>
  );
}
