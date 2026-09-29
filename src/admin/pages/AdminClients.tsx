import { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldCheck, User } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { toast } from 'sonner';

interface Client {
  id:string; email:string; fullname:string; phone:string;
  role:string; module_assigned:string|null; active:boolean; created_at:string;
}
const ROLE_META: Record<string, { label:string; color:string }> = {
  client:       { label:'Client',      color:'#94a3b8' },
  admin_module: { label:'Admin',       color:'#6366f1' },
  super_admin:  { label:'Super Admin', color:'#d4a843' },
  caissier:     { label:'Caissier',    color:'#f59e0b' },
};

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setClients(await adminApi.getClients() as Client[]); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const matchQ = !q || c.email.toLowerCase().includes(q.toLowerCase()) || (c.fullname??'').toLowerCase().includes(q.toLowerCase()) || (c.phone??'').includes(q);
    const matchR = roleFilter === 'all' || c.role === roleFilter;
    return matchQ && matchR;
  });

  const total    = clients.filter(c => c.role === 'client').length;
  const admins   = clients.filter(c => c.role === 'admin_module').length;
  const inactive = clients.filter(c => !c.active).length;

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--adm-text)', margin:0 }}>Clients</h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>{clients.length} utilisateur(s)</p>
        </div>
        <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} /> Actualiser
        </button>
      </div>

      {/* Mini stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Clients',  value:total,    color:'#38bdf8' },
          { label:'Admins',   value:admins,   color:'#d4a843' },
          { label:'Inactifs', value:inactive, color:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="adm-card" style={{ padding:'14px 18px', position:'relative', overflow:'hidden' }}>
            <div className="adm-glow-line" style={{ background:`linear-gradient(90deg,transparent,${s.color},transparent)` }} />
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--adm-text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {['all','client','admin_module','super_admin','caissier'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} className={`adm-pill${roleFilter===r?' active':''}`}>
            {r === 'all' ? 'Tous' : ROLE_META[r]?.label ?? r}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:18 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--adm-text-muted)' }} />
        <input className="adm-input" style={{ paddingLeft:34 }} placeholder="Rechercher par nom, email ou téléphone…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Aucun utilisateur</div>
      ) : (
        <div className="adm-card" style={{ overflow:'hidden' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Inscription</th>
                <th style={{ textAlign:'center' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const role = ROLE_META[c.role] ?? { label:c.role, color:'#888' };
                const initials = (c.fullname ?? c.email ?? '?').split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:32, height:32, borderRadius:'50%', flexShrink:0,
                          background:'linear-gradient(135deg,#d4a84333,#d4a84311)',
                          border:'1.5px solid rgba(212,168,67,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700, color:'#d4a843',
                        }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--adm-text)' }}>{c.fullname || '—'}</div>
                          <div style={{ fontSize:11, color:'var(--adm-text-muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color:'var(--adm-text-dim)', fontSize:13 }}>{c.phone || '—'}</td>
                    <td>
                      <span style={{
                        fontSize:11, padding:'3px 9px', borderRadius:100, fontWeight:600,
                        background:`${role.color}18`, color:role.color, border:`1px solid ${role.color}30`,
                      }}>
                        {role.label}
                        {c.module_assigned && <span style={{ opacity:0.7 }}> · {c.module_assigned}</span>}
                      </span>
                    </td>
                    <td style={{ color:'var(--adm-text-muted)', fontSize:12 }}>
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      {c.active
                        ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#22c55e', fontWeight:600 }}><ShieldCheck size={12}/> Actif</span>
                        : <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--adm-text-muted)' }}><User size={12}/> Inactif</span>
                      }
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
