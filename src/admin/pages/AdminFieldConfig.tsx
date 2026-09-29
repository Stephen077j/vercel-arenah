import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Trophy } from 'lucide-react';
import ModuleConfigPanel from '@/admin/components/ModuleConfigPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Slot { id: string; label: string; price: number; sport_type: string; equipment: string | null; active: boolean; }

const SPORTS = [
  { value: 'foot',       label: 'Football',    color: '#22c55e', emoji: '⚽' },
  { value: 'basket',     label: 'Basket',      color: '#f59e0b', emoji: '🏀' },
  { value: 'tennis',     label: 'Tennis',      color: '#a3e635', emoji: '🎾' },
  { value: 'volleyball', label: 'Volleyball',  color: '#3b82f6', emoji: '🏐' },
  { value: 'multisport', label: 'Multisport',  color: '#8b5cf6', emoji: '🏆' },
];

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminFieldConfig() {
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string|null>(null);
  const [saving, setSaving]   = useState(false);
  const [tab, setTab] = useState<'slots'|'config'>('slots');
  const [filterSport, setFilterSport] = useState<string>('all');

  const [label, setLabel]         = useState('');
  const [sport, setSport]         = useState('foot');
  const [price, setPrice]         = useState(30000);
  const [equipment, setEquipment] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/field/slots');
    setSlots(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setLabel(''); setSport('foot'); setPrice(30000); setEquipment(''); setEditId(null); setShowForm(false); };

  const startEdit = (s: Slot) => {
    setLabel(s.label); setSport(s.sport_type); setPrice(s.price); setEquipment(s.equipment??'');
    setEditId(s.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Libellé du créneau requis'); return; }
    setSaving(true);
    try {
      const body = { label, price, sport_type: sport, equipment: equipment || null };
      const res = editId
        ? await api('PUT', `/field/slots/${editId}`, { ...body, active: true })
        : await api('POST', '/field/slots', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Créneau mis à jour' : 'Créneau ajouté');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (s: Slot) => {
    await api('PUT', `/field/slots/${s.id}`, { label: s.label, price: s.price, sport_type: s.sport_type, equipment: s.equipment, active: !s.active });
    toast.success(s.active ? 'Créneau désactivé' : 'Créneau activé'); load();
  };

  const handleDelete = async (s: Slot) => {
    if (!confirm(`Supprimer le créneau "${s.label}" ?`)) return;
    const res = await api('DELETE', `/field/slots/${s.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.note ?? 'Créneau supprimé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  const sportsInUse = [...new Set(slots.map(s => s.sport_type))];
  const filtered = filterSport === 'all' ? slots : slots.filter(s => s.sport_type === filterSport);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-lime-400"/>Créneaux terrain — Sports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{slots.filter(s=>s.active).length} créneau(x) actif(s) · {slots.length} total</p>
        </div>
        {tab === 'slots' && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4"/> Nouveau créneau
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['slots','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            style={{ borderColor: tab===t ? '#a3e635' : 'transparent', color: tab===t ? '#a3e635' : undefined }}>
            {t === 'slots' ? '⏱️ Créneaux' : '⚙️ Paramètres'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <ModuleConfigPanel
          module="field"
          color="#a3e635"
          fields={[{ key:'prix_heure_libre', label:'Prix réservation libre par heure (Ar)', suffix:'Ar/h', step:1000 }]}
        />
      )}

      {tab === 'slots' && (<>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editId ? 'Modifier le créneau' : 'Nouveau créneau'}</h3>

          <div className="space-y-1">
            <Label>Sport</Label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(sp => (
                <button key={sp.value} onClick={() => setSport(sp.value)}
                  className="px-3 py-1.5 rounded-xl text-sm border transition-all font-medium"
                  style={{ borderColor: sport===sp.value ? sp.color : 'hsl(var(--border))', background: sport===sp.value ? sp.color+'22' : undefined, color: sport===sp.value ? sp.color : undefined }}>
                  {sp.emoji} {sp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Libellé du créneau (horaire)</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: 08h00 – 09h30" className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Prix (Ar)</Label>
            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} step={5000} className="h-9"/>
          </div>

          <div className="space-y-1">
            <Label>Équipement inclus (optionnel)</Label>
            <Input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="Ex: Ballons fournis · Vestiaires" className="h-9"/>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background:'#a3e635', color:'#000' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : `Ajouter · ${price.toLocaleString()} Ar`}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Filtre par sport */}
      {sportsInUse.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterSport('all')}
            className="px-3 py-1 rounded-full text-xs border transition-all"
            style={{ borderColor: filterSport==='all' ? '#a3e635' : 'hsl(var(--border))', background: filterSport==='all' ? '#a3e63522' : undefined }}>
            Tous ({slots.length})
          </button>
          {sportsInUse.map(sp => {
            const meta = SPORTS.find(s => s.value === sp);
            const count = slots.filter(s => s.sport_type === sp).length;
            return (
              <button key={sp} onClick={() => setFilterSport(sp)}
                className="px-3 py-1 rounded-full text-xs border transition-all"
                style={{ borderColor: filterSport===sp ? (meta?.color??'#94a3b8') : 'hsl(var(--border))', background: filterSport===sp ? (meta?.color??'#94a3b8')+'22' : undefined, color: filterSport===sp ? (meta?.color??undefined) : undefined }}>
                {meta?.emoji} {meta?.label ?? sp} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Créneaux par sport */}
      {slots.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucun créneau configuré. Ajoutez-en un.
        </div>
      ) : (
        <div className="space-y-4">
          {SPORTS.filter(sp => filtered.some(s => s.sport_type === sp.value)).map(sp => {
            const sportSlots = filtered.filter(s => s.sport_type === sp.value);
            return (
              <div key={sp.value}>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: sp.color }}>
                  {sp.emoji} {sp.label}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sportSlots.map(slot => (
                    <div key={slot.id} className="rounded-xl border bg-card p-4 space-y-2"
                      style={{ borderColor: slot.active ? sp.color+'44' : 'hsl(var(--border))', opacity: slot.active ? 1 : 0.55 }}>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm">{slot.label}</p>
                        <p className="font-bold text-sm" style={{ color: sp.color }}>{slot.price.toLocaleString()} Ar</p>
                      </div>
                      {slot.equipment && <p className="text-xs text-muted-foreground line-clamp-1">{slot.equipment}</p>}
                      {!slot.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Désactivé</span>}
                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-7" onClick={() => startEdit(slot)}>
                          <Pencil className="w-3 h-3"/>
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleToggle(slot)}>
                          {slot.active ? '⏸' : '▶'}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50 h-7" onClick={() => handleDelete(slot)}>
                          <Trash2 className="w-3 h-3"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.filter(s => !SPORTS.some(sp => sp.value === s.sport_type)).map(slot => (
            <div key={slot.id} className="rounded-xl border bg-card p-4">
              <p className="font-bold">{slot.sport_type} — {slot.label} · {slot.price.toLocaleString()} Ar</p>
            </div>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}
