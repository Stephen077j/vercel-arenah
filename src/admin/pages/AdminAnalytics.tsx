import { useEffect, useState, useCallback } from 'react';
import { Download, TrendingUp, Users, Calendar, RefreshCw, BarChart2, BedDouble, Zap } from 'lucide-react';
import '../admin.css';

const API = '/api/analytics';
const PERIODS = [
  { label: '7 jours',   value: '7d'  },
  { label: '30 jours',  value: '30d' },
  { label: '3 mois',    value: '90d' },
  { label: '1 an',      value: '1y'  },
];
const MODULE_LABELS: Record<string,string> = {
  order:'Boutique', hotel:'Hôtel', gym:'Gym', salon:'Salon',
  field:'Terrain', pool:'Piscine', event:'Événement', show:'Spectacle', cybercafe:'Cybercafé',
};
const MODULE_COLORS = ['#d4a843','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];
const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;

interface KPI { today_revenue: number; week_revenue: number; month_revenue: number; total_clients: number; new_clients_month: number; by_module: {module:string;revenue:number;count:number}[]; by_method:{method:string;revenue:number;count:number}[]; }
interface OccupancyHotel { total:number; occupied:number; free:number; rate:number; history:{date:string;occupied:number}[]; }
interface OccupancyField  { total:number; booked:number;   free:number; rate:number; }

function auth(): HeadersInit { return { Authorization: `Bearer ${localStorage.getItem('arenah_token')}` }; }

async function apiFetch<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: auth() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Mini bar chart SVG ────────────────────────────────────────────────────
function BarChart({ data, colorKey }: { data: { label: string; value: number }[]; colorKey?: string }) {
  if (!data.length) return <p style={{ color: 'var(--adm-muted)', fontSize: 13 }}>Aucune donnée</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minWidth: data.length * 30, height: 100 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 24 }}>
            <div
              title={`${d.label}: ${fmt(d.value)}`}
              style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                background: colorKey ? MODULE_COLORS[i % MODULE_COLORS.length] : 'var(--adm-gold)',
                height: `${Math.max(4, (d.value / max) * 80)}px`,
                transition: 'height 0.4s',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4, minWidth: data.length * 30 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: 24, textAlign: 'center', fontSize: 9, color: 'var(--adm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label.slice(5)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gauge circulaire ──────────────────────────────────────────────────────
function Gauge({ rate, label }: { rate: number; label: string }) {
  const r = 44, c = 2 * Math.PI * r;
  const dash = (rate / 100) * c;
  const color = rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 100 100" style={{ width: 100, height: 100 }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.8s' }} />
        <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{rate}%</text>
      </svg>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--adm-muted)' }}>{label}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [period, setPeriod]   = useState('30d');
  const [kpi, setKpi]         = useState<KPI | null>(null);
  const [hotel, setHotel]     = useState<OccupancyHotel | null>(null);
  const [field, setField]     = useState<OccupancyField | null>(null);
  const [revenue, setRevenue] = useState<{ day: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExp]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [k, h, f, rev] = await Promise.all([
        apiFetch<KPI>(`${API}/kpis`),
        apiFetch<OccupancyHotel>(`${API}/occupancy/hotel`),
        apiFetch<OccupancyField>(`${API}/occupancy/field`),
        apiFetch<{ rows: { day: string; revenue: number; module: string }[] }>(`${API}/revenue?period=${period}`),
      ]);
      setKpi(k); setHotel(h); setField(f);
      // Agréger par jour
      const map: Record<string, number> = {};
      for (const r of rev.rows) map[r.day] = (map[r.day] || 0) + Number(r.revenue);
      setRevenue(Object.entries(map).map(([day, revenue]) => ({ day, revenue })).slice(-28));
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = async () => {
    setExp(true);
    try {
      const r = await fetch(`${API}/export?period=${period}`, { headers: auth() });
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `ARENAH-rapport-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setExp(false); }
  };

  return (
    <div className="adm-layout">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Analytics</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--adm-muted)', fontSize: 13 }}>Revenus, occupation, clients</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="adm-card" style={{ display: 'flex', padding: 4, gap: 2 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={period === p.value ? 'adm-btn-gold' : 'adm-btn-ghost'}
                style={{ padding: '6px 12px', fontSize: 12, minWidth: 'unset' }}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="adm-btn-ghost" onClick={load} style={{ gap: 6 }} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          <button className="adm-btn-gold" onClick={exportExcel} disabled={exporting} style={{ gap: 6 }}>
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Export…' : 'Excel'}
          </button>
        </div>
      </div>

      {err && <div className="adm-card" style={{ color: '#ef4444', marginBottom: 16 }}>{err}</div>}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <TrendingUp className="w-5 h-5" />, label: "Aujourd'hui", value: kpi ? fmt(kpi.today_revenue) : '—', color: '#d4a843' },
          { icon: <BarChart2 className="w-5 h-5" />,  label: 'Cette semaine', value: kpi ? fmt(kpi.week_revenue) : '—',  color: '#3b82f6' },
          { icon: <Calendar className="w-5 h-5" />,   label: 'Ce mois',       value: kpi ? fmt(kpi.month_revenue) : '—', color: '#10b981' },
          { icon: <Users className="w-5 h-5" />,      label: 'Clients total', value: kpi ? kpi.total_clients.toLocaleString() : '—', color: '#8b5cf6' },
          { icon: <Zap className="w-5 h-5" />,        label: 'Nouveaux (mois)', value: kpi ? kpi.new_clients_month.toLocaleString() : '—', color: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} className="adm-kpi">
            <span style={{ color: k.color }}>{k.icon}</span>
            <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginTop: 4 }}>{loading ? '…' : k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Revenus timeline */}
        <div className="adm-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Revenus — {PERIODS.find(p => p.value === period)?.label}</h3>
          {loading ? <p style={{ color: 'var(--adm-muted)' }}>Chargement…</p> : <BarChart data={revenue.map(r => ({ label: r.day, value: r.revenue }))} />}
        </div>

        {/* Par module */}
        <div className="adm-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Par module (30j)</h3>
          {loading ? <p style={{ color: 'var(--adm-muted)' }}>Chargement…</p> : !kpi?.by_module.length ? <p style={{ color: 'var(--adm-muted)', fontSize: 13 }}>Aucune donnée</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kpi.by_module.map((m, i) => {
                const max = Math.max(...kpi.by_module.map(x => Number(x.revenue)));
                const pct = max ? Math.round(Number(m.revenue) / max * 100) : 0;
                return (
                  <div key={m.module}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--adm-text)' }}>{MODULE_LABELS[m.module] ?? m.module}</span>
                      <span style={{ color: MODULE_COLORS[i % MODULE_COLORS.length], fontWeight: 700 }}>{fmt(m.revenue)}</span>
                    </div>
                    <div style={{ height: 5, background: '#1e293b', borderRadius: 3 }}>
                      <div style={{ height: 5, width: `${pct}%`, background: MODULE_COLORS[i % MODULE_COLORS.length], borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Occupation hôtel */}
        <div className="adm-card" style={{ gridColumn: '1 / 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}><BedDouble className="w-4 h-4" style={{ display: 'inline', marginRight: 6 }} />Occupation Hôtel</h3>
            {hotel && <span className="adm-pill" style={{ background: hotel.rate > 80 ? '#fee2e2' : '#f0fdf4', color: hotel.rate > 80 ? '#ef4444' : '#16a34a' }}>{hotel.occupied}/{hotel.total} chambres</span>}
          </div>
          {loading ? <p style={{ color: 'var(--adm-muted)' }}>Chargement…</p> : hotel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Gauge rate={hotel.rate} label="Taux aujourd'hui" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: 'var(--adm-muted)', marginBottom: 8 }}>7 derniers jours</p>
                <BarChart data={hotel.history.map(h => ({ label: h.date, value: Number(h.occupied) }))} />
              </div>
            </div>
          )}
        </div>

        {/* Occupation terrain */}
        <div className="adm-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Terrain aujourd'hui</h3>
          {loading ? <p style={{ color: 'var(--adm-muted)' }}>Chargement…</p> : field && (
            <div style={{ textAlign: 'center' }}>
              <Gauge rate={field.rate} label={`${field.booked}/${field.total} créneaux`} />
            </div>
          )}
        </div>
      </div>

      {/* Méthodes paiement */}
      {kpi?.by_method && kpi.by_method.length > 0 && (
        <div className="adm-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Méthodes de paiement (30j)</h3>
          <table className="adm-table">
            <thead><tr><th>Méthode</th><th>Transactions</th><th>Revenus</th><th>Part</th></tr></thead>
            <tbody>
              {(() => {
                const total = kpi.by_method.reduce((a, m) => a + Number(m.revenue), 0);
                return kpi.by_method.map((m, i) => (
                  <tr key={m.method}>
                    <td><span style={{ color: MODULE_COLORS[i % MODULE_COLORS.length], fontWeight: 600, textTransform: 'capitalize' }}>{m.method}</span></td>
                    <td>{m.count}</td>
                    <td style={{ color: 'var(--adm-gold)', fontWeight: 700 }}>{fmt(m.revenue)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3 }}>
                          <div style={{ height: 6, width: `${total ? Math.round(Number(m.revenue)/total*100) : 0}%`, background: MODULE_COLORS[i % MODULE_COLORS.length], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--adm-muted)', minWidth: 28 }}>{total ? Math.round(Number(m.revenue)/total*100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
