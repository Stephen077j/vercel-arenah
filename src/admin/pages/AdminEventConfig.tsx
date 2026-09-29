import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Hall { id: string; name: string; capacity: number; base_price: number; desc: string | null; active: boolean; }
interface Option { id: string; label: string; price: number; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminEventConfig() {
  const [halls, setHalls]     = useState<Hall[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'halls'|'options'>('halls');

  // Hall form
  const [showHallForm, setShowHallForm] = useState(false);
  const [editHallId, setEditHallId] = useState<string|null>(null);
  const [hallName, setHallName]     = useState('');
  const [hallCap, setHallCap]       = useState(100);
  const [hallPrice, setHallPrice]   = useState(500000);
  const [hallDesc, setHallDesc]     = useState('');
  const [savingHall, setSavingHall] = useState(false);

  // Option form
  const [showOptForm, setShowOptForm] = useState(false);
  const [editOptId, setEditOptId]   = useState<string|null>(null);
  const [optLabel, setOptLabel]     = useState('');
  const [optPrice, setOptPrice]     = useState(50000);
  const [savingOpt, setSavingOpt]   = useState(false);

  const load = async () => {
    setLoading(true);
    const [hallData, optData] = await Promise.all([api('GET','/event/halls'), api('GET','/event/options')]);
    setHalls(Array.isArray(hallData) ? hallData : []);
    setOptions(Array.isArray(optData) ? optData : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetHall = () => { setHallName(''); setHallCap(100); setHallPrice(500000); setHallDesc(''); setEditHallId(null); setShowHallForm(false); };
  const resetOpt  = () => { setOptLabel(''); setOptPrice(50000); setEditOptId(null); setShowOptForm(false); };

  const startEditHall = (h: Hall) => { setHallName(h.name); setHallCap(h.capacity); setHallPrice(h.base_price); setHallDesc(h.desc??''); setEditHallId(h.id); setShowHallForm(true); };
  const startEditOpt  = (o: Option) => { setOptLabel(o.label); setOptPrice(o.price); setEditOptId(o.id); setShowOptForm(true); };

  const saveHall = async () => {
    if (!hallName.trim()) { toast.error('Nom de la salle requis'); return; }
    setSavingHall(true);
    try {
      const body = { name: hallName, capacity: hallCap, base_price: hallPrice, desc: hallDesc || null };
      const res = editHallId
        ? await api('PUT', `/event/halls/${editHallId}`, { ...body, active: true })
        : await api('POST', '/event/halls', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editHallId ? 'Salle mise à jour' : 'Salle ajoutée');
      resetHall(); load();
    } finally { setSavingHall(false); }
  };

  const toggleHall = async (h: Hall) => {
    await api('PUT', `/event/halls/${h.id}`, { name: h.name, capacity: h.capacity, base_price: h.base_price, desc: h.desc, active: !h.active });
    toast.success(h.active ? 'Salle désactivée' : 'Salle activée'); load();
  };

  const deleteHall = async (h: Hall) => {
    if (!confirm(`Supprimer la salle "${h.name}" ?`)) return;
    const res = await api('DELETE', `/event/halls/${h.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.note ?? 'Salle supprimée'); load();
  };

  const saveOpt = async () => {
    if (!optLabel.trim()) { toast.error('Libellé requis'); return; }
    setSavingOpt(true);
    try {
      const body = { label: optLabel, price: optPrice };
      const res = editOptId
        ? await api('PUT', `/event/options/${editOptId}`, { ...body, active: true })
        : await api('POST', '/event/options', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editOptId ? 'Option mise à jour' : 'Option ajoutée');
      resetOpt(); load();
    } finally { setSavingOpt(false); }
  };

  const deleteOpt = async (o: Option) => {
    if (!confirm(`Supprimer l'option "${o.label}" ?`)) return;
    await api('DELETE', `/event/options/${o.id}`);
    toast.success('Option supprimée'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-violet-400"/>Gestion Événements</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{halls.filter(h=>h.active).length} salle(s) · {options.filter(o=>o.active).length} option(s)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['halls','options'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            style={{ borderColor: tab===t ? '#818cf8' : 'transparent', color: tab===t ? '#818cf8' : undefined }}>
            {t === 'halls' ? '🏛️ Salles' : '⚙️ Options & Services'}
          </button>
        ))}
      </div>

      {/* HALLS */}
      {tab === 'halls' && (
        <div className="space-y-4">
          <Button onClick={() => { resetHall(); setShowHallForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4"/> Nouvelle salle
          </Button>

          {showHallForm && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
              <h3 className="font-semibold">{editHallId ? 'Modifier la salle' : 'Nouvelle salle'}</h3>
              <div className="space-y-1">
                <Label>Nom de la salle</Label>
                <Input value={hallName} onChange={e => setHallName(e.target.value)} placeholder="Ex: Grande Salle Royale" className="h-9"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Capacité (personnes)</Label>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setHallCap(n => Math.max(10, n-10))}>-</Button>
                    <Input type="number" value={hallCap} onChange={e => setHallCap(Number(e.target.value))} min={10} className="h-9 text-center w-20"/>
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setHallCap(n => n+10)}>+</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Prix de base (Ar)</Label>
                  <Input type="number" value={hallPrice} onChange={e => setHallPrice(Number(e.target.value))} min={0} step={50000} className="h-9"/>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <textarea value={hallDesc} onChange={e => setHallDesc(e.target.value)}
                  placeholder="Équipements, services inclus…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"/>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveHall} disabled={savingHall} style={{ background:'#818cf8' }}>
                  {savingHall ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                  {editHallId ? 'Mettre à jour' : `Créer · ${hallPrice.toLocaleString()} Ar`}
                </Button>
                <Button variant="outline" onClick={resetHall}><X className="w-4 h-4"/></Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {halls.map(h => (
              <div key={h.id} className="rounded-2xl border bg-card p-5 space-y-3"
                style={{ borderColor: h.active ? '#818cf844' : 'hsl(var(--border))', opacity: h.active ? 1 : 0.55 }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{h.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Jusqu'à {h.capacity} personnes</p>
                  </div>
                  <p className="font-bold text-violet-400">{h.base_price.toLocaleString()} Ar</p>
                </div>
                {h.desc && <p className="text-xs text-muted-foreground line-clamp-2">{h.desc}</p>}
                {!h.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Désactivée</span>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEditHall(h)}>
                    <Pencil className="w-3 h-3"/> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => toggleHall(h)}>
                    {h.active ? '⏸' : '▶'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteHall(h)}>
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </div>
            ))}
            {halls.length === 0 && (
              <div className="col-span-3 text-center py-10 border border-dashed border-border rounded-2xl text-muted-foreground">
                Aucune salle configurée.
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPTIONS */}
      {tab === 'options' && (
        <div className="space-y-4">
          <Button onClick={() => { resetOpt(); setShowOptForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4"/> Nouvelle option
          </Button>

          {showOptForm && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
              <h3 className="font-semibold">{editOptId ? 'Modifier l\'option' : 'Nouvelle option / service'}</h3>
              <div className="space-y-1">
                <Label>Libellé</Label>
                <Input value={optLabel} onChange={e => setOptLabel(e.target.value)} placeholder="Ex: Décoration florale, DJ, Traiteur…" className="h-9"/>
              </div>
              <div className="space-y-1">
                <Label>Prix (Ar)</Label>
                <Input type="number" value={optPrice} onChange={e => setOptPrice(Number(e.target.value))} min={0} step={10000} className="h-9"/>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveOpt} disabled={savingOpt} style={{ background:'#818cf8' }}>
                  {savingOpt ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                  {editOptId ? 'Mettre à jour' : `Ajouter · ${optPrice.toLocaleString()} Ar`}
                </Button>
                <Button variant="outline" onClick={resetOpt}><X className="w-4 h-4"/></Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map(o => (
              <div key={o.id} className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3"
                style={{ opacity: o.active ? 1 : 0.55 }}>
                <div>
                  <p className="font-medium text-sm">{o.label}</p>
                  <p className="text-xs text-violet-400 font-bold">{o.price.toLocaleString()} Ar</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => startEditOpt(o)}>
                    <Pencil className="w-3 h-3"/>
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteOpt(o)}>
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </div>
            ))}
            {options.length === 0 && (
              <div className="col-span-3 text-center py-10 border border-dashed border-border rounded-2xl text-muted-foreground">
                Aucune option configurée.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
