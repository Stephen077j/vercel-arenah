/**
 * ARENAH – Tâches planifiées
 *
 * Le corps des tâches vit ici, séparé de leur déclencheur, pour qu'elles
 * fonctionnent dans les deux modèles d'hébergement :
 *
 *   - Serveur permanent (VPS, conteneur toujours actif) : node-cron les
 *     déclenche depuis server/index.ts. C'est le comportement historique,
 *     conservé tel quel.
 *
 *   - Serverless / conteneur mis en veille (Vercel Functions, Render free,
 *     Railway…) : le processus est arrêté entre deux requêtes, donc node-cron
 *     ne se déclenche jamais. On pose ENABLE_CRON=false et un ordonnanceur
 *     externe appelle POST /api/cron/:job avec CRON_TRIGGER_SECRET.
 *
 * Les deux chemins exécutent exactement le même code.
 */
import { query } from '../db/database.js';
import { sendReminderJ1, sendMonthlyReport } from '../services/email.js';
import { smsReminderJ1 } from '../services/sms.js';
import { AI_LOG_RETENTION_DAYS } from '../config/env.js';

export interface JobResult {
  job: string;
  ok: boolean;
  detail: string;
  durationMs: number;
}

/** Rappel J-1 — quotidien à 08h00. */
export async function runReminderJ1(): Promise<JobResult> {
  const started = Date.now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmr = tomorrow.toISOString().slice(0, 10);

  try {
    const bookings = await query<{ email: string; fullname: string; phone: string; check_in: string; room_name: string }>(
      `SELECT u.email, u.fullname, u.phone, hb.check_in, hr.name as room_name
       FROM hotel_bookings hb JOIN users u ON u.id = hb.user_id JOIN hotel_rooms hr ON hr.id = hb.room_id
       WHERE hb.check_in = $1 AND hb.status != 'annule'`, [tmr]
    );
    await Promise.allSettled(bookings.map(b =>
      Promise.all([
        sendReminderJ1({ to: b.email, fullname: b.fullname, module: 'hôtel', details: b.room_name, date: b.check_in }),
        b.phone ? smsReminderJ1(b.phone, 'hôtel', b.check_in) : Promise.resolve(),
      ])
    ));
    return {
      job: 'reminder-j1', ok: true,
      detail: `${bookings.length} rappel(s) J-1 envoyé(s) pour le ${tmr}`,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      job: 'reminder-j1', ok: false,
      detail: (e as Error).message,
      durationMs: Date.now() - started,
    };
  }
}

/** Rapport mensuel — le 1er du mois à 07h00, sur le mois écoulé. */
export async function runMonthlyReport(): Promise<JobResult> {
  const started = Date.now();
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const year  = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1;
  const label = prevMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  try {
    const [kpi, byModule, totalOrders] = await Promise.all([
      query<{ revenue: number }>(
        `SELECT COALESCE(SUM(amount),0) as revenue FROM payments
         WHERE status='success' AND EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2`,
        [month, year]),
      query<{ module: string; revenue: number; count: number }>(
        `SELECT booking_type as module, SUM(amount) as revenue, COUNT(*) as count FROM payments
         WHERE status='success' AND EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2
         GROUP BY booking_type`,
        [month, year]),
      query<{ n: number }>(
        `SELECT COUNT(*) as n FROM orders
         WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2 AND status != 'cancelled'`,
        [month, year]),
    ]);

    const totalBookings = byModule.reduce((a, r) => a + Number(r.count), 0);
    const totalRevenue  = Number(kpi[0]?.revenue ?? 0);
    const totalOrdersN  = Number(totalOrders[0]?.n ?? 0);
    const adminEmail    = process.env.SUPERADMIN_EMAIL ?? 'admin@arenah.mg';

    await sendMonthlyReport({
      to: adminEmail, month: label, totalRevenue, totalBookings,
      totalOrders: totalOrdersN, byModule,
    });
    return {
      job: 'monthly-report', ok: true,
      detail: `Rapport ${label} envoyé à ${adminEmail}`,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      job: 'monthly-report', ok: false,
      detail: (e as Error).message,
      durationMs: Date.now() - started,
    };
  }
}

/**
 * Purge des questions posées au chatbot — quotidien à 03h30.
 * Ce sont des données personnelles : on ne les garde que le temps d'en
 * apprendre (AI_LOG_RETENTION_DAYS, 90 jours par défaut). Les phrases
 * apprises par l'IA sont copiées, sans lien avec le client, dans
 * ai_training_examples et ne sont pas concernées.
 */
export async function runAiLogPurge(): Promise<JobResult> {
  const started = Date.now();
  try {
    const rows = await query<{ n: number }>(
      `WITH d AS (DELETE FROM ai_chat_logs WHERE created_at < NOW() - make_interval(days => $1) RETURNING 1)
       SELECT COUNT(*)::int AS n FROM d`, [AI_LOG_RETENTION_DAYS]);
    return {
      job: 'ai-log-purge', ok: true,
      detail: `${rows[0]?.n ?? 0} question(s) de plus de ${AI_LOG_RETENTION_DAYS} jours supprimée(s)`,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return { job: 'ai-log-purge', ok: false, detail: (e as Error).message, durationMs: Date.now() - started };
  }
}

/** Catalogue des tâches, avec leur planification de référence. */
export const JOBS = {
  'reminder-j1':    { schedule: '0 8 * * *',   run: runReminderJ1,    label: 'Rappels J-1 (quotidien 08h00)' },
  'monthly-report': { schedule: '0 7 1 * *',   run: runMonthlyReport, label: 'Rapport mensuel (1er du mois 07h00)' },
  'ai-log-purge':   { schedule: '30 3 * * *',  run: runAiLogPurge,    label: 'Purge des questions du chatbot (quotidien 03h30)' },
} as const;

export type JobName = keyof typeof JOBS;
