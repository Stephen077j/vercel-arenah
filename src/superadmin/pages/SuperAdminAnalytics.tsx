import { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, Download, Hotel, Monitor, Trophy } from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const PERIODS = [
  { label: '7 jours',  value: '7d',  days: 7   },
  { label: '30 jours', value: '30d', days: 30  },
  { label: '3 mois',   value: '90d', days: 90  },
  { label: '1 an',     value: '1y',  days: 365 },
] as const;

type PeriodValue = typeof PERIODS[number]['value'];

const MODULE_LABELS: Record<string, string> = {
  boutique: 'Boutique', restaurant: 'Restaurant', hotel: 'Hôtel',
  show: 'Spectacles', salon: 'Salon', gym: 'Gym', pool: 'Piscine',
  field: 'Terrain', cybercafe: 'Cybercafé', kids: 'Kids', laundry: 'Laverie',
};

const MODULE_COLORS: Record<string, string> = {
  boutique: '#a78bfa', restaurant: '#f59e0b', hotel: '#f472b6',
  show: '#e879f9', salon: '#fb923c', gym: '#f87171', pool: '#38bdf8',
  field: '#4ade80', cybercafe: '#22d3ee', kids: '#fbbf24', laundry: '#94a3b8',
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M Ar`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}k Ar`
  : `${Math.round(n).toLocaleString('fr-FR')} Ar`;

const api = async (path: string) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface RevenueRow { day: string; module: string; revenue: number; count: number }
interface Kpis {
  today_revenue: number; week_revenue: number; month_revenue: number;
  total_clients: number; new_clients_month: number;
  by_module: { module: string; revenue: number; count: number }[];
  by_method: { method: string; revenue: number; count: number }[];
}
interface ClientData { total: number; new_count: number; by_day: { day: string; count: number }[] }
interface Occupancy {
  hotel:    { total: number; occupied: number; rate: number };
  cybercafe:{ active: number; total: number };
  field:    { booked: number; total: number };
}

/* ─── Mini bar chart ────────────────────────────────────────────────────── */

function BarChart({ data, color = '#d4a843', height = 130 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  if (!data.length)
    return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontSize:13 }}>Aucune donnée</div>;
  const dense = data.length > 20;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap: dense ? 2 : 5, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div
            title={`${d.label}: ${fmt(d.value)}`}
            style={{
              width:'100%', borderRadius:'3px 3px 0 0',
              height:`${Math.max(2,(d.value/max)*100)}%`, minHeight:2,
              background:`linear-gradient(180deg,${color},${color}88)`,
            }}
          />
          {!dense && (
            <div style={{ fontSize:9, color:'#64748b', whiteSpace:'nowrap', maxWidth:30, overflow:'hidden', textOverflow:'ellipsis' }}>
              {d.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color='#d4a843' }: { label:string; value:string; sub:string; color?:string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

export default function SuperAdminAnalytics() {
  const [period, setPeriod]       = useState<PeriodValue>('30d');
  const [loading, setLoading]     = useState(true);
  const [kpis, setKpis]           = useState<Kpis | null>(null);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [clientData, setClientData]   = useState<ClientData | null>(null);
  const [occupancy, setOccupancy]     = useState<Occupancy | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, rev, cli, occ] = await Promise.all([
        api('/api/sa/analytics/kpis'),
        api(`/api/sa/analytics/revenue?period=${period}`),
        api(`/api/sa/analytics/clients?period=${period}`),
        api('/api/sa/analytics/occupancy'),
      ]);
      setKpis(k);
      setRevenueRows(rev.rows ?? []);
      setClientData(cli);
      setOccupancy(occ);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  /* ── Derived ── */
  const days = PERIODS.find(p => p.value === period)!.days;

  const revenueChart = useMemo(() => {
    const byDay: Record<string, number> = {};
    revenueRows.forEach(r => { byDay[r.day] = (byDay[r.day] ?? 0) + Number(r.revenue); });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ label: period === '1y' ? day.slice(0,7) : day.slice(5), value }));
  }, [revenueRows, period]);

  const byModule = useMemo(() => {
    const m: Record<string, number> = {};
    revenueRows.forEach(r => { if (r.module) m[r.module] = (m[r.module] ?? 0) + Number(r.revenue); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [revenueRows]);
  const moduleMax = byModule[0]?.[1] ?? 1;

  const totalRevenue = useMemo(() => revenueRows.reduce((s, r) => s + Number(r.revenue), 0), [revenueRows]);

  const clientChart = useMemo(() =>
    (clientData?.by_day ?? []).map(r => ({
      label: period === '1y' ? r.day.slice(0, 7) : r.day.slice(5),
      value: Number(r.count),
    }))
  , [clientData, period]);

  /* ── Excel export ── */
  const exportExcel = () => {
    if (!revenueRows.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      revenueRows.map(r => ({
        Date:         r.day,
        Module:       MODULE_LABELS[r.module] ?? r.module,
        'Montant Ar': Number(r.revenue),
        Transactions: Number(r.count),
      }))
    ), 'Revenus');
    if (clientData?.by_day?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        clientData.by_day.map(d => ({ Date: d.day, 'Nouveaux clients': Number(d.count) }))
      ), 'Clients');
    }
    XLSX.writeFile(wb, `ARENAH-analytics-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  /* ── Render ── */
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Revenus · Occupation · Clients — base de données locale</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button onClick={exportExcel} disabled={loading || !revenueRows.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Erreur : {error}. Assurez-vous que le serveur Express tourne sur le port 3001.
        </div>
      )}

      {/* ── Revenus ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Aujourd'hui"    value={fmt(kpis?.today_revenue ?? 0)} sub="recettes du jour"           color="#d4a843" />
          <StatCard label="Cette semaine"  value={fmt(kpis?.week_revenue  ?? 0)} sub="7 derniers jours"           color="#a78bfa" />
          <StatCard label={`Total ${days}j`} value={fmt(totalRevenue)}            sub={`sur ${days} jours`}        color="#38bdf8" />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-4">Évolution des revenus</div>
          <BarChart data={revenueChart} height={140} color="#d4a843" />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-4">Répartition par module</div>
          {byModule.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              {loading ? 'Chargement…' : 'Aucune donnée sur la période'}
            </div>
          ) : (
            <div className="space-y-3">
              {byModule.map(([mod, rev]) => (
                <div key={mod} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground shrink-0 text-right">{MODULE_LABELS[mod] ?? mod}</div>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width:`${Math.max(2,(rev/moduleMax)*100)}%`,
                      background: MODULE_COLORS[mod] ?? '#d4a843',
                      opacity: 0.8,
                    }} />
                  </div>
                  <div className="w-28 text-xs font-semibold text-right shrink-0">{fmt(rev)}</div>
                  <div className="w-10 text-xs text-muted-foreground shrink-0">{Math.round((rev/(totalRevenue||1))*100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Occupation ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupation (aujourd'hui)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="h-4 w-4 text-pink-400" /><div className="text-sm font-semibold">Hôtel</div>
            </div>
            <div className="text-3xl font-bold">
              {occupancy?.hotel.occupied ?? '—'}
              <span className="text-base font-normal text-muted-foreground">/{occupancy?.hotel.total ?? '—'}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">chambres occupées</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-pink-400" style={{ width:`${occupancy?.hotel.rate ?? 0}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{occupancy?.hotel.rate ?? 0}% d'occupation</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-4 w-4 text-cyan-400" /><div className="text-sm font-semibold">Cybercafé</div>
            </div>
            <div className="text-3xl font-bold">
              {occupancy?.cybercafe.active ?? '—'}
              <span className="text-base font-normal text-muted-foreground">/{occupancy?.cybercafe.total ?? 10}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">sessions actives</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-cyan-400" style={{ width:`${Math.min(100,Math.round(((occupancy?.cybercafe.active??0)/10)*100))}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-green-400" /><div className="text-sm font-semibold">Terrain</div>
            </div>
            <div className="text-3xl font-bold">
              {occupancy?.field.booked ?? '—'}
              <span className="text-base font-normal text-muted-foreground">/{occupancy?.field.total ?? 14}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">créneaux réservés</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-400" style={{ width:`${Math.min(100,Math.round(((occupancy?.field.booked??0)/14)*100))}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Clients ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Total comptes" value={(kpis?.total_clients ?? 0).toLocaleString('fr-FR')} sub="clients enregistrés" color="#38bdf8" />
          <StatCard label={`Nouveaux (${days}j)`} value={`+${(clientData?.new_count ?? 0).toLocaleString('fr-FR')}`} sub={`inscriptions sur ${days} jours`} color="#4ade80" />
        </div>
        {clientChart.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold mb-4">Inscriptions clients</div>
            <BarChart data={clientChart} height={100} color="#4ade80" />
          </div>
        )}
      </section>
    </div>
  );
}
