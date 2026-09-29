/**
 * Gestion d'un type d'offre par l'admin (prestations, forfaits, cours…).
 * Composant unique réutilisé par tous les modules : même apparence et même
 * comportement partout. Les données passent par /api/admin/catalog/:kind.
 *
 * Retirer une offre la masque du site et du chatbot sans la supprimer :
 * les réservations passées restent intactes et on peut la réactiver.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Loader2, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'tags' | 'url';
  required?: boolean;
  placeholder?: string;
  suffix?: string;               // « Ar », « min »…
  step?: number;
  defaultValue?: string | number;
  options?: { value: string; label: string }[];
  hint?: string;
}

type Row = Record<string, unknown> & { id: string | number; active: boolean };

interface Props {
  kind: string;                  // clé côté serveur (ex. "salon-services")
  title: string;
  description: string;
  icon: string;                  // emoji
  accent: string;                // couleur du module
  fields: FieldDef[];
  titleField: string;
  priceField?: string;
  priceSuffix?: string;
  details: (row: Row) => string;
  groupBy?: string;              // regroupe les cartes (ex. par catégorie)
  addLabel: string;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('arenah_token');
  const res = await fetch(`/api/admin/catalog${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data as T;
}

const fmt = (n: unknown) => Number(n ?? 0).toLocaleString('fr-FR');

export default function CatalogManager(p: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showRetired, setShowRetired] = useState(false);

  const load = async () => {
    try { setRows(await call<Row[]>('GET', `/${p.kind}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Chargement impossible'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [p.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (row: Row | 'new') => {
    const values: Record<string, string> = {};
    for (const f of p.fields) {
      const v = row === 'new' ? f.defaultValue : row[f.name];
      values[f.name] = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v);
    }
    setForm(values);
    setEditing(row);
  };

  const save = async () => {
    const missing = p.fields.find(f => f.required && !form[f.name]?.trim());
    if (missing) { toast.error(`${missing.label} : champ obligatoire`); return; }
    const body: Record<string, unknown> = {};
    for (const f of p.fields) {
      const v = form[f.name]?.trim() ?? '';
      body[f.name] = f.type === 'number' ? (v === '' ? null : Number(v))
        : f.type === 'tags' ? v.split(',').map(s => s.trim()).filter(Boolean)
        : v;
    }
    setSaving(true);
    try {
      if (editing === 'new') await call('POST', `/${p.kind}`, body);
      else if (editing) await call('PUT', `/${p.kind}/${editing.id}`, body);
      toast.success(editing === 'new' ? 'Offre ajoutée : elle est déjà visible sur le site' : 'Modifications enregistrées');
      setEditing(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const setActive = async (row: Row, active: boolean) => {
    const name = String(row[p.titleField]);
    if (!active && !confirm(`Retirer « ${name} » du site ?\nLes réservations passées sont conservées ; vous pourrez la réactiver.`)) return;
    try {
      if (active) await call('PUT', `/${p.kind}/${row.id}`, { active: true });
      else await call('DELETE', `/${p.kind}/${row.id}`);
      toast.success(active ? `« ${name} » est de nouveau proposée` : `« ${name} » est retirée du site`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
  };

  const active = rows.filter(r => r.active);
  const retired = rows.filter(r => !r.active);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? active.filter(r => p.fields.some(f => String(r[f.name] ?? '').toLowerCase().includes(q))) : active;
  }, [active, search, p.fields]);
  const groups = useMemo(() => {
    if (!p.groupBy) return [['', filtered]] as [string, Row[]][];
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const g = String(r[p.groupBy] ?? 'Autre');
      map.set(g, [...(map.get(g) ?? []), r]);
    }
    return [...map];
  }, [filtered, p.groupBy]);

  const card = (r: Row) => (
    <div key={String(r.id)}
      className="group rounded-2xl border bg-card p-4 flex flex-col gap-3 transition-all hover:shadow-md"
      style={{ borderColor: r.active ? `${p.accent}40` : 'hsl(var(--border))', opacity: r.active ? 1 : 0.6 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-snug truncate" title={String(r[p.titleField])}>{String(r[p.titleField])}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.details(r)}</p>
        </div>
        {p.priceField && (
          <span className="shrink-0 text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: `${p.accent}18`, color: p.accent }}>
            {fmt(r[p.priceField])}{p.priceSuffix ?? ' Ar'}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-auto">
        {r.active ? (
          <>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => open(r)}>
              <Pencil className="w-3 h-3" /> Modifier
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-muted-foreground" title="Retirer du site"
              onClick={() => setActive(r, false)}>
              <EyeOff className="w-3 h-3" /> Retirer
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setActive(r, true)}>
            <RotateCcw className="w-3 h-3" /> Réactiver
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${p.accent}18` }}>
            {p.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{p.title}</h2>
            <p className="text-sm text-muted-foreground">{p.description}</p>
            {!loading && (
              <p className="text-xs mt-1" style={{ color: p.accent }}>
                <Eye className="inline w-3 h-3 mr-1" />{active.length} proposée{active.length > 1 ? 's' : ''} sur le site
                {retired.length > 0 && <span className="text-muted-foreground"> · {retired.length} retirée{retired.length > 1 ? 's' : ''}</span>}
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => open('new')} className="gap-2" style={{ background: p.accent, color: '#fff' }}>
          <Plus className="w-4 h-4" /> {p.addLabel}
        </Button>
      </div>

      {/* Formulaire */}
      {editing && (
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm" style={{ borderColor: `${p.accent}66` }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editing === 'new' ? p.addLabel : `Modifier « ${String(editing[p.titleField])} »`}</h3>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground" aria-label="Fermer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {p.fields.map(f => (
              <div key={f.name} className={`space-y-1 ${f.type === 'tags' || f.type === 'url' ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`${p.kind}-${f.name}`}>{f.label}{f.required && <span className="text-red-500"> *</span>}</Label>
                {f.type === 'select' ? (
                  <select id={`${p.kind}-${f.name}`} value={form[f.name] ?? ''} onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <div className="relative">
                    <Input id={`${p.kind}-${f.name}`} className={`h-9 ${f.suffix ? 'pr-12' : ''}`}
                      type={f.type === 'number' ? 'number' : 'text'} min={0} step={f.step}
                      value={form[f.name] ?? ''} placeholder={f.placeholder}
                      onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') save(); }} />
                    {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.suffix}</span>}
                  </div>
                )}
                {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="gap-2" style={{ background: p.accent, color: '#fff' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing === 'new' ? 'Ajouter et publier' : 'Enregistrer'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Recherche (listes longues) */}
      {active.length > 8 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="h-9 pl-9" />
        </div>
      )}

      {/* Offres proposées */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : active.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-2xl">
          <p className="text-3xl mb-2">{p.icon}</p>
          <p className="text-sm text-muted-foreground">Aucune offre proposée pour l'instant.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => open('new')}><Plus className="w-3 h-3" /> {p.addLabel}</Button>
        </div>
      ) : (
        groups.map(([group, list]) => (
          <div key={group} className="space-y-2">
            {group && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group} · {list.length}</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map(card)}</div>
          </div>
        ))
      )}
      {!loading && search && filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun résultat pour « {search} ».</p>}

      {/* Offres retirées */}
      {retired.length > 0 && (
        <div>
          <button onClick={() => setShowRetired(v => !v)} className="text-xs text-muted-foreground hover:text-foreground">
            {showRetired ? '▾' : '▸'} Offres retirées ({retired.length})
          </button>
          {showRetired && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">{retired.map(card)}</div>}
        </div>
      )}
    </section>
  );
}
