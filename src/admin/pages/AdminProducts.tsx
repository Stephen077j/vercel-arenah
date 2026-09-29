import { useEffect, useState } from 'react';
import { Package, Plus, Edit2, Trash2, RefreshCw, Save, X } from 'lucide-react';
import { adminApi, AdminProduct } from '@/api/admin';
import { toast } from 'sonner';

const MODULES = ['all','boutique','restaurant'];
const empty = (): Omit<AdminProduct,'id'> => ({ module:'boutique', name:'', description:'', price:0, category:'', stock:10, image_url:null, active:true });
const fmt = (n:number) => `${Number(n).toLocaleString()} Ar`;

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [mod, setMod] = useState('all');
  const [editing, setEditing] = useState<string|null>(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    try { setProducts(await adminApi.getAllProducts(mod !== 'all' ? mod : undefined)); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [mod]);

  const openNew  = () => { setForm(empty()); setEditing('new'); };
  const openEdit = (p: AdminProduct) => {
    setForm({ module:p.module, name:p.name, description:p.description??'', price:p.price, category:p.category, stock:p.stock, image_url:p.image_url, active:p.active });
    setEditing(p.id);
  };
  const save = async () => {
    if (!form.name || !form.category || form.price <= 0) { toast.error('Nom, catégorie et prix requis'); return; }
    setSaving(true);
    try {
      if (editing === 'new') { const c = await adminApi.createProduct(form); setProducts(prev => [c,...prev]); toast.success('Produit créé'); }
      else { const u = await adminApi.updateProduct(editing!, form); setProducts(prev => prev.map(p => p.id===editing?u:p)); toast.success('Mis à jour'); }
      setEditing(null);
    } catch (e:unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  };
  const del = async (id:string, name:string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    setDeleting(id);
    try { await adminApi.deleteProduct(id); setProducts(prev => prev.filter(p => p.id!==id)); toast.success('Supprimé'); }
    catch (e:unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setDeleting(null); }
  };
  const set = (k:keyof typeof form, v:unknown) => setForm(prev => ({ ...prev, [k]:v }));

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--adm-text)', margin:0 }}>Produits</h1>
          <p style={{ color:'var(--adm-text-dim)', fontSize:13, margin:'4px 0 0' }}>{products.length} produit(s)</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost">
            <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }} />
          </button>
          <button onClick={openNew} className="adm-btn adm-btn-gold" style={{ gap:6 }}>
            <Plus size={14} /> Nouveau produit
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {MODULES.map(m => (
          <button key={m} onClick={() => setMod(m)} className={`adm-pill${mod===m?' active':''}`}>
            {m==='all'?'Tous':m.charAt(0).toUpperCase()+m.slice(1)}
          </button>
        ))}
      </div>

      {editing && (
        <div className="adm-card" style={{ padding:24, marginBottom:20, position:'relative', overflow:'hidden' }}>
          <div className="adm-glow-line" />
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--adm-text)', margin:'0 0 18px' }}>
            {editing==='new'?'+ Nouveau produit':'Modifier le produit'}
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { label:'Module', el: <select value={form.module} onChange={e=>set('module',e.target.value)} className="adm-select"><option value="boutique">Boutique</option><option value="restaurant">Restaurant</option></select> },
              { label:'Catégorie', el: <input value={form.category} onChange={e=>set('category',e.target.value)} placeholder="ex: Boissons" className="adm-input" /> },
            ].map(({label,el}) => (
              <div key={label}>
                <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Nom</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nom du produit" className="adm-input" />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Description</label>
              <input value={form.description??''} onChange={e=>set('description',e.target.value)} placeholder="Description courte" className="adm-input" />
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Prix (Ar)</label>
              <input type="number" value={form.price} onChange={e=>set('price',Number(e.target.value))} min={0} className="adm-input" />
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Stock</label>
              <input type="number" value={form.stock} onChange={e=>set('stock',Number(e.target.value))} min={0} className="adm-input" />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>URL image</label>
              <input value={form.image_url??''} onChange={e=>set('image_url',e.target.value||null)} placeholder="https://…" className="adm-input" />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="active" checked={form.active} onChange={e=>set('active',e.target.checked)} style={{ width:14, height:14, accentColor:'#d4a843' }} />
              <label htmlFor="active" style={{ fontSize:13, color:'var(--adm-text-dim)', cursor:'pointer' }}>Actif (visible sur le site)</label>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:18 }}>
            <button onClick={save} disabled={saving} className="adm-btn adm-btn-gold" style={{ gap:6 }}>
              <Save size={13}/> {saving?'…':'Enregistrer'}
            </button>
            <button onClick={() => setEditing(null)} className="adm-btn adm-btn-ghost" style={{ gap:6 }}>
              <X size={13}/> Annuler
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>Chargement…</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--adm-text-muted)' }}>
          <Package size={40} style={{ display:'block', margin:'0 auto 12px', opacity:0.3 }} />
          <p>Aucun produit</p>
          <button onClick={openNew} className="adm-btn adm-btn-gold" style={{ margin:'8px auto 0', gap:6 }}><Plus size={14}/>Ajouter</button>
        </div>
      ) : (
        <div className="adm-card" style={{ overflow:'hidden' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th style={{ textAlign:'right' }}>Prix</th>
                <th style={{ textAlign:'right' }}>Stock</th>
                <th style={{ textAlign:'center' }}>Statut</th>
                <th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ opacity:p.active?1:0.45 }}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                        : <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Package size={14} style={{ color:'var(--adm-text-muted)' }} />
                          </div>
                      }
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'rgba(255,255,255,0.06)', color:'var(--adm-text-muted)', display:'inline-block', marginTop:2 }}>{p.module}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color:'var(--adm-text-dim)', fontSize:13 }}>{p.category}</td>
                  <td style={{ textAlign:'right', fontWeight:700, color:'var(--adm-gold)' }}>{fmt(p.price)}</td>
                  <td style={{ textAlign:'right' }}>
                    <span style={{ fontWeight:700, color:p.stock===0?'#ef4444':p.stock<5?'#f59e0b':'var(--adm-text)' }}>{p.stock}</span>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, background:p.active?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)', color:p.active?'#22c55e':'#ef4444' }}>
                      {p.active?'Actif':'Inactif'}
                    </span>
                  </td>
                  <td style={{ textAlign:'right' }}>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button onClick={() => openEdit(p)} className="adm-btn adm-btn-ghost" style={{ padding:'5px 10px', fontSize:11, gap:4 }}>
                        <Edit2 size={11}/> Éditer
                      </button>
                      <button onClick={() => del(p.id,p.name)} disabled={deleting===p.id}
                        className="adm-btn" style={{ padding:'5px 10px', fontSize:11, background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.15)' }}>
                        {deleting===p.id?'…':<Trash2 size={11}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
