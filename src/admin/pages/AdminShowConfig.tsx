import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, Loader2, ChevronLeft, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Show { id: string; title: string; artist: string|null; date: string; time: string; venue: string; category: string|null; base_price: number; active: boolean; description: string|null; }
interface Seat { id: string; row_label: string; seat_number: number; category: string; price: number; status: string; }

const SHOW_CATEGORIES = ['Musique','Danse','Théâtre','Humour','Sport','Cinéma','Autre'];

const CATEGORIES = [
  { value: 'VIP',      label: 'VIP',      color: '#7c3aed', multiplier: '×1.8' },
  { value: 'premium',  label: 'Premium',  color: '#d4a843', multiplier: '×1.3' },
  { value: 'standard', label: 'Standard', color: '#3b82f6', multiplier: '×1.0' },
];

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminShowConfig() {
  const [shows, setShows]       = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [seats, setSeats]       = useState<Seat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Formulaire show
  const [showShowForm, setShowShowForm] = useState(false);
  const [editShowId, setEditShowId]   = useState<string|null>(null);
  const [sTitle, setSTitle]           = useState('');
  const [sArtist, setSArtist]         = useState('');
  const [sDate, setSDate]             = useState('');
  const [sTime, setSTime]             = useState('20:00');
  const [sVenue, setSVenue]           = useState('');
  const [sCategory, setSCategory]     = useState('Musique');
  const [sPrice, setSPrice]           = useState(15000);
  const [sDesc, setSDesc]             = useState('');
  const [savingShow, setSavingShow]   = useState(false);

  // Formulaire ajout rangée
  const [showRowForm, setShowRowForm] = useState(false);
  const [rowLabel, setRowLabel]   = useState('');
  const [seatCount, setSeatCount] = useState(10);
  const [category, setCategory]   = useState('standard');
  const [price, setPrice]         = useState(10000);
  const [savingRow, setSavingRow] = useState(false);

  const loadShows = () => api('GET', '/shows/list').then(data => { setShows(Array.isArray(data) ? data : []); setLoading(false); });
  useEffect(() => { loadShows(); }, []);

  const resetShowForm = () => { setSTitle(''); setSArtist(''); setSDate(''); setSTime('20:00'); setSVenue(''); setSCategory('Musique'); setSPrice(15000); setSDesc(''); setEditShowId(null); setShowShowForm(false); };

  const startEditShow = (s: Show) => {
    setSTitle(s.title); setSArtist(s.artist??''); setSDate(s.date?.slice(0,10)??'');
    setSTime(s.time??'20:00'); setSVenue(s.venue); setSCategory(s.category??'Musique');
    setSPrice(s.base_price); setSDesc(s.description??''); setEditShowId(s.id); setShowShowForm(true);
  };

  const saveShow = async () => {
    if (!sTitle.trim() || !sDate || !sVenue.trim()) { toast.error('Titre, date et lieu requis'); return; }
    setSavingShow(true);
    try {
      const body = { title: sTitle, artist: sArtist||null, date: sDate, time: sTime, venue: sVenue, category: sCategory, base_price: sPrice, description: sDesc||null };
      const res = editShowId
        ? await api('PUT', `/shows/${editShowId}/update`, { ...body, active: true })
        : await api('POST', '/shows/create', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editShowId ? 'Spectacle mis à jour' : 'Spectacle créé');
      resetShowForm(); loadShows();
    } finally { setSavingShow(false); }
  };

  const toggleShow = async (s: Show) => {
    await api('PUT', `/shows/${s.id}/update`, { title: s.title, artist: s.artist, date: s.date?.slice(0,10), time: s.time, venue: s.venue, category: s.category, base_price: s.base_price, description: s.description, active: !s.active });
    toast.success(s.active ? 'Spectacle désactivé' : 'Spectacle activé'); loadShows();
  };

  const deleteShow = async (s: Show) => {
    if (!confirm(`Supprimer le spectacle "${s.title}" ?`)) return;
    const res = await api('DELETE', `/shows/${s.id}/delete`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.note ?? 'Spectacle supprimé'); loadShows();
  };

  const loadSeats = async (show: Show) => {
    setSelectedShow(show);
    setLoadingSeats(true);
    const data = await api('GET', `/shows/${show.id}/seats`);
    setSeats(Array.isArray(data) ? data : []);
    setLoadingSeats(false);
  };

  const handleAddRow = async () => {
    if (!rowLabel.trim() || !selectedShow) { toast.error('Lettre de rangée requis'); return; }
    setSavingRow(true);
    try {
      const res = await api('POST', `/shows/${selectedShow.id}/seats/row`, {
        row_label: rowLabel.trim().toUpperCase(), seat_count: seatCount, category, price,
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Rangée ${rowLabel.toUpperCase()} — ${res.created} siège(s) ajouté(s)`);
      setRowLabel(''); setShowRowForm(false);
      loadSeats(selectedShow);
    } finally { setSavingRow(false); }
  };

  const toggleSeat = async (seat: Seat) => {
    if (seat.status === 'booked') { toast.error('Siège réservé — impossible à modifier'); return; }
    const newStatus = seat.status === 'free' ? 'blocked' : 'free';
    const res = await api('PUT', `/shows/seats/${seat.id}`, { status: newStatus });
    if (res.error) { toast.error(res.error); return; }
    setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: newStatus } : s));
  };

  const deleteRow = async (rowLabel: string) => {
    if (!selectedShow) return;
    if (!confirm(`Supprimer tous les sièges libres de la rangée ${rowLabel} ?`)) return;
    const res = await api('DELETE', `/shows/${selectedShow.id}/seats/row/${rowLabel}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`${res.deleted} siège(s) supprimé(s)`);
    loadSeats(selectedShow);
  };

  const rows = [...new Set(seats.map(s => s.row_label))].sort();

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  if (selectedShow) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { setSelectedShow(null); setSeats([]); }}>
          <ChevronLeft className="w-4 h-4 mr-1"/> Retour
        </Button>
        <div>
          <h2 className="font-bold text-lg">{selectedShow.title}</h2>
          <p className="text-sm text-muted-foreground">{new Date(selectedShow.date).toLocaleDateString('fr-FR')} · {selectedShow.venue}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowRowForm(v => !v)} size="sm" className="gap-2">
            <Plus className="w-4 h-4"/> Ajouter une rangée
          </Button>
        </div>
      </div>

      {/* Formulaire ajout rangée */}
      {showRowForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold">Nouvelle rangée</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Lettre de rangée (A, B, I…)</Label>
              <Input value={rowLabel} onChange={e => setRowLabel(e.target.value.toUpperCase())} maxLength={2} placeholder="Ex: I" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Nombre de sièges</Label>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setSeatCount(c => Math.max(1,c-1))}>-</Button>
                <span className="w-8 text-center font-bold">{seatCount}</span>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setSeatCount(c => Math.min(30,c+1))}>+</Button>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Catégorie</Label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
                  style={{ borderColor: category === cat.value ? cat.color : 'hsl(var(--border))', background: category === cat.value ? cat.color + '22' : undefined, color: category === cat.value ? cat.color : undefined }}>
                  <div className="font-bold">{cat.label}</div>
                  <div className="text-[10px] opacity-70">{cat.multiplier}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Prix par siège (Ar)</Label>
            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={1000} step={1000} className="h-9"/>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleAddRow} disabled={savingRow}>
              {savingRow ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              Créer {seatCount} siège(s) rangée {rowLabel || '?'}
            </Button>
            <Button variant="outline" onClick={() => setShowRowForm(false)}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {CATEGORIES.map(c => (<span key={c.value} className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded" style={{ background: c.color + '33', border: `1px solid ${c.color}` }}/>
          {c.label}
        </span>))}
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-500/30 border border-green-500"/>Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-400/30 border border-red-400"/>Bloqué</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gray-400/30 border border-gray-500"/>Réservé</span>
        <span className="ml-auto text-muted-foreground font-medium">Cliquez sur un siège pour le bloquer/débloquer</span>
      </div>

      {/* Scène */}
      <div className="rounded-xl py-3 text-center text-xs font-bold uppercase tracking-widest text-amber-500 border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
        🎤 Scène
      </div>

      {loadingSeats ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8"/></div>
      ) : seats.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucun siège configuré. Ajoutez des rangées ci-dessus.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="space-y-2 min-w-[540px]">
            {rows.map(row => {
              const rowSeats = seats.filter(s => s.row_label === row).sort((a, b) => a.seat_number - b.seat_number);
              const cat = rowSeats[0]?.category ?? 'standard';
              const catMeta = CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[2];
              return (
                <div key={row} className="flex items-center gap-2">
                  <span className="w-7 text-right text-xs font-bold text-muted-foreground shrink-0">{row}</span>
                  <div className="flex gap-1 flex-wrap items-center">
                    {rowSeats.map(seat => {
                      const isFree    = seat.status === 'free';
                      const isBlocked = seat.status === 'blocked';
                      const isBooked  = seat.status === 'booked';
                      return (
                        <button key={seat.id} onClick={() => toggleSeat(seat)}
                          disabled={isBooked}
                          title={`${row}${seat.seat_number} · ${catMeta.label} · ${seat.price.toLocaleString()} Ar · ${seat.status}`}
                          className="w-8 h-8 rounded-md text-[11px] font-bold transition-all"
                          style={{
                            background: isBooked ? '#55555533' : isBlocked ? '#ef444433' : catMeta.color + '33',
                            border: `1.5px solid ${isBooked ? '#888' : isBlocked ? '#ef4444' : catMeta.color}`,
                            color: isBooked ? '#888' : isBlocked ? '#ef4444' : catMeta.color,
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                          }}>
                          {seat.seat_number}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{cat}</span>
                  <button onClick={() => deleteRow(row)}
                    className="ml-1 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-400 hover:text-red-600 transition-colors"
                    title={`Supprimer la rangée ${row}`}>
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      {seats.length > 0 && (
        <div className="flex gap-4 text-sm rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-green-600 font-medium">{seats.filter(s => s.status === 'free').length} libres</span>
          <span className="text-red-500 font-medium">{seats.filter(s => s.status === 'blocked').length} bloqués</span>
          <span className="text-muted-foreground">{seats.filter(s => s.status === 'booked').length} réservés</span>
          <span className="ml-auto text-muted-foreground">{seats.length} sièges total</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Gestion des sièges — Spectacles</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Créez des spectacles et gérez leurs places</p>
      </div>

      <Button onClick={() => { resetShowForm(); setShowShowForm(true); }} size="sm" className="gap-2 w-fit">
        <Plus className="w-4 h-4"/> Nouveau spectacle
      </Button>

      {/* Formulaire création/édition spectacle */}
      {showShowForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-xl">
          <h3 className="font-semibold">{editShowId ? 'Modifier le spectacle' : 'Nouveau spectacle'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Titre</Label>
              <Input value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Ex: Concert Jazz Night" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Artiste / Groupe (optionnel)</Label>
              <Input value={sArtist} onChange={e => setSArtist(e.target.value)} placeholder="Ex: Duo Mananjara" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Lieu</Label>
              <Input value={sVenue} onChange={e => setSVenue(e.target.value)} placeholder="Ex: Grande Salle Royale" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={sDate} onChange={e => setSDate(e.target.value)} className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Heure</Label>
              <Input type="time" value={sTime} onChange={e => setSTime(e.target.value)} className="h-9"/>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Catégorie</Label>
            <div className="flex flex-wrap gap-2">
              {SHOW_CATEGORIES.map(c => (
                <button key={c} onClick={() => setSCategory(c)}
                  className="px-3 py-1 rounded-xl text-sm border transition-all"
                  style={{ borderColor: sCategory===c ? '#e879f9' : 'hsl(var(--border))', background: sCategory===c ? '#e879f922' : undefined, color: sCategory===c ? '#e879f9' : undefined }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Prix de base (Ar) — sert de référence pour les catégories de sièges</Label>
            <Input type="number" value={sPrice} onChange={e => setSPrice(Number(e.target.value))} min={0} step={1000} className="h-9 max-w-xs"/>
          </div>
          <div className="space-y-1">
            <Label>Description (optionnel)</Label>
            <textarea value={sDesc} onChange={e => setSDesc(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Description du spectacle…"/>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveShow} disabled={savingShow} style={{ background:'#e879f9', color:'#000' }}>
              {savingShow ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editShowId ? 'Mettre à jour' : 'Créer le spectacle'}
            </Button>
            <Button variant="outline" onClick={resetShowForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {shows.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          Aucun spectacle. Créez-en un ci-dessus.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows.map(show => (
            <div key={show.id} className="rounded-2xl border bg-card p-5 space-y-3"
              style={{ borderColor: show.active ? '#e879f944' : 'hsl(var(--border))', opacity: show.active ? 1 : 0.6 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{show.title}</p>
                  {show.artist && <p className="text-xs text-muted-foreground">{show.artist}</p>}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: show.active ? '#22c55e22' : '#88888822', color: show.active ? '#22c55e' : '#888' }}>
                  {show.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>📅 {new Date(show.date).toLocaleDateString('fr-FR')} · {show.time}</p>
                <p>📍 {show.venue}</p>
                {show.category && <p>🎭 {show.category}</p>}
                <p className="text-purple-400 font-medium">{show.base_price.toLocaleString()} Ar base</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="gap-1 text-xs col-span-2" onClick={() => loadSeats(show)}>
                  🎫 Gérer les sièges
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => startEditShow(show)}>
                  <Pencil className="w-3 h-3"/> Modifier
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => toggleShow(show)}>
                  {show.active ? <ToggleRight className="w-4 h-4 text-purple-400"/> : <ToggleLeft className="w-4 h-4"/>}
                  {show.active ? 'Désactiver' : 'Activer'}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 border-red-200 hover:bg-red-50 col-span-2" onClick={() => deleteShow(show)}>
                  <Trash2 className="w-3 h-3"/> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
