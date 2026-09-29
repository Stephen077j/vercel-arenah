import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();
const ALL_SLOTS = ['09:00','10:00','11:00','14:00','15:00','16:00','17:00'];

router.get('/services', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM salon_services WHERE active = true ORDER BY category, price')); });
router.get('/hairdressers', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM salon_hairdressers WHERE active = true')); });

router.get('/availability', async (req: Request, res: Response) => {
  const { date, hairdresser_id } = req.query as Record<string, string>;
  if (!date) { res.status(400).json({ error: 'date requis' }); return; }
  const taken = await query<{ slot: string }>(
    `SELECT slot FROM salon_bookings WHERE date = $1 AND status != 'annule' ${hairdresser_id ? 'AND hairdresser_id = $2' : ''}`,
    hairdresser_id ? [date, hairdresser_id] : [date]
  );
  const takenSlots = taken.map(r => r.slot);
  res.json(ALL_SLOTS.map(s => ({ slot: s, available: !takenSlots.includes(s) })));
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT sb.*, ss.label as service_label, sh.name as hairdresser_name
     FROM salon_bookings sb JOIN salon_services ss ON ss.id = sb.service_id
     LEFT JOIN salon_hairdressers sh ON sh.id = sb.hairdresser_id
     WHERE sb.user_id = $1 ORDER BY sb.created_at DESC`, [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { service_id, hairdresser_id, date, slot, customer_name, customer_phone } = req.body;
  if (!service_id || !date || !slot) { res.status(400).json({ error: 'service_id, date et slot requis' }); return; }
  const service = await queryOne<{ price: number }>('SELECT price FROM salon_services WHERE id = $1 AND active = true', [service_id]);
  if (!service) { res.status(404).json({ error: 'Service introuvable' }); return; }
  const conflict = await queryOne(
    `SELECT id FROM salon_bookings WHERE date = $1 AND slot = $2 AND status != 'annule' ${hairdresser_id ? 'AND hairdresser_id = $3' : ''}`,
    hairdresser_id ? [date, slot, hairdresser_id] : [date, slot]
  );
  if (conflict) { res.status(409).json({ error: 'Créneau déjà réservé' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO salon_bookings (id,user_id,service_id,hairdresser_id,date,slot,price,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, req.user!.id, service_id, hairdresser_id||null, date, slot, service.price, customer_name||null, customer_phone||null]
  );
  const svcRow = await queryOne<{ label: string }>('SELECT label FROM salon_services WHERE id = $1', [service_id]);
  let hdName = '';
  if (hairdresser_id) { const h = await queryOne<{ name: string }>('SELECT name FROM salon_hairdressers WHERE id = $1', [hairdresser_id]); hdName = h ? ` avec ${h.name}` : ''; }
  await createNotification(req.user!.id, '✂️ RDV salon confirmé',
    `${svcRow?.label}${hdName} — ${date} à ${slot} — ${service.price.toLocaleString('fr-FR')} Ar`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM salon_bookings WHERE id = $1', [id]));
});

router.patch('/:id/rate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'rating entre 1 et 5' }); return; }
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM salon_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute('UPDATE salon_bookings SET rating = $1, comment = $2, updated_at = NOW() WHERE id = $3', [rating, comment||null, req.params.id]);
  res.json({ success: true });
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM salon_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE salon_bookings SET status = 'annule', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// Reporter un RDV (nouvelle date + créneau)
router.patch('/:id/reschedule', requireAuth, async (req: AuthRequest, res: Response) => {
  const { new_date, new_slot } = req.body as { new_date: string; new_slot: string };
  if (!new_date || !new_slot) { res.status(400).json({ error: 'new_date et new_slot requis' }); return; }
  const b = await queryOne<{ user_id: string; hairdresser_id: string | null }>(
    'SELECT user_id, hairdresser_id FROM salon_bookings WHERE id = $1', [req.params.id]
  );
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  const conflict = await queryOne(
    `SELECT id FROM salon_bookings WHERE date = $1 AND slot = $2 AND status != 'annule' AND id != $3
     ${b.hairdresser_id ? 'AND hairdresser_id = $4' : ''}`,
    b.hairdresser_id ? [new_date, new_slot, req.params.id, b.hairdresser_id] : [new_date, new_slot, req.params.id]
  );
  if (conflict) { res.status(409).json({ error: 'Ce créneau est déjà pris' }); return; }
  await execute(
    "UPDATE salon_bookings SET date = $1, slot = $2, status = 'confirme', updated_at = NOW() WHERE id = $3",
    [new_date, new_slot, req.params.id]
  );
  res.json({ success: true });
});

// Vue semaine : créneaux libres sur 7 jours pour un coiffeur
router.get('/week-slots', async (req: Request, res: Response) => {
  const { hairdresser_id, week_start } = req.query as Record<string, string>;
  const start = week_start ?? new Date().toISOString().slice(0, 10);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const taken = await query<{ date: string; slot: string }>(
    `SELECT date::text, slot FROM salon_bookings
     WHERE date >= $1 AND date <= $2 AND status != 'annule'
     ${hairdresser_id ? 'AND hairdresser_id = $3' : ''}`,
    hairdresser_id ? [dates[0], dates[6], hairdresser_id] : [dates[0], dates[6]]
  );
  const takenSet = new Set(taken.map(r => `${r.date}|${r.slot}`));
  res.json(dates.map(d => ({
    date: d,
    slots: ALL_SLOTS.map(s => ({ slot: s, available: !takenSet.has(`${d}|${s}`) })),
  })));
});

// Admin : marquer no-show
router.patch('/:id/no-show', async (req: Request, res: Response) => {
  await execute("UPDATE salon_bookings SET status = 'no_show', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// ── Combos services composés ──────────────────────────────────

router.get('/combos', async (_req, res: Response) => {
  res.json(await query('SELECT * FROM salon_service_combos WHERE active = true ORDER BY name'));
});

// Admin: créer un combo
router.post('/combos', async (req: Request, res: Response) => {
  const { name, description, service_ids, total_price, duration_min } = req.body;
  if (!name || !Array.isArray(service_ids) || !total_price) {
    res.status(400).json({ error: 'name, service_ids, total_price requis' }); return;
  }
  // Calculer le prix total depuis les services si non fourni
  let price = total_price;
  if (!price && service_ids.length) {
    const svcs = await query<{ price: number }>(`SELECT price FROM salon_services WHERE id = ANY($1)`, [service_ids]);
    price = svcs.reduce((s, sv) => s + sv.price, 0);
  }
  const id = generateId();
  await execute(
    `INSERT INTO salon_service_combos (id, name, description, service_ids, total_price, duration_min) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, name, description || null, JSON.stringify(service_ids), price, duration_min || null]
  );
  res.status(201).json({ id });
});

router.delete('/combos/:id', async (req: Request, res: Response) => {
  await execute('UPDATE salon_service_combos SET active = false WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
