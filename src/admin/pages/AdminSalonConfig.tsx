import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SalonServicesCatalog, SalonTeamCatalog } from '@/admin/components/catalogs';

interface Service { id: string; label: string; price: number; duration_min: number; }
interface Combo { id: string; name: string; description: string; service_ids: string[]; total_price: number; duration_min: number | null; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminSalonConfig() {
  const [services, setServices] = useState<Service[]>([]);
  const [combos, setCombos]     = useState<Combo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);

  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [selectedSvcs, setSelectedSvcs] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [duration, setDuration]     = useState(60);
  const [autoPrice, setAutoPrice]   = useState(true);
  const [saving, setSaving]         = useState(false);

  const load = async () => {
    setLoading(true);
    const [svcData, comboData] = await Promise.all([
      api('GET', '/salon/services'),
      api('GET', '/salon/combos'),
    ]);
    setServices(Array.isArray(svcData) ? svcData : []);
    setCombos(Array.isArray(comboData) ? comboData : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Calcul auto du prix depuis les services sélectionnés
  const autoCalcPrice = selectedSvcs.reduce((sum, id) => {
    const svc = services.find(s => s.id === id);
    return sum + (svc?.price ?? 0);
  }, 0);
  const displayPrice = autoPrice ? autoCalcPrice : totalPrice;

  const resetForm = () => {
    setName(''); setDescription(''); setSelectedSvcs([]); setTotalPrice(0); setDuration(60);
    setAutoPrice(true); setEditId(null); setShowForm(false);
  };

  const startEdit = (c: Combo) => {
    setName(c.name); setDescription(c.description ?? ''); setSelectedSvcs(c.service_ids ?? []);
    setTotalPrice(c.total_price); setDuration(c.duration_min ?? 60); setAutoPrice(false);
    setEditId(c.id); setShowForm(true);
  };

  const toggleService = (id: string) =>
    setSelectedSvcs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!name.trim() || selectedSvcs.length === 0) { toast.error('Nom et au moins un service requis'); return; }
    const price = autoPrice ? autoCalcPrice : totalPrice;
    if (price <= 0) { toast.error('Prix invalide'); return; }
    setSaving(true);
    try {
      const body = { name, description, service_ids: selectedSvcs, total_price: price, duration_min: duration };
      const res = editId
        ? await api('PUT', `/salon/combos/${editId}`, { ...body, active: true })
        : await api('POST', '/salon/combos', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Forfait mis à jour' : 'Forfait créé');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (c: Combo) => {
    if (!confirm(`Désactiver le forfait "${c.name}" ?`)) return;
    const res = await api('DELETE', `/salon/combos/${c.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Forfait désactivé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Forfaits composés — Salon</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{combos.filter(c => c.active).length} forfait(s) actif(s)</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4"/> Nouveau forfait
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-pink-500"/>{editId ? 'Modifier le forfait' : 'Nouveau forfait'}</h3>

          <div className="space-y-1">
            <Label>Nom du forfait</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Forfait Mariage, Pack Barber Pro…" className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Description (optionnel)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ce que comprend le forfait…" className="h-9"/>
          </div>

          <div className="space-y-2">
            <Label>Services inclus</Label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {services.map(svc => {
                const sel = selectedSvcs.includes(svc.id);
                return (
                  <button key={svc.id} onClick={() => toggleService(svc.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 text-sm border flex items-center justify-between transition-all"
                    style={{ borderColor: sel ? '#ec4899' : 'hsl(var(--border))', background: sel ? '#ec489912' : undefined }}>
                    <div className="flex items-center gap-2">
                      {sel ? <Check className="w-3.5 h-3.5 text-pink-500 shrink-0"/> : <div className="w-3.5 h-3.5 rounded border border-border shrink-0"/>}
                      <span>{svc.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{svc.price.toLocaleString()} Ar</span>
                  </button>
                );
              })}
            </div>
            {selectedSvcs.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedSvcs.length} service(s) sélectionné(s)</p>
            )}
          </div>

          {/* Prix */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label>Prix total</Label>
              <button onClick={() => setAutoPrice(!autoPrice)}
                className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                style={{ borderColor: autoPrice ? '#ec4899' : 'hsl(var(--border))', color: autoPrice ? '#ec4899' : undefined }}>
                {autoPrice ? '🔗 Auto (somme des services)' : '✏️ Manuel'}
              </button>
            </div>
            {autoPrice ? (
              <div className="rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 px-3 py-2 text-sm flex justify-between">
                <span className="text-muted-foreground">Calculé automatiquement</span>
                <span className="font-bold text-pink-600">{autoCalcPrice.toLocaleString()} Ar</span>
              </div>
            ) : (
              <Input type="number" value={totalPrice} onChange={e => setTotalPrice(Number(e.target.value))} min={0} step={500} className="h-9"/>
            )}
          </div>

          <div className="space-y-1">
            <Label>Durée (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} step={15} className="h-9 w-28"/>
              <span className="text-sm text-muted-foreground">min · {Math.floor(duration/60)}h{duration%60>0?String(duration%60).padStart(2,'0'):''}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background: '#ec4899' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : 'Créer le forfait'} — {displayPrice.toLocaleString()} Ar
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Liste des combos */}
      {combos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucun forfait créé. Créez-en un pour qu'il apparaisse côté client.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {combos.map(combo => (
            <div key={combo.id} className="rounded-2xl border bg-card p-5 space-y-3"
              style={{ borderColor: combo.active ? '#ec489944' : 'hsl(var(--border))', opacity: combo.active ? 1 : 0.6 }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-500"/>
                    <h3 className="font-bold">{combo.name}</h3>
                    {!combo.active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Désactivé</span>}
                  </div>
                  {combo.description && <p className="text-xs text-muted-foreground mt-0.5">{combo.description}</p>}
                </div>
                <span className="font-bold text-pink-600">{combo.total_price.toLocaleString()} Ar</span>
              </div>

              {/* Services */}
              <div className="space-y-0.5">
                {(combo.service_ids ?? []).map(id => {
                  const svc = services.find(s => s.id === id);
                  return svc ? (
                    <div key={id} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-pink-400 inline-block"/>
                      {svc.label} <span className="opacity-60">· {svc.price.toLocaleString()} Ar</span>
                    </div>
                  ) : null;
                })}
              </div>

              {combo.duration_min && (
                <p className="text-xs text-muted-foreground">Durée : {Math.floor(combo.duration_min/60)}h{combo.duration_min%60>0?String(combo.duration_min%60).padStart(2,'0'):''}min</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => startEdit(combo)}>
                  <Pencil className="w-3.5 h-3.5"/> Modifier
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(combo)}>
                  <Trash2 className="w-3.5 h-3.5"/>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-8">
        <SalonServicesCatalog />
      </div>

      <div className="border-t border-border pt-8">
        <SalonTeamCatalog />
      </div>
    </div>
  );
}
