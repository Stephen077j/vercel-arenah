import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

router.get('/plans',   async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM gym_plans WHERE active=true ORDER BY days')); });

// Config gym publique (prix séance, capacité)
router.get('/config', async (_req: Request, res: Response) => {
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM module_config WHERE module='gym'`);
  const map = Object.fromEntries(rows.map(r => [r.key, Number(r.value)]));
  res.json({ capacite_max: map['capacite_max'] ?? 40, prix_seance: map['prix_seance'] ?? 5000 });
});
router.get('/coaches', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM gym_coaches WHERE active = true')); });

router.get('/subscriptions', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT gs.*, gp.label as plan_label FROM gym_subscriptions gs JOIN gym_plans gp ON gp.id = gs.plan_id WHERE gs.user_id = $1 ORDER BY gs.created_at DESC',
    [req.user!.id]
  ));
});

router.post('/subscriptions', requireAuth, async (req: AuthRequest, res: Response) => {
  const { plan_id, customer_name, customer_phone, auto_renew = false } = req.body;
  if (!plan_id) { res.status(400).json({ error: 'plan_id requis' }); return; }
  const plan = await queryOne<{ price: number; days: number }>('SELECT price, days FROM gym_plans WHERE id = $1 AND active = true', [plan_id]);
  if (!plan) { res.status(404).json({ error: 'Plan introuvable' }); return; }
  const start = new Date().toISOString().slice(0, 10);
  const end   = new Date(Date.now() + plan.days * 86400000).toISOString().slice(0, 10);
  const id    = generateId();
  await execute(
    'INSERT INTO gym_subscriptions (id,user_id,plan_id,start_date,end_date,price,customer_name,customer_phone,auto_renew) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, req.user!.id, plan_id, start, end, plan.price, customer_name||null, customer_phone||null, !!auto_renew]
  );
  const planRow = await queryOne<{ label: string }>('SELECT label FROM gym_plans WHERE id = $1', [plan_id]);
  await createNotification(req.user!.id, '💪 Abonnement gym activé',
    `${planRow?.label} — valide du ${start} au ${end} — ${plan.price.toLocaleString('fr-FR')} Ar`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM gym_subscriptions WHERE id = $1', [id]));
});

router.get('/coach-bookings', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT gcb.*, gc.name as coach_name FROM gym_coach_bookings gcb JOIN gym_coaches gc ON gc.id = gcb.coach_id WHERE gcb.user_id = $1 ORDER BY gcb.created_at DESC',
    [req.user!.id]
  ));
});

router.post('/coach-bookings', requireAuth, async (req: AuthRequest, res: Response) => {
  const { coach_id, date, hours = 1, customer_name, customer_phone } = req.body;
  const h = Math.max(1, Math.min(8, Number(hours) || 1));
  if (!coach_id || !date) { res.status(400).json({ error: 'coach_id et date requis' }); return; }
  const coach = await queryOne<{ hour_price: number }>('SELECT hour_price FROM gym_coaches WHERE id = $1 AND active = true', [coach_id]);
  if (!coach) { res.status(404).json({ error: 'Coach introuvable' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO gym_coach_bookings (id,user_id,coach_id,date,hours,total,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, req.user!.id, coach_id, date, h, coach.hour_price * h, customer_name||null, customer_phone||null]
  );
  const coachRow = await queryOne<{ name: string }>('SELECT name FROM gym_coaches WHERE id = $1', [coach_id]);
  await createNotification(req.user!.id, '🏋️ Séance coach réservée',
    `Coach ${coachRow?.name} — ${date} (${h}h) — ${(coach.hour_price * h).toLocaleString('fr-FR')} Ar`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM gym_coach_bookings WHERE id = $1', [id]));
});

router.patch('/coach-bookings/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM gym_coach_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Séance introuvable' }); return; }
  await execute("UPDATE gym_coach_bookings SET status = 'annule', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

router.post('/checkin', requireAuth, async (req: AuthRequest, res: Response) => {
  const { sub_id } = req.body;
  const activeSub = await queryOne<{ id: string }>(
    `SELECT id FROM gym_subscriptions WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE ${sub_id ? 'AND id = $2' : ''} LIMIT 1`,
    sub_id ? [req.user!.id, sub_id] : [req.user!.id]
  );
  if (!activeSub) { res.status(400).json({ error: 'Aucun abonnement actif' }); return; }
  const id = generateId();
  await execute('INSERT INTO gym_checkins (id, user_id, sub_id) VALUES ($1,$2,$3)', [id, req.user!.id, activeSub.id]);
  res.status(201).json({ success: true, checkin_id: id });
});

// Historique des check-ins du mois en cours
router.get('/checkins', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ checked_in_at: string }>(
    `SELECT TO_CHAR(checked_in_at, 'YYYY-MM-DD') as checked_in_at
     FROM gym_checkins WHERE user_id = $1
     AND checked_in_at >= DATE_TRUNC('month', NOW())
     ORDER BY checked_in_at DESC`, [req.user!.id]
  );
  res.json({ dates: rows.map(r => r.checked_in_at), count: rows.length });
});

// ── Gym Sessions (capacité et prix depuis module_config) ──────────────────

async function getGymConfig() {
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM module_config WHERE module='gym' AND key IN ('capacite_max','prix_seance')`
  );
  const map = Object.fromEntries(rows.map(r => [r.key, Number(r.value)]));
  return { capacity: map['capacite_max'] ?? 40, prix: map['prix_seance'] ?? 5000 };
}

// Capacité actuelle pour un créneau
router.get('/sessions/capacity', async (req: Request, res: Response) => {
  const { date, time_from } = req.query as Record<string, string>;
  if (!date) { res.status(400).json({ error: 'date requis' }); return; }
  const { capacity } = await getGymConfig();
  const count = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int as n FROM gym_sessions
     WHERE date = $1 AND status = 'confirmed'
     AND ($2::text IS NULL OR time_from <= $2 AND time_to > $2)`,
    [date, time_from || null]
  );
  const current = Number(count?.n ?? 0);
  res.json({ current, max: capacity, available: capacity - current, full: current >= capacity });
});

// Réserver une session (avec vérif capacité)
router.post('/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  const { date, time_from, time_to, skill_level = 'debutant', sport, objective, customer_name } = req.body;
  if (!date || !time_from || !time_to) { res.status(400).json({ error: 'date, time_from, time_to requis' }); return; }
  const { capacity, prix } = await getGymConfig();
  const cap = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int as n FROM gym_sessions WHERE date = $1 AND status = 'confirmed' AND time_from < $3 AND time_to > $2`,
    [date, time_from, time_to]
  );
  if (Number(cap?.n ?? 0) >= capacity) {
    res.status(409).json({ error: `Salle complète (${capacity} personnes max) sur ce créneau` }); return;
  }
  const id = generateId();
  await execute(
    `INSERT INTO gym_sessions (id,user_id,date,time_from,time_to,skill_level,sport,objective,customer_name,price,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'confirmed')`,
    [id, req.user!.id, date, time_from, time_to, skill_level, sport || null, objective || null, customer_name || req.user!.email, prix]
  );
  await createNotification(req.user!.id, '💪 Session gym réservée', `${date} · ${time_from}–${time_to} · Niveau: ${skill_level}`, 'booking');
  res.status(201).json({ id, price: prix });
});

// Mes sessions gym
router.get('/sessions/my', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT * FROM gym_sessions WHERE user_id = $1 ORDER BY date DESC, time_from DESC LIMIT 20`, [req.user!.id]
  ));
});

export default router;
