/**
 * Intelligence IA — tableau de bord admin
 *   1. Analyse automatique des avis clients (sentiment + aspects)
 *   2. Zone de test : l'admin tape un avis, l'IA l'analyse en direct
 *   3. Apprentissage continu : l'admin corrige l'IA, qui se réentraîne aussitôt
 *   4. Performances mesurées des 3 modèles (précision, matrice de confusion…)
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Brain, Check, FlaskConical, Gauge, GraduationCap, MessageSquareText, Plus, RefreshCw, Sparkles, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { aiApi, LearningReport, ModelsReport, ModelVersion, ReviewAnalysis, ReviewsDashboard, Sentiment } from '@/api/ai';
import { useClientAuth } from '@/client/lib/clientAuth';
import '../admin.css';

const MODULE_LABELS: Record<string, string> = {
  hotel: 'Hôtel', restaurant: 'Restaurant', boutique: 'Boutique', gym: 'Gym', salon: 'Salon', field: 'Terrain',
  pool: 'Piscine', event: 'Événement', show: 'Spectacle', spectacles: 'Spectacle', cybercafe: 'Cybercafé', kids: 'Enfants',
};
const SENTIMENT_META: Record<Sentiment, { label: string; color: string; badge: string; emoji: string }> = {
  positif: { label: 'Positif', color: 'var(--adm-green)', badge: 'adm-badge-green', emoji: '😊' },
  neutre:  { label: 'Neutre',  color: 'var(--adm-amber)', badge: 'adm-badge-amber', emoji: '😐' },
  negatif: { label: 'Négatif', color: 'var(--adm-red)',   badge: 'adm-badge-red',   emoji: '😞' },
};
const pct = (n: number) => `${Math.round(n * 100)} %`;
const TABS = [
  { id: 'avis',   label: 'Analyse des avis', Icon: MessageSquareText },
  { id: 'learn',  label: 'Apprentissage',    Icon: GraduationCap },
  { id: 'test',   label: 'Tester l\'IA',      Icon: FlaskConical },
  { id: 'models', label: 'Performances',      Icon: Gauge },
] as const;

const INTENT_LABELS: Record<string, string> = {
  salutation: 'Salutation', au_revoir: 'Au revoir', remerciement: 'Remerciement', aide: 'Aide / que sais-tu faire',
  hotel: 'Hôtel', restaurant: 'Restaurant', spectacle: 'Spectacles', salon: 'Salon & beauté', gym: 'Salle de sport',
  piscine: 'Piscine', terrain: 'Terrains', enfants: 'Espace enfants', cybercafe: 'Cybercafé',
  evenement: 'Événementiel', boutique: 'Boutique', paiement: 'Paiement', fidelite: 'Fidélité & promos',
  annulation: 'Annulation', horaires: 'Horaires', contact: 'Contact & accès', recommandation: 'Conseil / idée de sortie',
};
type Tab = typeof TABS[number]['id'];

const h3 = { margin: '0 0 14px', fontSize: 14, fontWeight: 700 } as const;
const dim = { color: 'var(--adm-text-dim)', fontSize: 13 } as const;
const grid = (min: number) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 16, marginBottom: 16 });

function SentimentBar({ c }: { c: Record<Sentiment, number> }) {
  const total = c.positif + c.neutre + c.negatif || 1;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#1e293b' }}>
      {(['positif', 'neutre', 'negatif'] as Sentiment[]).map(s => (
        <div key={s} title={`${SENTIMENT_META[s].label} : ${c[s]}`} style={{ width: `${(c[s] / total) * 100}%`, background: SENTIMENT_META[s].color }} />
      ))}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return <span style={{ color: 'var(--adm-gold)', letterSpacing: 1, fontSize: 12 }}>{'★'.repeat(n)}<span style={{ opacity: 0.25 }}>{'★'.repeat(5 - n)}</span></span>;
}

function AnalysisDetails({ a }: { a: ReviewAnalysis }) {
  const m = SENTIMENT_META[a.sentiment];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className={`adm-badge ${m.badge}`}>{m.emoji} {m.label} · {pct(a.confidence)}</span>
      {a.corrected && <span className="adm-badge adm-badge-blue"><GraduationCap size={11} /> Corrigé par un admin</span>}
      {a.inconsistent && <span className="adm-badge adm-badge-amber"><AlertTriangle size={11} /> Note ≠ texte</span>}
      {a.aspects.map(asp => (
        <span key={asp.id} className={`adm-badge ${SENTIMENT_META[asp.sentiment].badge}`} style={{ opacity: 0.85 }}>{asp.label}</span>
      ))}
    </div>
  );
}

/** Boutons "l'IA s'est trompée, le bon sentiment est…" → réentraînement immédiat. */
function CorrectSentiment({ current, onCorrect }: { current: Sentiment; onCorrect: (s: Sentiment) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--adm-text-muted)' }}>Corriger :</span>
      {(['positif', 'neutre', 'negatif'] as Sentiment[]).filter(s => s !== current).map(s => (
        <button key={s} disabled={busy} title={`Apprendre à l'IA : ${SENTIMENT_META[s].label}`}
          onClick={async () => { setBusy(true); try { await onCorrect(s); } finally { setBusy(false); } }}
          style={{ fontSize: 11, cursor: 'pointer', border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-dim)', borderRadius: 100, padding: '2px 8px' }}>
          {SENTIMENT_META[s].emoji} {SENTIMENT_META[s].label}
        </button>
      ))}
    </div>
  );
}

// ─── Onglet 1 : analyse des avis ─────────────────────────────────────────────
function ReviewsTab() {
  const [data, setData] = useState<ReviewsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true); setErr('');
    aiApi.reviewsAnalysis().then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const correct = async (reviewId: string, label: Sentiment) => {
    try {
      await aiApi.correctSentiment(label, { reviewId });
      toast.success(`Merci ! L'IA a appris que cet avis est ${SENTIMENT_META[label].label.toLowerCase()}.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
  };

  if (loading && !data) return <p style={dim}>Analyse des avis en cours…</p>;
  if (err) return <div className="adm-card" style={{ color: 'var(--adm-red)' }}>{err}</div>;
  if (!data || !data.total) return <div className="adm-card"><p style={dim}>Aucun avis à analyser pour le moment.</p></div>;

  const satColor = data.satisfaction >= 70 ? 'var(--adm-green)' : data.satisfaction >= 45 ? 'var(--adm-amber)' : 'var(--adm-red)';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={load} disabled={loading} className="adm-btn adm-btn-ghost" style={{ gap: 6 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Relancer l'analyse
        </button>
      </div>

      <div style={grid(170)}>
        <div className="adm-kpi">
          <Gauge className="w-5 h-5" style={{ color: satColor }} />
          <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', marginTop: 10 }}>Indice de satisfaction</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: satColor, marginTop: 4 }}>{data.satisfaction}<span style={{ fontSize: 14 }}>/100</span></div>
        </div>
        {(['positif', 'neutre', 'negatif'] as Sentiment[]).map(s => (
          <div key={s} className="adm-kpi">
            <span style={{ fontSize: 20 }}>{SENTIMENT_META[s].emoji}</span>
            <div style={{ fontSize: 11, color: 'var(--adm-text-dim)', marginTop: 10 }}>Avis {SENTIMENT_META[s].label.toLowerCase()}s</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: SENTIMENT_META[s].color, marginTop: 4 }}>
              {data.totals[s]} <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>({Math.round((data.totals[s] / data.total) * 100)} %)</span>
            </div>
          </div>
        ))}
      </div>

      {data.insights.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16, borderColor: 'var(--adm-border-gold)' }}>
          <h3 style={{ ...h3, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={15} style={{ color: 'var(--adm-gold)' }} /> Ce que l'IA a remarqué</h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            {data.insights.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      <div style={grid(320)}>
        <div className="adm-card">
          <h3 style={h3}>Sentiment par aspect</h3>
          {!data.aspects.length ? <p style={dim}>Aucun aspect détecté.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.aspects.map(a => (
                <div key={a.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{a.label}</span>
                    <span style={{ color: 'var(--adm-text-dim)' }}>
                      <span style={{ color: 'var(--adm-green)' }}>{a.positif}</span> / <span style={{ color: 'var(--adm-amber)' }}>{a.neutre}</span> / <span style={{ color: 'var(--adm-red)' }}>{a.negatif}</span>
                    </span>
                  </div>
                  <SentimentBar c={a} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="adm-card">
          <h3 style={h3}>Par service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.byModule.map(m => (
              <div key={m.module}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{MODULE_LABELS[m.module] ?? m.module} <span style={{ color: 'var(--adm-text-muted)' }}>· {m.total} avis</span></span>
                  <span style={{ color: 'var(--adm-gold)', fontWeight: 700 }}>{m.avgRating} ★</span>
                </div>
                <SentimentBar c={m} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={grid(320)}>
        {(['positif', 'negatif'] as const).map(s => (
          <div key={s} className="adm-card">
            <h3 style={h3}>Mots qui reviennent dans les avis {s === 'positif' ? 'positifs' : 'négatifs'}</h3>
            {!data.keywords[s].length ? <p style={dim}>—</p> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.keywords[s].map(k => (
                  <span key={k.word} className={`adm-badge ${SENTIMENT_META[s].badge}`} style={{ fontSize: 11 + Math.min(k.count, 5) }}>
                    {k.word} <span style={{ opacity: 0.6 }}>×{k.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.alerts.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <h3 style={{ ...h3, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={15} style={{ color: 'var(--adm-red)' }} /> Avis à traiter en priorité</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.alerts.map(r => (
              <div key={r.id} style={{ borderLeft: '3px solid var(--adm-red)', paddingLeft: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                  <b>{r.fullname}</b><Stars n={r.rating} />
                  <span style={{ color: 'var(--adm-text-muted)' }}>{MODULE_LABELS[r.module] ?? r.module} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                {r.comment && <p style={{ margin: '0 0 6px', fontSize: 13 }}>« {r.comment} »</p>}
                <AnalysisDetails a={r.analysis} />
              <CorrectSentiment current={r.analysis.sentiment} onCorrect={s => correct(r.id, s)} />
                <CorrectSentiment current={r.analysis.sentiment} onCorrect={s => correct(r.id, s)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adm-card">
        <h3 style={h3}>Derniers avis analysés</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.reviews.map(r => (
            <div key={r.id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                <b>{r.fullname}</b><Stars n={r.rating} />
                <span style={{ color: 'var(--adm-text-muted)' }}>{MODULE_LABELS[r.module] ?? r.module}</span>
              </div>
              {r.comment && <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--adm-text-dim)' }}>« {r.comment} »</p>}
              <AnalysisDetails a={r.analysis} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Onglet 2 : zone de test ─────────────────────────────────────────────────
const EXAMPLES = [
  'Le personnel était adorable mais la chambre était sale',
  'Repas délicieux et service rapide, je recommande !',
  'Trop cher pour ce que c\'est, très déçu',
  'Séjour correct, sans plus',
  'Tsara be ny sakafo, misaotra',
];

function TestTab({ canTeach }: { canTeach: boolean }) {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [result, setResult] = useState<ReviewAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [analyzedText, setAnalyzedText] = useState('');

  const analyze = async (t = text) => {
    if (!t.trim()) return;
    setLoading(true); setErr('');
    try { setResult(await aiApi.sentiment(t, rating || undefined)); setAnalyzedText(t); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  };

  // L'IA s'est trompée : on lui apprend le bon sentiment, puis on ré-analyse
  const teach = async (label: Sentiment) => {
    try {
      await aiApi.correctSentiment(label, { text: analyzedText });
      toast.success('Modèle réentraîné avec votre correction');
      await analyze(analyzedText);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
  };

  return (
    <div style={grid(320)}>
      <div className="adm-card">
        <h3 style={h3}>Écrivez un avis client</h3>
        <textarea className="adm-input" rows={4} value={text} onChange={e => setText(e.target.value)}
          placeholder="Ex : Le service était lent mais les plats étaient délicieux" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
          <span style={dim}>Note (facultative) :</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(r => (r === n ? 0 : n))} aria-label={`${n} étoiles`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: n <= rating ? 'var(--adm-gold)' : 'var(--adm-text-muted)' }}>
              <Star size={18} fill={n <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <button onClick={() => analyze()} disabled={loading || !text.trim()} className="adm-btn adm-btn-gold" style={{ gap: 6 }}>
          <Brain size={14} /> {loading ? 'Analyse…' : 'Analyser'}
        </button>
        <p style={{ ...dim, margin: '16px 0 8px', fontSize: 12 }}>Exemples :</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLES.map(ex => (
            <button key={ex} className="adm-pill" onClick={() => { setText(ex); analyze(ex); }}
              style={{ cursor: 'pointer', fontSize: 11, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-dim)', borderRadius: 100, padding: '4px 10px' }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <h3 style={h3}>Résultat de l'IA</h3>
        {err && <p style={{ color: 'var(--adm-red)', fontSize: 13 }}>{err}</p>}
        {!result ? <p style={dim}>Le résultat s'affichera ici.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 40 }}>{SENTIMENT_META[result.sentiment].emoji}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: SENTIMENT_META[result.sentiment].color }}>{SENTIMENT_META[result.sentiment].label}</div>
                <div style={dim}>Confiance : {pct(result.confidence)} · Score : {result.score > 0 ? '+' : ''}{result.score}</div>
              </div>
            </div>
            {result.inconsistent && (
              <div className="adm-badge adm-badge-amber" style={{ alignSelf: 'flex-start' }}><AlertTriangle size={11} /> La note ne correspond pas au texte</div>
            )}
            <div>
              <p style={{ ...dim, fontSize: 12, margin: '0 0 6px' }}>Aspects détectés</p>
              {!result.aspects.length ? <span style={dim}>Aucun</span> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.aspects.map(a => <span key={a.id} className={`adm-badge ${SENTIMENT_META[a.sentiment].badge}`}>{SENTIMENT_META[a.sentiment].emoji} {a.label}</span>)}
                </div>
              )}
            </div>
            <div>
              <p style={{ ...dim, fontSize: 12, margin: '0 0 6px' }}>Mots qui ont le plus pesé dans la décision</p>
              {!result.keywords.length ? <span style={dim}>—</span> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywords.map(k => <span key={k} className="adm-badge adm-badge-blue">{k}</span>)}
                </div>
              )}
            </div>
            {canTeach && (
              <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: 12 }}>
                <p style={{ ...dim, fontSize: 12, margin: 0 }}>L'IA s'est trompée ? Apprenez-lui la bonne réponse :</p>
                <CorrectSentiment current={result.sentiment} onCorrect={teach} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Onglet "Apprentissage" : l'IA apprend des corrections des admins ────────

/** Courbe de précision au fil des réentraînements. */
function AccuracyChart({ versions, model }: { versions: ModelVersion[]; model: 'chatbot' | 'sentiment' }) {
  const pts = versions
    .filter(v => v.model === model)
    .map(v => ({ ...v, value: model === 'chatbot' ? (v.test_accuracy ?? v.accuracy) : v.accuracy }))
    .filter(v => v.value != null)
    .sort((a, b) => a.trained_at.localeCompare(b.trained_at))
    .slice(-20);
  if (pts.length < 2) {
    return <p style={{ ...dim, fontSize: 12 }}>La courbe apparaîtra après la première correction.</p>;
  }
  const W = 320, H = 90, P = 6;
  const vals = pts.map(p => p.value!);
  const min = Math.max(0, Math.min(...vals) - 0.05), max = Math.min(1, Math.max(...vals) + 0.05);
  const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value!).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 120 }} role="img"
      aria-label={`Précision de ${pct(vals[0])} à ${pct(vals[vals.length - 1])}`}>
      <path d={path} fill="none" stroke="var(--adm-gold)" strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value!)} r={3} fill="var(--adm-gold)">
          <title>{`${new Date(p.trained_at).toLocaleString('fr-FR')} — ${pct(p.value!)}\n${p.reason ?? ''}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function LearningTab() {
  const [data, setData] = useState<LearningReport | null>(null);
  const [err, setErr] = useState('');
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newIntent, setNewIntent] = useState('');

  const load = () => aiApi.learning().then(d => { setData(d); setErr(''); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try { await action(); toast.success(message); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(null); }
  };

  if (err) return <div className="adm-card" style={{ color: 'var(--adm-red)' }}>{err}</div>;
  if (!data) return <p style={dim}>Chargement…</p>;
  const { stats } = data;
  const intentName = (i: string | null) => (i ? INTENT_LABELS[i] ?? i : 'non comprise');

  return (
    <>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          <b>Comment l'IA apprend :</b> chaque question posée au chatbot est enregistrée. Quand l'IA n'est pas sûre d'elle
          (le Naive Bayes hésite, ou c'est le réseau de neurones qui a répondu) ou qu'un client clique sur 👎, la question
          arrive ici. Vous confirmez ou corrigez la réponse → le modèle est <b>réentraîné immédiatement</b>, sans
          redémarrer le serveur, et la phrase sera ensuite reconnue à coup sûr.
        </p>
      </div>

      <div style={grid(150)}>
        {[
          { label: 'Questions (7 jours)', value: String(stats.week), color: 'var(--adm-gold)' },
          { label: 'Comprises (7 jours)', value: stats.understoodRate == null ? '—' : pct(stats.understoodRate), color: 'var(--adm-green)' },
          { label: 'À vérifier', value: String(stats.pending), color: stats.pending ? 'var(--adm-amber)' : 'var(--adm-green)' },
          { label: 'Avis clients 👍 / 👎', value: `${stats.thumbsUp} / ${stats.thumbsDown}`, color: 'var(--adm-blue)' },
          { label: 'Exemples appris', value: String(stats.learnedChatbot + stats.learnedSentiment), color: 'var(--adm-gold)' },
        ].map(k => (
          <div key={k.label} className="adm-kpi">
            <div style={{ fontSize: 11, color: 'var(--adm-text-dim)' }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 6 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* File d'attente */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h3 style={h3}>Questions à vérifier ({data.queue.length})</h3>
        {!data.queue.length ? (
          <p style={dim}>🎉 Rien à corriger : l'IA a compris toutes les questions récentes.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.queue.map(q => {
              const selected = choice[q.id] ?? q.predicted_intent ?? '';
              return (
                <div key={q.id} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--adm-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>« {q.message} »</span>
                    {q.feedback === 'down' && <span className="adm-badge adm-badge-red">👎 client pas satisfait</span>}
                  </div>
                  <p style={{ ...dim, fontSize: 12, margin: '0 0 8px' }}>
                    L'IA a compris : <b>{intentName(q.predicted_intent)}</b> ({pct(q.confidence)} de confiance)
                    {q.engine === 'neural' && <> · <span className="adm-badge adm-badge-blue">🧠 réseau de neurones — à valider</span></>}
                    · {new Date(q.created_at).toLocaleString('fr-FR')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <select className="adm-select" value={selected} onChange={e => setChoice(c => ({ ...c, [q.id]: e.target.value }))}
                      style={{ maxWidth: 260 }} aria-label="Bonne intention">
                      <option value="" disabled>La bonne réponse est…</option>
                      {data.intents.map(i => <option key={i} value={i}>{intentName(i)}</option>)}
                    </select>
                    <button className="adm-btn adm-btn-gold" style={{ gap: 6 }} disabled={!selected || busy === q.id}
                      onClick={() => run(q.id, () => aiApi.learnFromLog(q.id, selected), `Appris : « ${q.message} » → ${intentName(selected)}`)}>
                      <Check size={14} /> Apprendre
                    </button>
                    <button className="adm-btn adm-btn-ghost" style={{ gap: 6 }} disabled={busy === q.id}
                      title="Question hors sujet ou sans intérêt"
                      onClick={() => run(q.id, () => aiApi.ignoreLog(q.id), 'Question ignorée')}>
                      <X size={14} /> Ignorer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={grid(320)}>
        {/* Ajout manuel */}
        <div className="adm-card">
          <h3 style={h3}>Apprendre une nouvelle phrase</h3>
          <p style={{ ...dim, fontSize: 12, marginTop: -6 }}>Anticipez les questions des clients (expressions locales, malgache…).</p>
          <input className="adm-input" value={newText} onChange={e => setNewText(e.target.value)} maxLength={500}
            placeholder="Ex : misy toerana hijanonana ve ?" style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="adm-select" value={newIntent} onChange={e => setNewIntent(e.target.value)} style={{ flex: 1, minWidth: 160 }} aria-label="Intention">
              <option value="" disabled>Signifie…</option>
              {data.intents.map(i => <option key={i} value={i}>{intentName(i)}</option>)}
            </select>
            <button className="adm-btn adm-btn-gold" style={{ gap: 6 }} disabled={!newText.trim() || !newIntent || busy === 'new'}
              onClick={() => run('new', async () => { await aiApi.addChatExample(newText, newIntent); setNewText(''); }, 'Phrase apprise')}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>

        {/* Courbes */}
        <div className="adm-card">
          <h3 style={h3}>Évolution de la précision</h3>
          <p style={{ ...dim, fontSize: 12, margin: '0 0 4px' }}>Chatbot (questions de test)</p>
          <AccuracyChart versions={data.versions} model="chatbot" />
          <p style={{ ...dim, fontSize: 12, margin: '10px 0 4px' }}>Analyse des avis (validation croisée)</p>
          <AccuracyChart versions={data.versions} model="sentiment" />
        </div>
      </div>

      {/* Exemples appris */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h3 style={h3}>Ce que l'IA a appris ({data.examples.length})</h3>
        {!data.examples.length ? <p style={dim}>Aucune correction pour l'instant.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Phrase</th><th>Modèle</th><th>Réponse apprise</th><th>Par</th><th /></tr></thead>
              <tbody>
                {data.examples.map(e => (
                  <tr key={e.id}>
                    <td style={{ maxWidth: 360 }}>{e.text}</td>
                    <td>{e.model === 'chatbot' ? 'Chatbot' : 'Avis'}</td>
                    <td>
                      {e.model === 'chatbot'
                        ? intentName(e.label)
                        : <span className={`adm-badge ${SENTIMENT_META[e.label as Sentiment]?.badge ?? ''}`}>{SENTIMENT_META[e.label as Sentiment]?.label ?? e.label}</span>}
                    </td>
                    <td style={{ color: 'var(--adm-text-dim)', fontSize: 12 }}>{e.created_by ?? '—'}</td>
                    <td>
                      <button className="adm-btn adm-btn-ghost" title="Oublier cet exemple" aria-label="Oublier cet exemple" disabled={busy === e.id}
                        onClick={() => { if (confirm(`Oublier « ${e.text} » ?`)) run(e.id, () => aiApi.forgetExample(e.id), 'Exemple oublié, modèle réentraîné'); }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="adm-card">
        <h3 style={h3}>Historique des réentraînements</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Modèle</th><th>Raison</th><th>Exemples</th><th>Précision</th></tr></thead>
            <tbody>
              {data.versions.slice(0, 15).map((v, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(v.trained_at).toLocaleString('fr-FR')}</td>
                  <td>{v.model === 'chatbot' ? 'Chatbot' : 'Avis'}</td>
                  <td style={{ fontSize: 12 }}>{v.reason}</td>
                  <td>{v.examples} <span style={{ color: 'var(--adm-text-muted)', fontSize: 11 }}>({v.learned} appris)</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--adm-green)' }}>
                    {v.model === 'chatbot' && v.test_accuracy != null ? pct(v.test_accuracy) : v.accuracy != null ? pct(v.accuracy) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Onglet 3 : performances ─────────────────────────────────────────────────
function Confusion({ labels, matrix }: { labels: string[]; matrix: Record<string, Record<string, number>> }) {
  const max = Math.max(1, ...labels.flatMap(a => labels.map(b => matrix[a]?.[b] ?? 0)));
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: 6, color: 'var(--adm-text-muted)', fontWeight: 500, textAlign: 'left' }}>réel ↓ / prédit →</th>
            {labels.map(l => <th key={l} style={{ padding: 6, fontWeight: 600 }}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map(a => (
            <tr key={a}>
              <td style={{ padding: 6, fontWeight: 600 }}>{a}</td>
              {labels.map(b => {
                const v = matrix[a]?.[b] ?? 0;
                const ok = a === b;
                return (
                  <td key={b} style={{
                    padding: '8px 12px', textAlign: 'center', borderRadius: 4, fontWeight: 700,
                    background: v ? (ok ? `rgba(34,197,94,${0.15 + (v / max) * 0.5})` : `rgba(239,68,68,${0.1 + (v / max) * 0.5})`) : 'transparent',
                  }}>{v}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BigNumber({ value, label, color = 'var(--adm-gold)' }: { value: string; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
      <div style={{ ...dim, fontSize: 12 }}>{label}</div>
    </div>
  );
}

/** Naive Bayes seul vs Naive Bayes + réseau de neurones, mesuré sur les mêmes questions. */
function NeuralComparison({ neural }: { neural: ModelsReport['neural'] }) {
  const { comparison: c, thresholds: t } = neural;
  const statusText: Record<string, string> = {
    ready: 'actif', loading: 'en cours de chargement…', off: 'désactivé (AI_SEMANTIC=off)', error: `indisponible : ${neural.error ?? ''}`,
  };
  const bar = (n: number, total: number, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, minWidth: 60 }}>
        <div style={{ width: `${(n / total) * 100}%`, height: 8, background: color, borderRadius: 4 }} />
      </div>
      <b style={{ fontSize: 13, minWidth: 80, textAlign: 'right' }}>{n}/{total} ({pct(n / total)})</b>
    </div>
  );
  return (
    <div className="adm-card" style={{ marginBottom: 16, borderColor: 'var(--adm-border-gold)' }}>
      <h3 style={h3}>2 bis. Naive Bayes + réseau de neurones</h3>
      <p style={{ ...dim, marginTop: -8 }}>
        Transformer MiniLM multilingue (12 couches, vecteurs de 384 dimensions), exécuté dans le serveur ·
        état : <b style={{ color: neural.status === 'ready' ? 'var(--adm-green)' : 'var(--adm-amber)' }}>{statusText[neural.status]}</b>
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        Le Naive Bayes reconnaît des <b>mots</b> ; le réseau de neurones comprend le <b>sens</b>. Le Naive Bayes répond
        seul quand il est sûr (≥ {pct(t.naiveBayesTrusted)}). Sinon, le réseau de neurones cherche les 5 exemples de sens le
        plus proche et ne répond que si au moins {Math.round(t.minAgreement * 5)} sont d'accord et que la similarité atteint {t.minSimilarity} ;
        sinon la question est considérée hors sujet.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="adm-table">
          <thead><tr><th>Jeu de questions</th><th>Naive Bayes seul</th><th>Naive Bayes + neurones</th></tr></thead>
          <tbody>
            {c.sets.map(s => (
              <tr key={s.name}>
                <td>{s.name}<div style={{ fontSize: 11, color: 'var(--adm-text-muted)' }}>bien comprises</div></td>
                <td style={{ minWidth: 180 }}>{bar(s.naiveBayes, s.total, 'var(--adm-text-dim)')}</td>
                <td style={{ minWidth: 180 }}>{bar(s.hybrid, s.total, 'var(--adm-green)')}</td>
              </tr>
            ))}
            <tr>
              <td>Questions hors sujet<div style={{ fontSize: 11, color: 'var(--adm-text-muted)' }}>correctement refusées</div></td>
              <td>{bar(c.outOfScope.naiveBayesRejected, c.outOfScope.total, 'var(--adm-text-dim)')}</td>
              <td>{bar(c.outOfScope.hybridRejected, c.outOfScope.total, 'var(--adm-green)')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ ...dim, fontSize: 12, marginTop: 10 }}>
        « Reformulations difficiles » : 30 questions sans mot commun avec les exemples (ex. « où passer la nuit ? »).
        Les seuils ont été réglés sur ces mêmes jeux : les chiffres sont donc légèrement optimistes. Les réponses du
        réseau de neurones sont envoyées dans l'onglet Apprentissage pour validation.
      </p>
    </div>
  );
}

function ModelsTab() {
  const [data, setData] = useState<ModelsReport | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { aiApi.models().then(setData).catch(e => setErr(e.message)); }, []);

  if (err) return <div className="adm-card" style={{ color: 'var(--adm-red)' }}>{err}</div>;
  if (!data) return <p style={dim}>Évaluation des modèles…</p>;
  const { sentiment: s, chatbot: c, recommender: r } = data;

  return (
    <>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          Les trois modèles sont <b>programmés dans le serveur ARENAH</b>, sans API externe. Les précisions sont
          mesurées sur des données que le modèle <b>n'a pas vues pendant l'entraînement</b> (validation croisée à 5 plis
          ou jeu de test séparé).
        </p>
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h3 style={h3}>1. Analyse des avis</h3>
        <p style={{ ...dim, marginTop: -8 }}>{s.algorithm} · {s.examples} phrases d'entraînement (dont {s.learned} apprises des admins) · {s.vocabulary} mots de vocabulaire</p>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '16px 0' }}>
          <BigNumber value={pct(s.crossValidation.accuracy)} label="Précision (validation croisée)" color="var(--adm-green)" />
          {Object.entries(s.crossValidation.perClass).map(([l, m]) => (
            <BigNumber key={l} value={m.f1.toFixed(2)} label={`Score F1 « ${l} »`} color={SENTIMENT_META[l as Sentiment]?.color} />
          ))}
        </div>
        <p style={{ ...dim, fontSize: 12 }}>Matrice de confusion (vert = bonne réponse, rouge = erreur) :</p>
        <Confusion labels={s.crossValidation.labels} matrix={s.crossValidation.confusion} />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h3 style={h3}>2. Assistant conversationnel</h3>
        <p style={{ ...dim, marginTop: -8 }}>{c.algorithm} · {c.intents} intentions · {c.examples} exemples (dont {c.learned} appris des admins) · {c.vocabulary} mots · tolère les fautes de frappe</p>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '16px 0' }}>
          <BigNumber value={pct(c.testSet.accuracy)} label={`Précision sur ${c.testSet.total} questions de test réalistes`} color="var(--adm-green)" />
          <BigNumber value={pct(c.crossValidation.accuracy)} label="Validation croisée (inclut des mots isolés, plus difficile)" />
        </div>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--adm-text-dim)' }}>Détail par intention (jeu de test)</summary>
          <table className="adm-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Intention</th><th>Précision</th><th>Rappel</th><th>Questions</th></tr></thead>
            <tbody>
              {Object.entries(c.testSet.perClass).filter(([, m]) => m.support > 0).map(([l, m]) => (
                <tr key={l}><td>{l}</td><td>{pct(m.precision)}</td><td>{pct(m.recall)}</td><td>{m.support}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <NeuralComparison neural={data.neural} />

      <div className="adm-card">
        <h3 style={h3}>3. Recommandations personnalisées</h3>
        <p style={{ ...dim, marginTop: -8 }}>{r.algorithm} · {r.users ?? 0} clients dans la matrice</p>
        {!r.tested ? (
          <p style={dim}>Pas encore assez d'historique (il faut des clients ayant utilisé au moins 2 services) pour mesurer la précision.</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '16px 0' }}>
              <BigNumber value={pct(r.hitRateAI ?? 0)} label={`IA : service caché retrouvé dans le top ${r.topN}`} color="var(--adm-green)" />
              <BigNumber value={pct(r.hitRatePopularity ?? 0)} label="Méthode naïve (les plus populaires)" color="var(--adm-text-dim)" />
            </div>
            <p style={{ ...dim, fontSize: 12 }}>
              Test « leave-one-out » sur {r.tested} cas : pour chaque client, on cache un service qu'il a réellement utilisé
              et on vérifie si l'IA le retrouve.
            </p>
          </>
        )}
      </div>
    </>
  );
}

export default function AdminAI() {
  const { user } = useClientAuth();
  // Le chatbot est commun à toute la plateforme : seul le super admin l'entraîne
  const isSuperAdmin = user?.role === 'super_admin';
  const tabs = TABS.filter(t => t.id !== 'learn' || isSuperAdmin);
  const [tab, setTab] = useState<Tab>('avis');
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--adm-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={22} style={{ color: 'var(--adm-gold)' }} /> Intelligence IA
        </h1>
        <p style={{ ...dim, margin: '4px 0 0' }}>Analyse automatique des avis, assistant client et recommandations, sans API externe</p>
      </div>

      <div className="adm-card" style={{ display: 'inline-flex', padding: 4, gap: 2, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`adm-btn ${tab === id ? 'adm-btn-gold' : 'adm-btn-ghost'}`} style={{ gap: 6, border: 'none' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'avis' && <ReviewsTab />}
      {tab === 'learn' && isSuperAdmin && <LearningTab />}
      {tab === 'test' && <TestTab canTeach={isSuperAdmin} />}
      {tab === 'models' && <ModelsTab />}
    </div>
  );
}
