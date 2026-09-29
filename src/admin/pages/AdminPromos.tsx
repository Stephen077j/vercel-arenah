import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Tag, X } from 'lucide-react';
import { promosApi, PromoCode } from '@/api/promos';
import { toast } from 'sonner';

const emptyForm = () => ({
  code: '', type: 'percent' as 'percent' | 'fixed', value: 10,
  min_amount: 0, max_uses: '' as number | '', module: '',
  valid_from: '', valid_until: '',
});

const fmt = (n: number) => `${Number(n).toLocaleString()} Ar`;

export default function AdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPromos(await promosApi.getAll()); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const create = async () => {
    if (!form.code || !form.value) { toast.error('Code et valeur requis'); return; }
    setSaving(true);
    try {
      const created = await promosApi.create({
        code: form.code, type: form.type, value: Number(form.value),
        min_amount: Number(form.min_amount) || 0,
        max_uses: form.max_uses !== '' ? Number(form.max_uses) : undefined,
        module: form.module || undefined,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined,
      });
      setPromos(prev => [created, ...prev]);
      setForm(emptyForm()); setShowForm(false);
      toast.success('Code créé');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string, active: boolean) => {
    await promosApi.toggle(id, active);
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active } : p));
  };

  const remove = async (id: string, code: string) => {
    if (!confirm(`Supprimer "${code}" ?`)) return;
    await promosApi.remove(id);
    setPromos(prev => prev.filter(p => p.id !== id));
    toast.success('Supprimé');
  };

  const now = new Date();
  const isExpired = (p: PromoCode) => p.valid_until ? new Date(p.valid_until) < now : false;
  const isExhausted = (p: PromoCode) => p.max_uses !== null && p.uses_count >= p.max_uses;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--adm-text)', margin: 0 }}>Codes promo</h1>
          <p style={{ color: 'var(--adm-text-dim)', fontSize: 13, margin: '4px 0 0' }}>{promos.length} code(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost">
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="adm-btn adm-btn-gold" style={{ gap: 6 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Annuler' : 'Nouveau code'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="adm-card" style={{ padding: 22, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div className="adm-glow-line" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--adm-text)', margin: '0 0 16px' }}>Créer un code promo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Code', el: <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="EX: BIENVENUE20" className="adm-input" style={{ fontFamily: 'monospace', letterSpacing: '0.06em' }} /> },
              { label: 'Type', el: <select value={form.type} onChange={e => set('type', e.target.value)} className="adm-select"><option value="percent">Pourcentage (%)</option><option value="fixed">Montant fixe (Ar)</option></select> },
              { label: form.type === 'percent' ? 'Valeur (%)' : 'Remise (Ar)', el: <input type="number" value={form.value} onChange={e => set('value', e.target.value)} min={1} className="adm-input" /> },
              { label: 'Montant min. (Ar)', el: <input type="number" value={form.min_amount} onChange={e => set('min_amount', e.target.value)} min={0} className="adm-input" /> },
              { label: 'Nb max utilisations', el: <input type="number" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} min={1} placeholder="Illimité" className="adm-input" /> },
              { label: 'Module (laisser vide = tous)', el: <input value={form.module} onChange={e => set('module', e.target.value)} placeholder="ex: boutique" className="adm-input" /> },
              { label: 'Valide du', el: <input type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} className="adm-input" /> },
              { label: 'Valide jusqu\'au', el: <input type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} className="adm-input" /> },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                {el}
              </div>
            ))}
          </div>
          <button onClick={create} disabled={saving} className="adm-btn adm-btn-gold" style={{ marginTop: 14, gap: 6 }}>
            <Tag size={13} /> {saving ? 'Création…' : 'Créer le code'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--adm-text-muted)' }}>Chargement…</div>
      ) : promos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--adm-text-muted)' }}>
          <Tag size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
          <p>Aucun code promo</p>
        </div>
      ) : (
        <div className="adm-card" style={{ overflow: 'hidden' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Remise</th>
                <th style={{ textAlign: 'center' }}>Utilisations</th>
                <th>Validité</th>
                <th style={{ textAlign: 'center' }}>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => {
                const expired = isExpired(p);
                const exhausted = isExhausted(p);
                const ok = p.active && !expired && !exhausted;
                return (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--adm-text)', letterSpacing: '0.06em' }}>{p.code}</code>
                      {p.module && <div style={{ fontSize: 10, color: 'var(--adm-text-muted)', marginTop: 2 }}>Module: {p.module}</div>}
                      {p.min_amount > 0 && <div style={{ fontSize: 10, color: 'var(--adm-text-muted)' }}>Min: {fmt(p.min_amount)}</div>}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--adm-gold)' }}>
                      {p.type === 'percent' ? `-${p.value}%` : `-${fmt(p.value)}`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: exhausted ? '#ef4444' : 'var(--adm-text)' }}>
                        {p.uses_count}
                      </span>
                      {p.max_uses !== null && <span style={{ color: 'var(--adm-text-muted)', fontSize: 11 }}> / {p.max_uses}</span>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--adm-text-muted)' }}>
                      {p.valid_until
                        ? <span style={{ color: expired ? '#ef4444' : 'var(--adm-text-dim)' }}>
                            jusqu'au {new Date(p.valid_until).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        : '∞ Illimité'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                        background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: ok ? '#22c55e' : '#ef4444',
                      }}>
                        {!p.active ? 'Désactivé' : expired ? 'Expiré' : exhausted ? 'Épuisé' : 'Actif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => toggle(p.id, !p.active)}
                          className="adm-btn adm-btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                        >
                          {p.active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => remove(p.id, p.code)}
                          className="adm-btn"
                          style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
