/**
 * ARENAH IA – Routes
 *
 *   POST /api/ai/chat              assistant conversationnel (public, JWT optionnel)
 *   POST /api/ai/sentiment         analyser un texte libre (admin, démonstration)
 *   GET  /api/ai/reviews-analysis  tableau de bord des avis clients (admin)
 *   GET  /api/ai/models            performances des 3 modèles (admin)
 *   POST /api/ai/chat/:id/feedback 👍/👎 du client sur une réponse
 *   GET  /api/ai/learning          file d'apprentissage + historique (admin)
 *   POST /api/ai/learning/...      corrections de l'admin → réentraînement immédiat
 *
 * Aucune API externe : tous les modèles tournent dans ce serveur (voir server/ai/).
 */
import { Router, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { query, queryOne } from '../db/database.js';
import { readToken, requireAdmin, requireSuperAdmin, AuthRequest } from '../middleware/auth.js';
import { chat, chatbotEvaluation, chatbotModelInfo, hybridEvaluation, INTENT_NAMES, NB_TRUSTED } from '../ai/chatbot.js';
import { semanticStatus, MIN_AGREEMENT, MIN_SIMILARITY } from '../ai/semantic.js';
import { analyzeReview, sentimentEvaluation, sentimentModelInfo, ASPECTS, SENTIMENTS } from '../ai/sentiment.js';
import {
  logChat, recordFeedback, learningReady, REVIEW_THRESHOLD, learnFromChatLog, ignoreChatLog,
  addExample, retrain, deleteExample, sentimentOverride,
} from '../ai/learning.js';
import { evaluateRecommender } from '../ai/recommender.js';
import type { Sentiment } from '../ai/data/sentimentData.js';

const router = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Le chat est public et chaque message est enregistré : on limite le débit par
// adresse IP pour qu'un robot ne puisse pas saturer la base.
const chatLimiter = rateLimit({
  windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de messages, patientez une minute.' },
});

/** Modules dont un admin a la charge (null = tous, pour le super admin). */
function adminModules(req: AuthRequest): string[] | null {
  if (req.user!.role !== 'admin_module') return null;
  const m = req.user!.module_assigned;
  if (!m) return [];
  return m === 'spectacles' ? ['spectacles', 'show'] : [m];
}

// ─── Chatbot ─────────────────────────────────────────────────────────────────
router.post('/chat', chatLimiter, async (req, res: Response) => {
  const message = String(req.body?.message ?? '').trim().slice(0, 500);
  if (!message) { res.status(400).json({ error: 'message requis' }); return; }
  const previousIntent = typeof req.body?.previousIntent === 'string' ? req.body.previousIntent : null;
  const userId = readToken(req)?.id ?? null;
  const reply = await chat(message, userId, previousIntent);
  reply.logId = await logChat(message, reply);
  res.json(reply);
});

// 👍 / 👎 du client sur une réponse
router.post('/chat/:id/feedback', chatLimiter, async (req, res: Response) => {
  if (!UUID.test(String(req.params.id))) { res.status(400).json({ error: 'id invalide' }); return; }
  await recordFeedback(String(req.params.id), req.body?.helpful === true);
  res.json({ success: true });
});

// ─── Apprentissage continu ──────────────────────────────────────────────────
// Le chatbot est commun à toute la plateforme : seul le super admin peut lui
// apprendre quelque chose. Un admin de module ne corrige que les avis de SON
// module (voir /learning/sentiment).
router.get('/learning', requireSuperAdmin, async (_req, res: Response) => {
  if (!learningReady()) { res.status(503).json({ error: 'Apprentissage indisponible : lancez npm run db:init' }); return; }

  const [queue, examples, stats, versions, topMissed] = await Promise.all([
    query(`
      SELECT id, message, predicted_intent, confidence, understood, feedback, engine, created_at
      FROM ai_chat_logs WHERE status = 'pending'
      ORDER BY (feedback = 'down') DESC NULLS LAST, created_at DESC LIMIT 100`),
    query(`
      SELECT e.id, e.model, e.text, e.label, e.source, e.created_at, u.fullname AS created_by
      FROM ai_training_examples e LEFT JOIN users u ON u.id = e.created_by
      ORDER BY e.created_at DESC LIMIT 200`),
    queryOne<Record<string, string>>(`
      SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS week,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND understood) AS week_understood,
             COUNT(*) FILTER (WHERE status = 'pending') AS pending,
             COUNT(*) FILTER (WHERE feedback = 'up') AS thumbs_up,
             COUNT(*) FILTER (WHERE feedback = 'down') AS thumbs_down,
             COUNT(*) AS total
      FROM ai_chat_logs`),
    query(`SELECT model, examples, learned, accuracy, test_accuracy, reason, trained_at
           FROM ai_model_versions ORDER BY trained_at DESC LIMIT 60`),
    query(`
      SELECT COALESCE(predicted_intent, '(non compris)') AS intent, COUNT(*)::int AS n
      FROM ai_chat_logs WHERE status = 'pending' GROUP BY 1 ORDER BY n DESC LIMIT 5`),
  ]);

  const week = Number(stats?.week ?? 0);
  res.json({
    intents: INTENT_NAMES,
    threshold: REVIEW_THRESHOLD,
    stats: {
      total: Number(stats?.total ?? 0),
      week,
      understoodRate: week ? Math.round((Number(stats!.week_understood) / week) * 100) / 100 : null,
      pending: Number(stats?.pending ?? 0),
      thumbsUp: Number(stats?.thumbs_up ?? 0),
      thumbsDown: Number(stats?.thumbs_down ?? 0),
      learnedChatbot: examples.filter(e => e.model === 'chatbot').length,
      learnedSentiment: examples.filter(e => e.model === 'sentiment').length,
    },
    queue, examples, versions, topMissed,
  });
});

// L'admin indique la bonne intention (ou ignore une question hors sujet)
router.post('/learning/chat/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  if (!UUID.test(String(req.params.id))) { res.status(400).json({ error: 'id invalide' }); return; }
  if (req.body?.ignore === true) {
    await ignoreChatLog(String(req.params.id));
    res.json({ success: true }); return;
  }
  const intent = String(req.body?.intent ?? '');
  if (!INTENT_NAMES.includes(intent)) { res.status(400).json({ error: 'intention inconnue' }); return; }
  try { await learnFromChatLog(String(req.params.id), intent, req.user!.id); }
  catch { res.status(404).json({ error: 'Question introuvable (déjà purgée ?)' }); return; }
  res.json({ success: true, model: chatbotModelInfo() });
});

// Ajouter directement une phrase d'exemple au chatbot
router.post('/learning/chatbot', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const text = String(req.body?.text ?? '').trim();
  const intent = String(req.body?.intent ?? '');
  if (!text || !INTENT_NAMES.includes(intent)) { res.status(400).json({ error: 'texte et intention valides requis' }); return; }
  await addExample('chatbot', text, intent, { source: 'admin', userId: req.user!.id });
  await retrain('chatbot', `Ajouté : « ${text.slice(0, 60)} » → ${intent}`);
  res.json({ success: true, model: chatbotModelInfo() });
});

// Corriger le sentiment d'un avis (ou d'une phrase testée)
router.post('/learning/sentiment', requireAdmin, async (req: AuthRequest, res: Response) => {
  const label = String(req.body?.label ?? '') as Sentiment;
  const reviewId = typeof req.body?.reviewId === 'string' && UUID.test(req.body.reviewId) ? req.body.reviewId : null;
  let text = String(req.body?.text ?? '').trim();
  const allowed = adminModules(req);
  if (reviewId) {
    const review = await queryOne<{ comment: string | null; module: string }>('SELECT comment, module FROM reviews WHERE id = $1', [reviewId]);
    if (!review) { res.status(404).json({ error: 'Avis introuvable' }); return; }
    if (allowed && !allowed.includes(review.module)) { res.status(403).json({ error: 'Cet avis ne concerne pas votre module' }); return; }
    text = review.comment ?? '';
  } else if (allowed) {
    // Phrase libre : elle modifierait le modèle de toute la plateforme
    res.status(403).json({ error: "Seul le super administrateur peut entraîner l'IA avec une phrase libre" }); return;
  }
  if (!text || !SENTIMENTS.includes(label)) { res.status(400).json({ error: 'texte et sentiment valides requis' }); return; }
  await addExample('sentiment', text, label, { source: reviewId ? 'review' : 'admin', reviewId, userId: req.user!.id });
  await retrain('sentiment', `Corrigé : « ${text.slice(0, 60)} » → ${label}`);
  res.json({ success: true, analysis: analyzeReview(text), model: sentimentModelInfo() });
});

// Oublier un exemple appris (erreur de l'admin)
router.delete('/learning/examples/:id', requireSuperAdmin, async (req, res: Response) => {
  if (!UUID.test(String(req.params.id))) { res.status(400).json({ error: 'id invalide' }); return; }
  try { await deleteExample(String(req.params.id)); }
  catch { res.status(404).json({ error: 'Exemple introuvable' }); return; }
  res.json({ success: true });
});

// ─── Analyse d'un texte libre (zone de test de la page admin) ───────────────
router.post('/sentiment', requireAdmin, (req, res: Response) => {
  const text = String(req.body?.text ?? '').slice(0, 2000);
  const rating = Number(req.body?.rating) || null;
  if (!text.trim()) { res.status(400).json({ error: 'text requis' }); return; }
  res.json(analyzeReview(text, rating));
});

// ─── Tableau de bord des avis ───────────────────────────────────────────────
router.get('/reviews-analysis', requireAdmin, async (req: AuthRequest, res: Response) => {
  // Un admin de module ne voit que les avis de son module
  let modules = adminModules(req);
  if (!modules && typeof req.query.module === 'string' && req.query.module) modules = [req.query.module];

  const rows = await query<{ id: string; module: string; rating: number; comment: string | null; fullname: string; created_at: string }>(`
    SELECT r.id, r.module, r.rating, r.comment, u.fullname, r.created_at
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE ($1::text[] IS NULL OR r.module = ANY($1))
    ORDER BY r.created_at DESC LIMIT 1000`, [modules]);

  // Si un admin a corrigé le sentiment d'un avis, sa correction fait foi
  const analyzed = rows.map(r => {
    const analysis = analyzeReview(r.comment, r.rating);
    const fixed = sentimentOverride(r.id);
    return { ...r, analysis: fixed ? { ...analysis, sentiment: fixed, confidence: 1, inconsistent: false, corrected: true } : analysis };
  });
  const empty = () => ({ positif: 0, negatif: 0, neutre: 0 } as Record<Sentiment, number>);

  const totals = empty();
  const byModule = new Map<string, { counts: Record<Sentiment, number>; ratingSum: number; n: number }>();
  const aspects = new Map<string, Record<Sentiment, number>>();
  const keywords = { positif: new Map<string, number>(), negatif: new Map<string, number>() };
  const weeks = new Map<string, { n: number; score: number }>();

  for (const r of analyzed) {
    const a = r.analysis;
    totals[a.sentiment]++;

    const m = byModule.get(r.module) ?? { counts: empty(), ratingSum: 0, n: 0 };
    m.counts[a.sentiment]++; m.ratingSum += r.rating; m.n++;
    byModule.set(r.module, m);

    for (const asp of a.aspects) {
      const c = aspects.get(asp.id) ?? empty();
      c[asp.sentiment]++;
      aspects.set(asp.id, c);
    }
    if (a.sentiment !== 'neutre') {
      for (const k of a.keywords) keywords[a.sentiment].set(k, (keywords[a.sentiment].get(k) ?? 0) + 1);
    }

    // Semaine (lundi) de l'avis, pour la tendance
    const d = new Date(r.created_at);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const wk = d.toISOString().slice(0, 10);
    const w = weeks.get(wk) ?? { n: 0, score: 0 };
    w.n++; w.score += a.score;
    weeks.set(wk, w);
  }

  const total = analyzed.length;
  const avgScore = total ? analyzed.reduce((s, r) => s + r.analysis.score, 0) / total : 0;

  const aspectList = [...aspects].map(([id, c]) => ({ id, label: ASPECTS[id].label, ...c, total: c.positif + c.negatif + c.neutre }))
    .sort((a, b) => b.total - a.total);

  // Constats rédigés automatiquement à partir des chiffres
  const insights: string[] = [];
  if (total) {
    insights.push(`${Math.round((totals.positif / total) * 100)} % des avis sont positifs, ${Math.round((totals.negatif / total) * 100)} % négatifs.`);
    const worst = [...aspectList].filter(a => a.negatif > 0).sort((a, b) => b.negatif - a.negatif)[0];
    if (worst) insights.push(`Point le plus critiqué : « ${worst.label} » (${worst.negatif} avis négatif${worst.negatif > 1 ? 's' : ''}).`);
    const best = [...aspectList].filter(a => a.positif > 0).sort((a, b) => b.positif - a.positif)[0];
    if (best) insights.push(`Point fort : « ${best.label} » (${best.positif} avis positif${best.positif > 1 ? 's' : ''}).`);
    const inconsistent = analyzed.filter(r => r.analysis.inconsistent).length;
    if (inconsistent) insights.push(`${inconsistent} avis ont une note qui contredit leur commentaire : à vérifier.`);
  }

  const topWords = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

  res.json({
    total,
    totals,
    satisfaction: Math.round(((avgScore + 1) / 2) * 100), // indice 0–100
    insights,
    byModule: [...byModule].map(([module, m]) => ({ module, ...m.counts, total: m.n, avgRating: Math.round((m.ratingSum / m.n) * 10) / 10 }))
      .sort((a, b) => b.total - a.total),
    aspects: aspectList,
    keywords: { positif: topWords(keywords.positif), negatif: topWords(keywords.negatif) },
    trend: [...weeks].sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
      .map(([week, w]) => ({ week, count: w.n, satisfaction: Math.round(((w.score / w.n + 1) / 2) * 100) })),
    alerts: analyzed.filter(r => r.analysis.sentiment === 'negatif' || r.analysis.inconsistent)
      .sort((a, b) => a.analysis.score - b.analysis.score).slice(0, 10)
      .map(r => ({ id: r.id, module: r.module, rating: r.rating, comment: r.comment, fullname: r.fullname, created_at: r.created_at, analysis: r.analysis })),
    reviews: analyzed.slice(0, 50).map(r => ({ id: r.id, module: r.module, rating: r.rating, comment: r.comment, fullname: r.fullname, created_at: r.created_at, analysis: r.analysis })),
  });
});

// ─── Performances des modèles ───────────────────────────────────────────────
router.get('/models', requireAdmin, async (_req, res: Response) => {
  const sentiment = sentimentEvaluation();
  const chatbot = chatbotEvaluation();
  const recommender = await evaluateRecommender(3).catch(() => null);
  const history = learningReady()
    ? await query(`SELECT model, examples, learned, accuracy, test_accuracy, reason, trained_at FROM ai_model_versions ORDER BY trained_at`).catch(() => [])
    : [];
  res.json({
    sentiment: { algorithm: 'Naive Bayes multinomial + lexique de polarité', ...sentimentModelInfo(), crossValidation: sentiment },
    chatbot: { algorithm: 'Naive Bayes (classification d\'intention) + extraction d\'entités', ...chatbotModelInfo(), ...chatbot },
    // Naive Bayes seul vs Naive Bayes + réseau de neurones (Transformer MiniLM)
    neural: {
      ...semanticStatus(),
      thresholds: { naiveBayesTrusted: NB_TRUSTED, minAgreement: MIN_AGREEMENT, minSimilarity: MIN_SIMILARITY },
      comparison: await hybridEvaluation(),
    },
    recommender: { algorithm: 'Filtrage collaboratif utilisateur-utilisateur (similarité cosinus, k = 10)', ...recommender },
    history,
  });
});

export default router;
