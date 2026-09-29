/**
 * ARENAH – Déclenchement HTTP des tâches planifiées
 *
 * Destiné aux hébergements qui ne gardent pas de processus vivant. Un
 * ordonnanceur externe (Vercel Cron, GitHub Actions schedule, cron-job.org,
 * Upstash QStash…) appelle ces routes selon la planification voulue.
 *
 *   POST /api/cron/reminder-j1     en-tête : x-cron-secret: <CRON_TRIGGER_SECRET>
 *   POST /api/cron/monthly-report
 *   GET  /api/cron                 liste les tâches et leur planification
 *
 * Sans CRON_TRIGGER_SECRET défini, les routes de déclenchement répondent 503 :
 * on n'expose jamais d'endpoint d'exécution non protégé.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { JOBS, type JobName } from '../jobs/index.js';
import { CRON_TRIGGER_SECRET, ENABLE_CRON } from '../config/env.js';

const router = Router();

/** Comparaison à temps constant, pour ne pas fuiter le secret octet par octet. */
function secretMatches(provided: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(CRON_TRIGGER_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    internal_scheduler: ENABLE_CRON ? 'actif (node-cron)' : 'désactivé (déclenchement externe attendu)',
    trigger_configured: !!CRON_TRIGGER_SECRET,
    jobs: Object.entries(JOBS).map(([name, j]) => ({
      name,
      label: j.label,
      schedule: j.schedule,
      trigger: `POST /api/cron/${name}`,
    })),
  });
});

router.post('/:job', async (req: Request, res: Response) => {
  if (!CRON_TRIGGER_SECRET) {
    res.status(503).json({ error: 'CRON_TRIGGER_SECRET non configuré — déclenchement HTTP désactivé' });
    return;
  }

  const provided = String(req.headers['x-cron-secret'] ?? '');
  if (!provided || !secretMatches(provided)) {
    res.status(401).json({ error: 'Secret de déclenchement invalide' });
    return;
  }

  const name = req.params.job as JobName;
  const job = JOBS[name];
  if (!job) {
    res.status(404).json({ error: `Tâche inconnue : ${name}`, available: Object.keys(JOBS) });
    return;
  }

  const result = await job.run();
  console.log(`[CRON:http] ${result.job} — ${result.ok ? 'OK' : 'ÉCHEC'} — ${result.detail}`);
  res.status(result.ok ? 200 : 500).json(result);
});

export default router;
