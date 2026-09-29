import { useEffect, useState } from 'react';
import { Loader2, Search, History, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HistoryRow {
  id: string;
  type: string;
  module: string;
  user_email: string;
  customer_name: string | null;
  amount: number | null;
  status: string;
  created_at: string;
}

const MODULE_COLOR: Record<string, string> = {
  hotel:      '#38bdf8',
  gym:        '#f87171',
  pool:       '#22d3ee',
  field:      '#a3e635',
  event:      '#818cf8',
  spectacles: '#e879f9',
  cybercafe:  '#94a3b8',
  restaurant: '#f59e0b',
  boutique:   '#a78bfa',
  paiement:   '#22c55e',
  kids:       '#f472b6',
};

const TYPE_LABEL: Record<string, string> = {
  hotel:          '🏨 Hôtel',
  gym_session:    '💪 Gym session',
  gym_coach:      '🏋️ Gym coach',
  pool_pass:      '🏊 Pass piscine',
  pool_entry:     '🏊 Entrée piscine',
  field:          '⚽ Terrain',
  event:          '🏛️ Événement',
  spectacle:      '🎭 Spectacle',
  cybercafe:      '🖥️ Cybercafé',
  restaurant_table:'🍽️ Table restaurant',
  order:          '🛍️ Commande',
  payment:        '💳 Paiement',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#22c55e',
  active:    '#22c55e',
  pending:   '#f59e0b',
  paid:      '#22c55e',
  cancelled: '#ef4444',
  annulee:   '#ef4444',
  completed: '#3b82f6',
  refused:   '#ef4444',
};

const MODULES = ['hotel','gym','pool','field','event','spectacles','cybercafe','restaurant','boutique','paiement'];

function api(path: string) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
}

export default function SuperAdminHistory() {
  const [rows, setRows]       = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [module, setModule]   = useState('');
  const [limit, setLimit]     = useState(100);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit) });
    if (module) params.set('module', module);
    if (search) params.set('user_id', search);
    const data = await api(`/history?${params}`);
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [module, limit]); // eslint-disable-line

  const filtered = search
    ? rows.filter(r => r.user_email.toLowerCase().includes(search.toLowerCase()) || (r.customer_name ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalAmount = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-amber-400"/> Historique global
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Toutes les réservations, commandes et paiements de la plateforme
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Entrées affichées</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalAmount.toLocaleString()} Ar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Volume total</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {new Set(filtered.map(r => r.user_email)).size}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Utilisateurs distincts</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par email ou nom…"
            className="pl-9 h-9 w-64"/>
        </div>

        <div className="flex items-center gap-1">
          <Filter size={14} className="text-muted-foreground"/>
          <button onClick={() => setModule('')}
            className="px-2.5 py-1 rounded-lg text-xs border transition-all"
            style={{ background: module==='' ? '#f59e0b22' : undefined, borderColor: module==='' ? '#f59e0b' : 'hsl(var(--border))', color: module==='' ? '#f59e0b' : undefined }}>
            Tous
          </button>
          {MODULES.map(m => (
            <button key={m} onClick={() => setModule(module===m ? '' : m)}
              className="px-2.5 py-1 rounded-lg text-xs border transition-all capitalize"
              style={{
                background: module===m ? (MODULE_COLOR[m]??'#888')+'22' : undefined,
                borderColor: module===m ? (MODULE_COLOR[m]??'#888') : 'hsl(var(--border))',
                color: module===m ? (MODULE_COLOR[m]??'#888') : undefined,
              }}>
              {m}
            </button>
          ))}
        </div>

        <select value={limit} onChange={e => setLimit(Number(e.target.value))}
          className="h-9 px-3 rounded-lg border text-xs bg-background">
          <option value={50}>50 dernières</option>
          <option value={100}>100 dernières</option>
          <option value={250}>250 dernières</option>
          <option value={500}>500 dernières</option>
        </select>

        <button onClick={load}
          className="h-9 px-4 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
          🔄 Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin"/> Chargement de l'historique…
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const modColor = MODULE_COLOR[r.module] ?? '#888';
                  const stColor  = STATUS_COLOR[r.status] ?? '#64748b';
                  return (
                    <tr key={`${r.type}-${r.id}-${i}`}
                      className={`border-b transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{
                          padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600,
                          background: modColor + '22', color: modColor, border: `1px solid ${modColor}44`,
                        }}>
                          {r.module}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.user_email}</td>
                      <td className="px-4 py-2.5 text-xs">{r.customer_name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right font-semibold">
                        {r.amount != null && Number(r.amount) > 0
                          ? <span style={{ color: '#22c55e' }}>{Number(r.amount).toLocaleString()} Ar</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{
                          padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600,
                          background: stColor + '22', color: stColor, border: `1px solid ${stColor}44`,
                        }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      Aucune entrée dans l'historique
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
