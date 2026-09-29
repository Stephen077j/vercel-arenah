import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Smartphone, Banknote, CreditCard } from 'lucide-react';
import { adminApi, AdminPayment } from '@/api/admin';
import { toast } from 'sonner';

const METHOD_META: Record<string, { label:string; color:string; Icon:React.ElementType }> = {
  mvola:   { label:'MVola',        color:'#006B3C', Icon:Smartphone },
  orange:  { label:'Orange Money', color:'#FF6B00', Icon:Smartphone },
  airtel:  { label:'Airtel Money', color:'#C8102E', Icon:Smartphone },
  especes: { label:'Espèces',      color:'#22c55e', Icon:Banknote  },
  carte:   { label:'Carte',        color:'#6366f1', Icon:CreditCard },
};
const STATUS_META: Record<string, { label:string; badge:string }> = {
  pending:      { label:'En attente',      badge:'adm-badge adm-badge-amber' },
  pending_cash: { label:'Esp. à valider',  badge:'adm-badge adm-badge-amber' },
  success:      { label:'Confirmé',        badge:'adm-badge adm-badge-green' },
  failed:       { label:'Échoué',          badge:'adm-badge adm-badge-red'   },
};
const TYPE_LABELS: Record<string,string> = {
  order:'Boutique', restaurant:'Restaurant', hotel:'Hôtel', gym:'Gym', gym_coach:'Coach',
  salon:'Salon', field:'Terrain', pool:'Piscine', pool_course:'Cours', event:'Événement', show:'Spectacle', cybercafe:'Cybercafé',
};

const fmt = (n: number) => `${Number(n).toLocaleString()} Ar`;

export default function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string|null>(null);
  const [filter, setFilter] = useState('pending');

  const load = async () => {
    setLoading(true);
    try { setPayments(await adminApi.getAllPayments(filter !== 'all' ? { status:filter } : undefined)); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const confirm = async (id: string) => {
    setActing(id);
    try { await adminApi.confirmPayment(id); setPayments(p => p.filter(x => x.id !== id)); toast.success('Paiement confirmé'); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setActing(null); }
  };
  const reject = async (id: string) => {
    setActing(id);
    try { await adminApi.rejectPayment(id); setPayments(p => p.filter(x => x.id !== id)); toast.success('Paiement rejeté'); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setActing(null); }
  };

  const FILTERS = [
    { value:'all',          label:'Tous' },
    { value:'pending',      label:'Mobile Money' },
    { value:'pending_cash', label:'Espèces' },
    { value:'success',      label:'Confirmés' },
    { value:'failed',       label:'Échoués' },
  ];

  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'pending_cash')
    .reduce((s,p) => s + p.amount, 0);

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--adm-text)', margin:0 }}>Paiements</h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>
            {payments.length} paiement(s) · {totalPending > 0 && <span style={{ color:'#f59e0b' }}>{fmt(totalPending)} à valider</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /> Actualiser
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`adm-pill${filter===f.value?' active':''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Chargement…</div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <CheckCircle2 size={40} style={{ color:'#22c55e', margin:'0 auto 12px' }} />
          <p style={{ color:'var(--adm-text-muted)' }}>Aucun paiement</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {payments.map(p => {
            const method = METHOD_META[p.method] ?? { label:p.method, color:'#888', Icon:CreditCard };
            const sm = STATUS_META[p.status] ?? { label:p.status, badge:'adm-badge' };
            const isPending = ['pending','pending_cash'].includes(p.status);
            const { Icon:MIcon } = method;
            return (
              <div key={p.id} className="adm-card" style={{
                padding:'18px 20px', position:'relative', overflow:'hidden',
                borderColor: isPending ? 'rgba(245,158,11,0.25)' : 'var(--adm-border)',
              }}>
                {isPending && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#f59e0b,transparent)' }} />}
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div className="adm-icon-box" style={{ background:`${method.color}18`, border:`1px solid ${method.color}30` }}>
                    <MIcon size={18} style={{ color:method.color }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--adm-text)' }}>
                          {method.label} · <span style={{ color:'var(--adm-text-dim)' }}>{TYPE_LABELS[p.booking_type] ?? p.booking_type}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--adm-text-muted)', fontFamily:'monospace', marginTop:2 }}>Réf. {p.reference}</div>
                        {p.notes && <div style={{ fontSize:12, color:'var(--adm-text-dim)', marginTop:3 }}>{p.notes}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'var(--adm-gold)' }}>{fmt(p.amount)}</div>
                        {p.fee > 0 && <div style={{ fontSize:11, color:'var(--adm-text-muted)' }}>+ {fmt(p.fee)} frais</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, flexWrap:'wrap', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span className={sm.badge}>{sm.label}</span>
                        <span style={{ fontSize:11, color:'var(--adm-text-muted)' }}>
                          {new Date(p.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      {isPending && (
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => confirm(p.id)} disabled={acting===p.id}
                            className="adm-btn adm-btn-gold" style={{ fontSize:11, padding:'6px 14px' }}>
                            <CheckCircle2 size={12} /> Confirmer
                          </button>
                          <button onClick={() => reject(p.id)} disabled={acting===p.id}
                            className="adm-btn" style={{ fontSize:11, padding:'6px 14px', background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                            <XCircle size={12} /> Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
