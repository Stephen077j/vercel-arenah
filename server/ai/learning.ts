/**
 * ARENAH IA – Apprentissage continu ("human-in-the-loop")
 *
 *   1. Chaque question posée au chatbot est enregistrée (ai_chat_logs) avec ce
 *      que l'IA a compris et sa confiance.
 *   2. Les questions mal comprises (confiance faible, ou 👎 du client)
 *      apparaissent dans l'onglet "Apprentissage" de l'admin.
 *   3. L'admin indique la bonne intention → la phrase devient un exemple
 *      d'entraînement (ai_training_examples) → le modèle est réentraîné
 *      immédiatement, sans redémarrer le serveur.
 *   4. Même principe pour les avis : l'admin corrige un sentiment mal classé.
 *   5. Chaque réentraînement est historisé (ai_model_versions) avec sa
 *      précision, pour suivre les progrès de l'IA.
 */
import { query, queryOne } from '../db/database.js';
import type { Example } from './naiveBayes.js';
import { retrainChatbot, chatbotEvaluation, chatbotModelInfo, semanticExamples, type ChatReply } from './chatbot.js';
import { indexExamples } from './semantic.js';
import { retrainSentiment, sentimentEvaluation, sentimentModelInfo } from './sentiment.js';
import type { Sentiment } from './data/sentimentData.js';

export type ModelName = 'chatbot' | 'sentiment';

/** En dessous de cette confiance, la question est proposée à l'admin. */
export const REVIEW_THRESHOLD = 0.5;

/** Corrections de sentiment par avis (review_id → sentiment choisi par l'admin). */
let sentimentOverrides = new Map<string, Sentiment>();
export const sentimentOverride = (reviewId: string) => sentimentOverrides.get(reviewId);

let ready = false;
export const learningReady = () => ready;

/** Dernière version de modèle chargée par CE processus (synchronisation multi-serveurs). */
let loadedVersion = 0;
const SYNC_INTERVAL_MS = 60_000;

async function latestVersion(): Promise<number> {
  const row = await queryOne<{ id: number | null }>('SELECT MAX(id) AS id FROM ai_model_versions');
  return Number(row?.id ?? 0);
}

/**
 * Si l'API tourne sur plusieurs serveurs, une correction faite sur l'un doit
 * atteindre les autres : chaque processus vérifie régulièrement s'il existe
 * une version plus récente que la sienne et se réentraîne le cas échéant.
 */
async function syncWithOtherInstances() {
  try {
    const latest = await latestVersion();
    if (latest > loadedVersion) {
      await retrain('all');
      loadedVersion = latest;
    }
  } catch { /* base momentanément indisponible : on réessaiera */ }
}

/** Recharge les exemples appris depuis la base et réentraîne le(s) modèle(s). */
export async function retrain(model: ModelName | 'all', reason?: string) {
  const rows = await query<{ model: ModelName; text: string; label: string; review_id: string | null }>(
    'SELECT model, text, label, review_id FROM ai_training_examples ORDER BY created_at');

  if (model === 'chatbot' || model === 'all') {
    retrainChatbot(rows.filter(r => r.model === 'chatbot').map(r => ({ text: r.text, label: r.label })));
    // Le réseau de neurones apprend aussi les corrections (seules les nouvelles phrases sont calculées)
    await indexExamples(semanticExamples()).catch(() => { /* réseau indisponible : Naive Bayes seul */ });
    if (reason) await recordVersion('chatbot', reason);
  }
  if (model === 'sentiment' || model === 'all') {
    const s = rows.filter(r => r.model === 'sentiment');
    retrainSentiment(s.map(r => ({ text: r.text, label: r.label as Sentiment })));
    sentimentOverrides = new Map(s.filter(r => r.review_id).map(r => [r.review_id!, r.label as Sentiment]));
    if (reason) await recordVersion('sentiment', reason);
  }
  if (reason) loadedVersion = await latestVersion();
}

/** Historise la précision du modèle après un réentraînement. */
async function recordVersion(model: ModelName, reason: string) {
  if (model === 'chatbot') {
    const ev = chatbotEvaluation();
    const info = chatbotModelInfo();
    await query(
      `INSERT INTO ai_model_versions (model, examples, learned, accuracy, test_accuracy, reason) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['chatbot', info.examples, info.learned, ev.crossValidation.accuracy, ev.testSet.accuracy, reason]);
  } else {
    const ev = sentimentEvaluation();
    const info = sentimentModelInfo();
    await query(
      `INSERT INTO ai_model_versions (model, examples, learned, accuracy, reason) VALUES ($1,$2,$3,$4,$5)`,
      ['sentiment', info.examples, info.learned, ev.accuracy, reason]);
  }
}

/** Au démarrage du serveur : charge ce que l'IA a déjà appris. */
export async function initLearning() {
  try {
    await retrain('all');
    // Première version historisée = le modèle de base
    for (const m of ['chatbot', 'sentiment'] as ModelName[]) {
      const v = await queryOne('SELECT 1 FROM ai_model_versions WHERE model = $1 LIMIT 1', [m]);
      if (!v) await recordVersion(m, 'Modèle initial');
    }
    loadedVersion = await latestVersion();
    ready = true;
    setInterval(syncWithOtherInstances, SYNC_INTERVAL_MS).unref();
    const c = chatbotModelInfo(), s = sentimentModelInfo();
    console.log(`🧠 IA prête — chatbot : ${c.learned} exemple(s) appris · avis : ${s.learned} correction(s)`);
  } catch (err) {
    // Tables absentes (npm run db:init pas relancé) : l'IA marche, sans apprentissage
    console.warn(`⚠️  Apprentissage IA désactivé : ${(err as Error).message}. Lancez npm run db:init.`);
  }
}

// ─── Journal du chatbot ─────────────────────────────────────────────────────

/**
 * Masque les données personnelles qu'un client pourrait taper dans le chat
 * (e-mail, numéro de téléphone, numéro de carte…) avant tout enregistrement.
 */
export function redactPersonalData(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[e-mail]')
    .replace(/\+?\d(?:[\s.-]?\d){7,}/g, '[numéro]'); // 8 chiffres ou plus, séparés ou non
}

/** Enregistre la question (anonyme, sans lien avec le compte client). */
export async function logChat(message: string, reply: ChatReply): Promise<string | undefined> {
  if (!ready) return undefined;
  const understood = reply.intent !== null;
  // Une réponse du réseau de neurones signifie que le Naive Bayes hésitait : on la
  // soumet à l'admin. Validée, elle devient un exemple et le Naive Bayes l'apprend.
  const status = understood && reply.certain ? 'ok' : 'pending';
  const row = await queryOne<{ id: string }>(
    `INSERT INTO ai_chat_logs (message, predicted_intent, confidence, understood, status, engine)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [redactPersonalData(message), reply.intent, reply.confidence, understood, status, reply.engine ?? null]).catch(() => undefined);
  return row?.id;
}

/** 👍 / 👎 du client : un 👎 renvoie la question dans la file de l'admin. */
export async function recordFeedback(logId: string, helpful: boolean) {
  await query(
    `UPDATE ai_chat_logs SET feedback = $2,
       status = CASE WHEN $2 = 'down' AND status IN ('ok') THEN 'pending' ELSE status END
     WHERE id = $1`, [logId, helpful ? 'up' : 'down']);
}

// ─── Corrections de l'admin ─────────────────────────────────────────────────

export async function addExample(model: ModelName, text: string, label: string, opts: {
  source: 'chat_log' | 'review' | 'admin'; reviewId?: string | null; userId?: string | null;
}) {
  const clean = text.trim().slice(0, 500);
  await query(
    `INSERT INTO ai_training_examples (model, text, label, source, review_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (model, text) DO UPDATE SET label = EXCLUDED.label, review_id = COALESCE(EXCLUDED.review_id, ai_training_examples.review_id)`,
    [model, clean, label, opts.source, opts.reviewId ?? null, opts.userId ?? null]);
}

export async function learnFromChatLog(logId: string, intent: string, userId: string) {
  const log = await queryOne<{ message: string }>('SELECT message FROM ai_chat_logs WHERE id = $1', [logId]);
  if (!log) throw new Error('Question introuvable');
  await addExample('chatbot', log.message, intent, { source: 'chat_log', userId });
  await query(`UPDATE ai_chat_logs SET status = 'learned', corrected_intent = $2, reviewed_at = NOW() WHERE id = $1`, [logId, intent]);
  await retrain('chatbot', `Appris : « ${log.message.slice(0, 60)} » → ${intent}`);
}

export async function ignoreChatLog(logId: string) {
  await query(`UPDATE ai_chat_logs SET status = 'ignored', reviewed_at = NOW() WHERE id = $1`, [logId]);
}

export async function deleteExample(id: string) {
  const row = await queryOne<{ model: ModelName; text: string }>(
    'DELETE FROM ai_training_examples WHERE id = $1 RETURNING model, text', [id]);
  if (!row) throw new Error('Exemple introuvable');
  await retrain(row.model, `Oublié : « ${row.text.slice(0, 60)} »`);
}

export type { Example };
