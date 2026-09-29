import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { reviewsApi, ModuleRatings } from '@/api/reviews';
import { toast } from 'sonner';
import { useClientAuth } from '@/client/lib/clientAuth';

interface StarRatingProps { module: string; }

function Stars({ value, interactive, onChange }: { value: number; interactive?: boolean; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i}
          size={interactive ? 22 : 14}
          fill={i <= active ? '#f59e0b' : 'none'}
          color={i <= active ? '#f59e0b' : '#cbd5e1'}
          style={{ cursor: interactive ? 'pointer' : 'default', transition: 'color 0.12s' }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(i)}
        />
      ))}
    </div>
  );
}

export default function StarRating({ module }: StarRatingProps) {
  const { user } = useClientAuth();
  const [data, setData] = useState<ModuleRatings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { reviewsApi.getModule(module).then(setData).catch(() => {}); }, [module]);

  const submit = async () => {
    if (!rating) { toast.error('Choisissez une note'); return; }
    setSubmitting(true);
    try {
      await reviewsApi.submit({ module, rating, comment: comment || undefined });
      toast.success('Merci pour votre avis !');
      setShowForm(false); setRating(0); setComment('');
      const updated = await reviewsApi.getModule(module);
      setData(updated);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSubmitting(false); }
  };

  if (!data) return null;

  return (
    <div style={{ borderRadius: 14, border: '1px solid var(--border, #e2e8f0)', padding: '16px 18px', background: 'var(--card, #fff)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
              {data.average ? data.average.toFixed(1) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{data.count} avis</div>
          </div>
          <Stars value={Math.round(data.average ?? 0)} />
        </div>
        {user && (
          <button onClick={() => setShowForm(v => !v)} style={{
            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
            background: showForm ? '#f1f5f9' : '#0f172a', color: showForm ? '#64748b' : '#fff',
            border: 'none', cursor: 'pointer',
          }}>
            {showForm ? 'Annuler' : '+ Donner un avis'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ padding: '14px', borderRadius: 10, background: '#f8fafc', marginBottom: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Votre note</div>
            <Stars value={rating} interactive onChange={setRating} />
          </div>
          <textarea
            placeholder="Votre commentaire (optionnel)…"
            value={comment} onChange={e => setComment(e.target.value)}
            style={{ width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button onClick={submit} disabled={submitting || !rating} style={{
            marginTop: 8, padding: '8px 18px', borderRadius: 8, background: '#f59e0b', color: '#fff',
            border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            opacity: !rating || submitting ? 0.6 : 1,
          }}>
            {submitting ? 'Envoi…' : 'Publier mon avis'}
          </button>
        </div>
      )}

      {data.reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.reviews.slice(0, 5).map((r, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0,
                }}>
                  {(r.fullname || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{r.fullname || 'Client'}</div>
                  <Stars value={r.rating} />
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
              </div>
              {r.comment && <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
