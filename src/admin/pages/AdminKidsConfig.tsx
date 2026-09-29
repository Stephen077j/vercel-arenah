import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface TicketType { id: string; label: string; price: number; duration_hours: number; per_person: boolean; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminKidsConfig() {
  const [types, setTypes]     = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string|null>(null);
  const [saving, setSaving]   = useState(false);

  const [label, setLabel]       = useState('');
  const [price, setPrice]       = useState(5000);
  const [duration, setDuration] = useState(1);
  const [perPerson, setPerPerson] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/kids/ticket-types');
    setTypes(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setLabel(''); setPrice(5000); setDuration(1); setPerPerson(true); setEditId(null); setShowForm(false); };

  const startEdit = (t: TicketType) => {
    setLabel(t.label); setPrice(t.price); setDuration(Number(t.duration_hours)); setPerPerson(t.per_person);
    setEditId(t.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!label.trim() || price <= 0) { toast.error('Libellé et prix requis'); return; }
    setSaving(true);
    try {
      const body = { label, price, duration_hours: duration, per_person: perPerson };
      const res = editId
        ? await api('PUT', `/kids/ticket-types/${editId}`, { ...body, active: true })
        : await api('POST', '/kids/ticket-types', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Tarif mis à jour' : 'Tarif ajouté');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (t: TicketType) => {
    if (!confirm(`Désactiver le tarif "${t.label}" ?`)) return;
    await api('DELETE', `/kids/ticket-types/${t.id}`);
    toast.success('Tarif désactivé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">🎠 Tarifs — Espace Enfants</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{types.filter(t=>t.active).length} tarif(s) actif(s)</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4"/> Nouveau tarif
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editId ? 'Modifier le tarif' : 'Nouveau tarif'}</h3>

          <div className="space-y-1">
            <Label>Libellé</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Enfant — 2 heures" className="h-9"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prix (Ar)</Label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} step={500} className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Durée (heures)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={0} step={0.5} className="h-9"/>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Type de tarif</Label>
            <div className="flex gap-3">
              <button onClick={() => setPerPerson(true)}
                className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
                style={{ borderColor: perPerson ? '#f472b6' : 'hsl(var(--border))', background: perPerson ? '#f472b622' : undefined, color: perPerson ? '#f472b6' : undefined }}>
                👶 Par personne
              </button>
              <button onClick={() => setPerPerson(false)}
                className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
                style={{ borderColor: !perPerson ? '#f472b6' : 'hsl(var(--border))', background: !perPerson ? '#f472b622' : undefined, color: !perPerson ? '#f472b6' : undefined }}>
                🎁 Prix forfait
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background:'#f472b6', color:'#000' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : `Créer · ${price.toLocaleString()} Ar`}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map(t => (
          <div key={t.id} className="rounded-2xl border bg-card p-4 space-y-3"
            style={{ borderColor: t.active ? '#f472b644' : 'hsl(var(--border))', opacity: t.active ? 1 : 0.55 }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.duration_hours > 0 ? `${t.duration_hours}h · ` : ''}{t.per_person ? 'Par personne' : 'Forfait'}
                </p>
              </div>
              <p className="font-bold text-pink-400">{t.price.toLocaleString()} Ar</p>
            </div>
            {!t.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Désactivé</span>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEdit(t)}>
                <Pencil className="w-3 h-3"/> Modifier
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(t)}>
                <Trash2 className="w-3 h-3"/>
              </Button>
            </div>
          </div>
        ))}
        {types.length === 0 && (
          <div className="col-span-3 text-center py-10 border border-dashed border-border rounded-2xl text-muted-foreground">
            Aucun tarif configuré.
          </div>
        )}
      </div>
    </div>
  );
}
