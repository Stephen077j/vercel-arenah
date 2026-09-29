import { useState } from 'react';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { promosApi, PromoResult } from '@/api/promos';
import { formatPrice } from '@/client/lib/clientStore';

interface PromoFieldProps {
  amount: number;
  module?: string;
  onApply: (result: PromoResult | null) => void;
}

export default function PromoField({ amount, module, onApply }: PromoFieldProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromoResult | null>(null);
  const [error, setError] = useState('');

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const r = await promosApi.validate(code.trim(), amount, module);
      setResult(r); onApply(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Code invalide';
      setError(msg); setResult(null); onApply(null);
    } finally { setLoading(false); }
  };

  const clear = () => { setCode(''); setResult(null); setError(''); onApply(null); };

  if (result) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
    }}>
      <CheckCircle2 size={16} color="#22c55e" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Code {result.code} appliqué</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Remise {result.description} — économie : <strong>{formatPrice(result.discount)}</strong>
        </div>
      </div>
      <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
        <XCircle size={14} />
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Tag size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && validate()}
            placeholder="Code promo"
            style={{
              width: '100%', height: 38, paddingLeft: 32, paddingRight: 10, borderRadius: 8,
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border, #e2e8f0)'}`,
              background: 'var(--background, #fff)', fontSize: 13, fontFamily: 'monospace',
              letterSpacing: '0.05em', outline: 'none', color: 'var(--foreground, #0f172a)',
            }}
          />
        </div>
        <button
          onClick={validate}
          disabled={loading || !code.trim()}
          style={{
            padding: '0 14px', height: 38, borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: (!code.trim() || loading) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {loading ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Valider'}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, paddingLeft: 2 }}>{error}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
