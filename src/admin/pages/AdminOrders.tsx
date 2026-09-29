import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminApi, AdminOrder, OrderStatus } from '@/api/admin';
import { toast } from 'sonner';

const STATUS_META: Record<string, { label:string; color:string; badge:string }> = {
  en_attente:  { label:'En attente',    color:'#f59e0b', badge:'adm-badge adm-badge-amber' },
  preparation: { label:'En préparation',color:'#a78bfa', badge:'adm-badge adm-badge-blue'  },
  expediee:    { label:'Expédiée',      color:'#38bdf8', badge:'adm-badge adm-badge-blue'  },
  livree:      { label:'Livrée',        color:'#22c55e', badge:'adm-badge adm-badge-green' },
  annulee:     { label:'Annulée',       color:'#ef4444', badge:'adm-badge adm-badge-red'   },
};
const NEXT: Partial<Record<OrderStatus,OrderStatus>> = {
  en_attente:'preparation', preparation:'expediee', expediee:'livree',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string|null>(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const load = async (s?: string) => {
    setLoading(true);
    try { setOrders(await adminApi.getAllOrders(s && s !== 'all' ? { status:s } : {})); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(filter); }, [filter]);

  const advance = async (o: AdminOrder) => {
    const next = NEXT[o.status as OrderStatus];
    if (!next) return;
    setActing(o.id);
    try {
      await adminApi.updateOrderStatus(o.id, next);
      setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status:next } : x));
      toast.success(`Commande → ${STATUS_META[next]?.label}`);
    } catch { toast.error('Erreur'); }
    finally { setActing(null); }
  };

  const cancel = async (o: AdminOrder) => {
    if (!confirm('Annuler cette commande ?')) return;
    setActing(o.id);
    try {
      await adminApi.updateOrderStatus(o.id, 'annulee');
      setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status:'annulee' } : x));
      toast.success('Commande annulée');
    } catch { toast.error('Erreur'); }
    finally { setActing(null); }
  };

  const FILTERS = ['all','en_attente','preparation','expediee','livree','annulee'];
  const visible = orders.filter(o => !q || (o.customer_name??'').toLowerCase().includes(q.toLowerCase()) || o.id.includes(q));

  const fmtPrice = (n: number) => `${Number(n).toLocaleString()} Ar`;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--adm-text)', margin:0 }}>Commandes</h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>{orders.length} commande(s)</p>
        </div>
        <button onClick={() => load(filter)} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /> Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`adm-pill${filter===f?' active':''}`}>
            {f === 'all' ? 'Toutes' : STATUS_META[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:18 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--adm-text-muted)' }} />
        <input className="adm-input" style={{ paddingLeft:34 }} placeholder="Rechercher client ou ID…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Chargement…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Aucune commande</div>
      ) : (
        <div className="adm-card" style={{ overflow:'hidden' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Module</th>
                <th style={{ textAlign:'right' }}>Montant</th>
                <th>Statut</th>
                <th>Date</th>
                <th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(o => {
                const sm = STATUS_META[o.status] ?? { label:o.status, color:'#888', badge:'adm-badge' };
                const next = NEXT[o.status as OrderStatus];
                const isActing = acting === o.id;
                return (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{o.customer_name ?? '—'}</div>
                      <div style={{ fontSize:11, color:'var(--adm-text-muted)', fontFamily:'monospace' }}>{o.id.slice(0,8)}…</div>
                      {o.items_summary && <div style={{ fontSize:11, color:'var(--adm-text-dim)', marginTop:2 }}>{o.items_summary}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(255,255,255,0.06)', color:'var(--adm-text-dim)', fontWeight:500 }}>
                        {o.module}
                      </span>
                    </td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--adm-gold)', fontSize:14 }}>
                      {fmtPrice(o.total)}
                    </td>
                    <td>
                      <span className={sm.badge} style={{ '--badge-color':sm.color } as React.CSSProperties}>
                        {sm.label}
                      </span>
                    </td>
                    <td style={{ color:'var(--adm-text-muted)', fontSize:12 }}>
                      {new Date(o.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        {next && (
                          <button onClick={() => advance(o)} disabled={isActing}
                            className="adm-btn adm-btn-gold" style={{ fontSize:11, padding:'5px 10px' }}>
                            {isActing ? '…' : `→ ${STATUS_META[next]?.label}`}
                          </button>
                        )}
                        {o.status !== 'annulee' && o.status !== 'livree' && (
                          <button onClick={() => cancel(o)} disabled={isActing}
                            className="adm-btn" style={{ fontSize:11, padding:'5px 10px', background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
