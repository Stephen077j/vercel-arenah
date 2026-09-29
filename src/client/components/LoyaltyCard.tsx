import { useEffect, useState } from 'react';
import { Gift, Star, TrendingUp } from 'lucide-react';
import { loyaltyApi, LoyaltyStatus } from '@/api/loyalty';

const LEVELS = [
  { name: 'Bronze',  min: 0,    max: 999,  color: '#b87333', bg: 'rgba(184,115,51,0.12)' },
  { name: 'Or',      min: 1000, max: 4999, color: '#d4a843', bg: 'rgba(212,168,67,0.12)' },
  { name: 'Platine', min: 5000, max: null, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
];

export default function LoyaltyCard() {
  const [data, setData] = useState<LoyaltyStatus | null>(null);

  useEffect(() => { loyaltyApi.getMe().then(setData).catch(() => {}); }, []);
  if (!data) return null;

  const { total, level } = data;
  const progress = level.next
    ? Math.min(100, ((total - level.min) / (level.next - level.min)) * 100)
    : 100;

  return (
    <div style={{
      borderRadius: 16, padding: '20px 22px',
      background: `${level.color}10`, border: `1.5px solid ${level.color}35`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* glow */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `${level.color}15` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Star size={14} fill={level.color} color={level.color} />
            <span style={{ fontSize: 11, fontWeight: 700, color: level.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Niveau {level.name}
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: level.color, lineHeight: 1 }}>
            {total.toLocaleString()}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground, #64748b)', marginLeft: 6 }}>pts</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Gift size={22} color={level.color} />
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', marginTop: 4 }}>
            ≈ {(total * data.ar_per_point).toLocaleString()} Ar
          </div>
        </div>
      </div>

      {/* Barre progression */}
      {level.next && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)' }}>
              {(level.next - total).toLocaleString()} pts avant{' '}
              {LEVELS.find(l => l.min === level.next)?.name}
            </span>
            <span style={{ fontSize: 10, color: level.color, fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 100, background: `${level.color}20` }}>
            <div style={{ height: '100%', width: `${progress}%`, borderRadius: 100, background: `linear-gradient(90deg,${level.color}88,${level.color})`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}

      {/* Niveaux */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {LEVELS.map(l => (
          <div key={l.name} style={{
            flex: 1, padding: '5px 0', textAlign: 'center', borderRadius: 8,
            background: l.name === level.name ? `${l.color}22` : 'rgba(0,0,0,0.04)',
            border: `1px solid ${l.name === level.name ? l.color + '44' : 'transparent'}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: l.name === level.name ? l.color : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {l.name}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
              {l.min.toLocaleString()}+
            </div>
          </div>
        ))}
      </div>

      {total >= 100 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
          <TrendingUp size={11} style={{ display: 'inline', marginRight: 4 }} />
          1 point gagné par 100 Ar dépensé · 1 pt = {data.ar_per_point} Ar de remise
        </div>
      )}
    </div>
  );
}
