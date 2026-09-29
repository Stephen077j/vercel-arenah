import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Clock, Banknote, Users, Hotel, Dumbbell, RefreshCw } from 'lucide-react';
import { adminApi, AdminStats } from '@/api/admin';
import { useClientAuth } from '@/client/lib/clientAuth';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M Ar`
  : n >= 1_000   ? `${(n/1_000).toFixed(0)}k Ar`
  : `${n.toLocaleString()} Ar`;

export default function AdminDashboard() {
  const { user } = useClientAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isSuperAdmin = user?.role === 'super_admin';
  const mod = user?.module_assigned ?? null;

  const load = async () => {
    setLoading(true);
    try { setStats(await adminApi.getDashboard()); }
    catch { /* silence */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const weeklyMax = Math.max(...(stats?.weekly_revenue?.map(d => Number(d.revenue)) ?? [1]), 1);

  const kpis = [
    { label:'Commandes today', value: stats?.today_orders ?? 0,         sub:'Nouvelles commandes',   Icon:ShoppingBag, color:'#a78bfa', show:!mod||['boutique','restaurant'].includes(mod) },
    { label:'Revenus today',   value: fmt(stats?.today_revenue ?? 0),   sub:'Recettes du jour',       Icon:TrendingUp,  color:'#d4a843', show:!mod||['boutique','restaurant'].includes(mod) },
    { label:'En attente',      value: stats?.pending_payments ?? 0,     sub:'Paiements à valider',    Icon:Clock,       color:'#f59e0b', show:true },
    { label:'Espèces',         value: stats?.pending_cash ?? 0,         sub:'Règlements sur place',   Icon:Banknote,    color:'#22c55e', show:true },
    { label:'Clients',         value: stats?.total_clients ?? 0,        sub:'Comptes actifs',         Icon:Users,       color:'#38bdf8', show:true },
    { label:'Hôtel today',     value: stats?.hotel_today ?? 0,         sub:'Réservations du jour',   Icon:Hotel,       color:'#f472b6', show:!mod||mod==='hotel' },
    { label:'Abonnés Gym',     value: stats?.gym_active ?? 0,          sub:'Abonnements actifs',     Icon:Dumbbell,    color:'#f87171', show:!mod||mod==='gym' },
  ].filter(k => k.show);

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--adm-text)', margin:0, letterSpacing:'-0.02em' }}>
            {isSuperAdmin ? 'Vue globale' : `Tableau de bord — ${mod ?? ''}`}
          </h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:14, marginBottom:24 }}>
        {kpis.map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="adm-kpi" style={{ position:'relative', overflow:'hidden' }}>
            <div className="adm-glow-line" />
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', color:'var(--adm-text-dim)', textTransform:'uppercase' }}>{label}</span>
              <div style={{ width:34, height:34, borderRadius:9, background:`${color}18`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:'var(--adm-text)', letterSpacing:'-0.02em', lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:11, color:'var(--adm-text-muted)', marginTop:6 }}>{sub}</div>
            <div style={{ position:'absolute', bottom:-20, right:-20, width:80, height:80, borderRadius:'50%', background:`${color}08` }} />
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
        {/* Chart */}
        <div className="adm-card" style={{ padding:24, position:'relative', overflow:'hidden' }}>
          <div className="adm-glow-line" />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--adm-text)', margin:0 }}>Revenus — 7 derniers jours</h2>
              <p style={{ fontSize:12, color:'var(--adm-text-muted)', margin:'3px 0 0' }}>Commandes confirmées</p>
            </div>
            {stats?.weekly_revenue && <span style={{ fontSize:12, color:'var(--adm-gold)', fontWeight:600 }}>
              Total: {fmt(stats.weekly_revenue.reduce((s,d) => s+Number(d.revenue),0))}
            </span>}
          </div>
          {stats?.weekly_revenue?.length ? (
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
              {stats.weekly_revenue.map((d, i) => {
                const h = Math.max(4, (Number(d.revenue)/weeklyMax)*100);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ fontSize:9, color:'var(--adm-text-muted)', fontWeight:500 }}>{fmt(Number(d.revenue)).replace(' Ar','')}</div>
                    <div style={{ width:'100%', borderRadius:'5px 5px 0 0', height:`${h}%`, minHeight:4, background:'linear-gradient(180deg,#d4a843,#7c5c0e)', opacity:0.85 }} />
                    <div style={{ fontSize:9, color:'var(--adm-text-muted)' }}>{d.day}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--adm-text-muted)', fontSize:13 }}>
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="adm-card" style={{ padding:24, position:'relative', overflow:'hidden' }}>
          <div className="adm-glow-line" />
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--adm-text)', margin:'0 0 14px' }}>Actions rapides</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { to:'/admin/paiements',    label:'Valider paiements',  color:'#f59e0b', show:true },
              { to:'/admin/commandes',    label:'Voir commandes',     color:'#a78bfa', show:!mod||['boutique','restaurant'].includes(mod) },
              { to:'/admin/reservations', label:'Réservations',       color:'#38bdf8', show:!mod||!['boutique','restaurant'].includes(mod) },
              { to:'/admin/produits',     label:'Gérer produits',     color:'#22c55e', show:!mod||['boutique','restaurant'].includes(mod) },
              { to:'/admin/clients',      label:'Liste clients',      color:'#f472b6', show:true },
            ].filter(a => a.show).map(a => (
              <Link key={a.to} to={a.to} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                background:'rgba(255,255,255,0.03)', border:'1px solid var(--adm-border)',
                textDecoration:'none', color:'var(--adm-text)', fontSize:13, fontWeight:500, transition:'all 0.18s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=`${a.color}44`; el.style.background=`${a.color}0d`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='var(--adm-border)'; el.style.background='rgba(255,255,255,0.03)'; }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:a.color, flexShrink:0 }} />
                {a.label}
                <span style={{ marginLeft:'auto', color:'var(--adm-text-muted)' }}>›</span>
              </Link>
            ))}
          </div>
          {(stats?.pending_payments ?? 0) > 0 && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)' }}>
              <div style={{ fontSize:12, color:'#f59e0b', fontWeight:600 }}>⚠ {stats!.pending_payments} paiement(s) en attente</div>
              <div style={{ fontSize:11, color:'var(--adm-text-muted)', marginTop:2 }}>Action requise</div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
