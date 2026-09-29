import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Monitor, Gamepad2, Circle, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CyberDurationsCatalog, CyberServicesCatalog, Ps4GamesCatalog } from '@/admin/components/catalogs';

interface Station {
  id: string; number: number; label: string; station_type: string;
  specs: string | null; hourly_rate: number; active: boolean;
}

const TYPE_OPTIONS = [
  { value: 'pc',      label: 'PC Gaming',   icon: '🖥️', color: '#3b82f6' },
  { value: 'ps4',     label: 'PlayStation', icon: '🎮', color: '#7c3aed' },
  { value: 'billard', label: 'Billard',     icon: '🎱', color: '#d4a843' },
];

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminCybercafeConfig() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);

  const [label, setLabel]       = useState('');
  const [type, setType]         = useState('pc');
  const [specs, setSpecs]       = useState('');
  const [rate, setRate]         = useState(2000);
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/cybercafe/stations');
    setStations(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setLabel(''); setType('pc'); setSpecs(''); setRate(2000); setEditId(null); setShowForm(false); };

  const startEdit = (s: Station) => {
    setLabel(s.label); setType(s.station_type); setSpecs(s.specs ?? ''); setRate(s.hourly_rate);
    setEditId(s.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Nom du poste requis'); return; }
    setSaving(true);
    try {
      const res = editId
        ? await api('PUT', `/cybercafe/stations/${editId}`, { label, station_type: type, specs, hourly_rate: rate, active: true })
        : await api('POST', '/cybercafe/stations', { label, station_type: type, specs, hourly_rate: rate });
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Poste mis à jour' : 'Poste ajouté');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: Station) => {
    const res = await api('PUT', `/cybercafe/stations/${s.id}`, {
      label: s.label, station_type: s.station_type, specs: s.specs, hourly_rate: s.hourly_rate, active: !s.active
    });
    if (res.error) { toast.error(res.error); return; }
    toast.success(s.active ? 'Poste bloqué' : 'Poste réactivé');
    load();
  };

  const handleDelete = async (s: Station) => {
    if (!confirm(`Supprimer "${s.label}" ?`)) return;
    const res = await api('DELETE', `/cybercafe/stations/${s.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.note || 'Poste supprimé'); load();
  };

  const grouped = TYPE_OPTIONS.reduce((acc, t) => {
    acc[t.value] = stations.filter(s => s.station_type === t.value);
    return acc;
  }, {} as Record<string, Station[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Postes cybercafé</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stations.filter(s => s.active).length} actif(s) · {stations.filter(s => !s.active).length} bloqué(s) · {stations.length} total
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4"/> Ajouter un poste
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editId ? 'Modifier le poste' : 'Nouveau poste'}</h3>

          <div className="space-y-1">
            <Label>Type de poste</Label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                  style={{
                    borderColor: type === t.value ? t.color : 'hsl(var(--border))',
                    background: type === t.value ? t.color + '22' : undefined,
                    color: type === t.value ? t.color : undefined,
                  }}>
                  <div className="text-lg">{t.icon}</div>
                  <div className="text-xs">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nom / Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: PC Gaming 1, PS4 Pro #3…" className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Spécifications (optionnel)</Label>
            <Input value={specs} onChange={e => setSpecs(e.target.value)} placeholder="Ex: Intel i9, 32GB RAM, RTX 4070" className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Tarif horaire (Ar)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} min={500} step={500} className="h-9 w-36"/>
              <span className="text-sm text-muted-foreground">Ar / heure</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : 'Créer le poste'}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>
      ) : (
        <div className="space-y-6">
          {TYPE_OPTIONS.map(topt => grouped[topt.value]?.length > 0 && (
            <div key={topt.value}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {topt.icon} {topt.label} · {grouped[topt.value].length} poste(s)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[topt.value].map(s => (
                  <div key={s.id} className="rounded-xl border bg-card p-4 space-y-3"
                    style={{ borderColor: s.active ? topt.color + '44' : 'hsl(var(--border))', opacity: s.active ? 1 : 0.7 }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {s.label}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: s.active ? '#22c55e22' : '#ef444422', color: s.active ? '#22c55e' : '#ef4444' }}>
                            {s.active ? 'Actif' : 'Bloqué'}
                          </span>
                        </div>
                        {s.specs && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{s.specs}</div>}
                        <div className="text-sm font-semibold mt-1" style={{ color: topt.color }}>{s.hourly_rate.toLocaleString()} Ar/h</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleActive(s)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1"
                        style={{ borderColor: s.active ? '#ef4444' : '#22c55e', color: s.active ? '#ef4444' : '#22c55e' }}>
                        {s.active ? <><PowerOff className="w-3 h-3"/>Bloquer</> : <><Power className="w-3 h-3"/>Activer</>}
                      </button>
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-muted border border-border">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground"/>
                      </button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 border border-border">
                        <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {stations.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
              Aucun poste configuré. Ajoutez-en un pour commencer.
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-8">
        <CyberDurationsCatalog />
      </div>

      <div className="border-t border-border pt-8">
        <CyberServicesCatalog />
      </div>

      <div className="border-t border-border pt-8">
        <Ps4GamesCatalog />
      </div>
    </div>
  );
}
