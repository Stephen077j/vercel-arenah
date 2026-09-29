import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

router.get('/slots', async (_req: Request, res: Response) => {
  res.json(await query('SELECT * FROM field_slots WHERE active = true ORDER BY id'));
});

router.get('/availability', async (req: Request, res: Response) => {
  const { date } = req.query as Record<string, string>;
  if (!date) { res.status(400).json({ error: 'date requis' }); return; }
  const slots = await query<{ id: string; label: string; price: number; sport_type: string; equipment: string | null }>(
    'SELECT id, label, price, sport_type, equipment FROM field_slots WHERE active = true ORDER BY id'
  );
  const taken = await query<{ slot: string }>("SELECT slot FROM field_bookings WHERE date = $1 AND status != 'annule'", [date]);
  const takenSlots = taken.map(r => r.slot);
  res.json(slots.map(s => ({ ...s, available: !takenSlots.includes(s.id) })));
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT fb.*, fs.label as slot_label FROM field_bookings fb
     LEFT JOIN field_slots fs ON fs.id = fb.slot
     WHERE fb.user_id = $1 ORDER BY fb.date DESC`, [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { date, slot, customer_name, customer_phone, recurrence, recurrence_weeks } = req.body;
  if (!date || !slot) { res.status(400).json({ error: 'date et slot requis' }); return; }
  const slotData = await queryOne<{ price: number; label: string }>('SELECT price, label FROM field_slots WHERE id = $1 AND active = true', [slot]);
  if (!slotData) { res.status(404).json({ error: 'Créneau invalide' }); return; }

  const weeks = (recurrence && recurrence_weeks) ? Math.min(Number(recurrence_weeks) || 1, 12) : 1;
  const step   = recurrence === 'biweekly' ? 14 : 7;
  const ids: string[] = [];

  for (let w = 0; w < weeks; w++) {
    const d = new Date(date);
    d.setDate(d.getDate() + w * step);
    const bookDate = d.toISOString().slice(0, 10);
    const conflict = await queryOne("SELECT id FROM field_bookings WHERE date = $1 AND slot = $2 AND status != 'annule'", [bookDate, slot]);
    if (conflict) continue;
    const id = generateId();
    await execute(
      'INSERT INTO field_bookings (id,user_id,date,slot,price,customer_name,customer_phone,recurrence,recurrence_weeks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, req.user!.id, bookDate, slot, slotData.price, customer_name||null, customer_phone||null, recurrence||null, weeks > 1 ? weeks : null]
    );
    ids.push(id);
  }
  if (!ids.length) { res.status(409).json({ error: 'Aucun créneau disponible sur la période' }); return; }
  await createNotification(req.user!.id, '⚽ Terrain réservé',
    `${ids.length} créneau(x) — ${slotData.label} — ${(slotData.price * ids.length).toLocaleString('fr-FR')} Ar (paiement sur place)`, 'success');
  res.status(201).json({ booked: ids.length, first_date: date });
});

// ── Réservation terrain par plage horaire (entrée → sortie) ──

router.get('/planning', async (req: Request, res: Response) => {
  const { date } = req.query as Record<string, string>;
  if (!date) { res.status(400).json({ error: 'date requis' }); return; }
  const rows = await query(
    `SELECT fb.*, u.fullname as client
     FROM field_bookings fb LEFT JOIN users u ON u.id = fb.user_id
     WHERE fb.date = $1 AND fb.status != 'annule'
     ORDER BY COALESCE(fb.time_from, fb.slot)`, [date]
  );
  res.json(rows);
});

router.post('/by-time', requireAuth, async (req: AuthRequest, res: Response) => {
  const { date, time_from, time_to, customer_name, customer_phone } = req.body;
  if (!date || !time_from || !time_to) { res.status(400).json({ error: 'date, time_from, time_to requis' }); return; }
  // Conflit horaire
  const conflict = await queryOne(
    `SELECT id FROM field_bookings WHERE date = $1 AND status != 'annule'
     AND time_from IS NOT NULL AND time_from < $3 AND time_to > $2`,
    [date, time_from, time_to]
  );
  if (conflict) { res.status(409).json({ error: 'Créneau déjà réservé sur cette plage' }); return; }
  const [h1, m1] = time_from.split(':').map(Number);
  const [h2, m2] = time_to.split(':').map(Number);
  const durationMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  const cfgRow = await queryOne<{ value: string }>(`SELECT value FROM module_config WHERE module='field' AND key='prix_heure_libre'`);
  const pricePerHour = Number(cfgRow?.value ?? 10000);
  const price = Math.round((durationMin / 60) * pricePerHour);
  const id = generateId();
  await execute(
    `INSERT INTO field_bookings (id,user_id,date,slot,price,customer_name,customer_phone,time_from,time_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, req.user!.id, date, time_from, price, customer_name || null, customer_phone || null, time_from, time_to]
  );
  await createNotification(req.user!.id, '⚽ Terrain réservé', `${date} · ${time_from}–${time_to} · ${price.toLocaleString()} Ar`, 'booking');
  res.status(201).json({ id, price });
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string; date: string; slot: string }>('SELECT user_id, date, slot FROM field_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  const bookingTime = new Date(`${b.date}T${b.slot}:00`).getTime();
  if (Date.now() > bookingTime - 24 * 3600 * 1000) {
    res.status(400).json({ error: 'Annulation impossible moins de 24h avant le créneau' }); return;
  }
  await execute("UPDATE field_bookings SET status = 'annule' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
