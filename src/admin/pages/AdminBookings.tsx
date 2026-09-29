import { useEffect, useState } from 'react';
import { RefreshCw, Hotel, Dumbbell, Scissors, Trophy, Waves, Ticket, Monitor, CalendarDays, Check, X } from 'lucide-react';
import { adminApi, AdminBooking } from '@/api/admin';
import { toast } from 'sonner';

const TYPE_META: Record<string, { label:string; Icon:React.ElementType; color:string }> = {
  hotel:       { label:'Hôtel',         Icon:Hotel,        color:'#38bdf8' },
  gym:         { label:'Gym',           Icon:Dumbbell,     color:'#f87171' },
  gym_coach:   { label:'Coach',         Icon:Dumbbell,     color:'#fb923c' },
  salon:       { label:'Salon',         Icon:Scissors,     color:'#f472b6' },
  field:       { label:'Terrain',       Icon:Trophy,       color:'#a3e635' },
  pool:        { label:'Piscine',       Icon:Waves,        color:'#22d3ee' },
  pool_course: { label:'Cours piscine', Icon:Waves,        color:'#0ea5e9' },
  event:       { label:'Événement',     Icon:CalendarDays, color:'#818cf8' },
  show:        { label:'Spectacle',     Icon:Ticket,       color:'#e879f9' },
  cybercafe:   { label:'Cybercafé',     Icon:Monitor,      color:'#94a3b8' },
};

const fmt = (n: number) => `${Number(n).toLocaleString()} Ar`;

export default function AdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setBookings(await adminApi.getAllBookings()); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = bookings.reduce<Record<string,number>>((a,b) => { a[b.type]=(a[b.type]??0)+1; return a; }, {});
  const filtered = typeFilter === 'all' ? bookings : bookings.filter(b => b.type === typeFilter);

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--adm-text)', margin:0 }}>Réservations</h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>{bookings.length} réservation(s)</p>
        </div>
        <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /> Actualiser
        </button>
      </div>

      {/* Mini stats par type */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:8, marginBottom:16 }}>
          {Object.entries(TYPE_META).map(([type, meta]) => {
            const { Icon } = meta;
            return (
              <button key={type} onClick={() => setTypeFilter(typeFilter===type?'all':type)}
                style={{
                  padding:'10px 8px', borderRadius:12, textAlign:'center', cursor:'pointer',
                  background: typeFilter===type ? `${meta.color}15` : 'var(--adm-card)',
                  border: `1px solid ${typeFilter===type ? meta.color+'40' : 'var(--adm-border)'}`,
                  transition:'all 0.18s',
                }}>
                <Icon size={14} style={{ color:meta.color, display:'block', margin:'0 auto 4px' }} />
                <div style={{ fontSize:16, fontWeight:800, color:'var(--adm-text)' }}>{counts[type]??0}</div>
                <div style={{ fontSize:9, color:'var(--adm-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                  {meta.label}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pills */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={() => setTypeFilter('all')} className={`adm-pill${typeFilter==='all'?' active':''}`}>
          Tous ({bookings.length})
        </button>
        {Object.entries(TYPE_META).map(([type, meta]) => counts[type] ? (
          <button key={type} onClick={() => setTypeFilter(type)} className={`adm-pill${typeFilter===type?' active':''}`}>
            {meta.label} ({counts[type]})
          </button>
        ) : null)}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Aucune réservation</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(b => {
            const meta = TYPE_META[b.type] ?? { label:b.type, Icon:CalendarDays, color:'#888' };
            const { Icon } = meta;
            const isOk  = ['confirme','active','completed'].includes(b.status);
            const isBad = ['annule','cancelled'].includes(b.status);
            return (
              <div key={`${b.type}-${b.id}`} className="adm-card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${meta.color}18`, border:`1px solid ${meta.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={16} style={{ color:meta.color }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:600, fontSize:13, color:'var(--adm-text)' }}>{b.customer_name ?? '—'}</span>
                    {b.customer_phone && <span style={{ fontSize:11, color:'var(--adm-text-muted)' }}>{b.customer_phone}</span>}
                    <span style={{ fontSize:10, color:meta.color, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--adm-text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.info}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--adm-gold)' }}>{fmt(Number(b.amount))}</div>
                  <div style={{
                    fontSize:10, fontWeight:600, marginTop:3, display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end',
                    color: isOk ? '#22c55e' : isBad ? '#ef4444' : '#f59e0b',
                  }}>
                    {isOk ? <Check size={10}/> : isBad ? <X size={10}/> : null}
                    {b.status}
                  </div>
                  <div style={{ fontSize:10, color:'var(--adm-text-muted)', marginTop:1 }}>
                    {new Date(b.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
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
