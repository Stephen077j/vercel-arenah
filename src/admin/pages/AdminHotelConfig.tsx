import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Hotel, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Room {
  id: string; name: string; type: string; price_per_night: number;
  capacity: number; description: string | null; amenities: string[]; active: boolean;
}

const ROOM_TYPES = [
  { value: 'standard',   label: 'Standard',   color: '#3b82f6' },
  { value: 'superieure', label: 'Supérieure',  color: '#8b5cf6' },
  { value: 'familiale',  label: 'Familiale',   color: '#f59e0b' },
  { value: 'suite',      label: 'Suite',       color: '#d4a843' },
  { value: 'deluxe',     label: 'Deluxe',      color: '#ec4899' },
];

const DEFAULT_AMENITIES = ['Wi-Fi', 'Climatisation', 'TV écran plat', 'Salle de bain privée', 'Coffre-fort', 'Mini-bar', 'Balcon', 'Baignoire', 'Service de chambre', 'Peignoir & chaussons'];

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminHotelConfig() {
  const [rooms, setRooms]     = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  const [name, setName]           = useState('');
  const [type, setType]           = useState('standard');
  const [price, setPrice]         = useState(180000);
  const [capacity, setCapacity]   = useState(2);
  const [description, setDesc]    = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Wi-Fi', 'Climatisation', 'TV écran plat']);
  const [customAmenity, setCustomAmenity] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await api('GET', '/hotel/rooms');
    setRooms(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(''); setType('standard'); setPrice(180000); setCapacity(2);
    setDesc(''); setAmenities(['Wi-Fi', 'Climatisation', 'TV écran plat']);
    setCustomAmenity(''); setEditId(null); setShowForm(false);
  };

  const startEdit = (r: Room) => {
    setName(r.name); setType(r.type); setPrice(r.price_per_night);
    setCapacity(r.capacity); setDesc(r.description ?? '');
    setAmenities(Array.isArray(r.amenities) ? r.amenities : []);
    setEditId(r.id); setShowForm(true);
  };

  const toggleAmenity = (a: string) =>
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    setAmenities(prev => [...prev, customAmenity.trim()]);
    setCustomAmenity('');
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nom de la chambre requis'); return; }
    if (price <= 0) { toast.error('Prix invalide'); return; }
    setSaving(true);
    try {
      const body = { name, type, price_per_night: price, capacity, description, amenities };
      const res = editId
        ? await api('PUT', `/hotel/rooms/${editId}`, { ...body, active: true })
        : await api('POST', '/hotel/rooms', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Chambre mise à jour' : 'Chambre ajoutée');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (r: Room) => {
    const res = await api('PUT', `/hotel/rooms/${r.id}`, { ...r, active: !r.active });
    if (res.error) { toast.error(res.error); return; }
    toast.success(r.active ? 'Chambre désactivée' : 'Chambre activée');
    load();
  };

  const handleDelete = async (r: Room) => {
    if (!confirm(`Supprimer la chambre "${r.name}" ?`)) return;
    const res = await api('DELETE', `/hotel/rooms/${r.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.note ?? 'Chambre supprimée');
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  const byType = ROOM_TYPES.map(t => ({ ...t, rooms: rooms.filter(r => r.type === t.value) })).filter(t => t.rooms.length > 0);
  const otherRooms = rooms.filter(r => !ROOM_TYPES.some(t => t.value === r.type));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Hotel className="w-5 h-5 text-sky-400"/>Gestion des chambres — Hôtel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{rooms.filter(r => r.active).length} chambre(s) active(s) · {rooms.length} total</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4"/> Nouvelle chambre
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-xl">
          <h3 className="font-semibold">{editId ? 'Modifier la chambre' : 'Nouvelle chambre'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nom de la chambre</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Chambre Deluxe Vue Mer" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Prix / nuit (Ar)</Label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} step={10000} className="h-9"/>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label>Type de chambre</Label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className="px-3 py-1.5 rounded-xl text-sm border transition-all font-medium"
                  style={{ borderColor: type===t.value ? t.color : 'hsl(var(--border))', background: type===t.value ? t.color+'22' : undefined, color: type===t.value ? t.color : undefined }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Capacité (personnes)</Label>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCapacity(c => Math.max(1,c-1))}>-</Button>
                <span className="w-8 text-center font-bold">{capacity}</span>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setCapacity(c => Math.min(10,c+1))}>+</Button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Description de la chambre…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"/>
          </div>

          {/* Équipements */}
          <div className="space-y-2">
            <Label>Équipements inclus</Label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_AMENITIES.map(a => {
                const sel = amenities.includes(a);
                return (
                  <button key={a} onClick={() => toggleAmenity(a)}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={{ borderColor: sel ? '#38bdf8' : 'hsl(var(--border))', background: sel ? '#38bdf822' : undefined, color: sel ? '#38bdf8' : undefined }}>
                    {sel ? '✓ ' : ''}{a}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-1">
              <Input value={customAmenity} onChange={e => setCustomAmenity(e.target.value)}
                placeholder="Autre équipement…" className="h-8 text-xs"
                onKeyDown={e => e.key === 'Enter' && addCustomAmenity()}/>
              <Button size="sm" variant="outline" onClick={addCustomAmenity} className="h-8 text-xs px-2">+ Ajouter</Button>
            </div>
            {amenities.filter(a => !DEFAULT_AMENITIES.includes(a)).map(a => (
              <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-sky-400 text-sky-400 mr-1">
                {a}
                <button onClick={() => setAmenities(prev => prev.filter(x => x !== a))} className="opacity-70 hover:opacity-100">×</button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving} style={{ background: '#38bdf8', color: '#000' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Mettre à jour' : `Ajouter · ${price.toLocaleString()} Ar/nuit`}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Liste par type */}
      {rooms.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucune chambre. Ajoutez-en une pour qu'elle apparaisse côté client.
        </div>
      ) : (
        <div className="space-y-6">
          {[...byType, ...(otherRooms.length > 0 ? [{ value:'autre', label:'Autre', color:'#94a3b8', rooms: otherRooms }] : [])].map(group => (
            <div key={group.value}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: group.color }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: group.color }}/>
                {group.label}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.rooms.map(room => (
                  <div key={room.id} className="rounded-2xl border bg-card p-4 space-y-3"
                    style={{ borderColor: room.active ? group.color+'44' : 'hsl(var(--border))', opacity: room.active ? 1 : 0.55 }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm">{room.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{room.capacity} pers. max</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: group.color }}>{room.price_per_night.toLocaleString()} Ar</p>
                        <p className="text-[10px] text-muted-foreground">/nuit</p>
                      </div>
                    </div>
                    {room.description && <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>}
                    {room.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0,4).map(a => (
                          <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
                        ))}
                        {room.amenities.length > 4 && <span className="text-[10px] text-muted-foreground">+{room.amenities.length-4}</span>}
                      </div>
                    )}
                    {!room.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Désactivée</span>}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEdit(room)}>
                        <Pencil className="w-3 h-3"/> Modifier
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleToggle(room)}
                        title={room.active ? 'Désactiver' : 'Activer'}>
                        {room.active ? <ToggleRight className="w-4 h-4 text-sky-400"/> : <ToggleLeft className="w-4 h-4"/>}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(room)}>
                        <Trash2 className="w-3 h-3"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
