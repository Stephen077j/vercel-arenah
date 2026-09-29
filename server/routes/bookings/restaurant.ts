import { Router, Response } from 'express';
import { query, execute, queryOne, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT * FROM restaurant_reservations WHERE user_id = $1 ORDER BY date DESC, time DESC',
    [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { customer_name, customer_phone, date, time, guests, notes } = req.body;
  if (!customer_name || !customer_phone || !date || !time) {
    res.status(400).json({ error: 'Nom, téléphone, date et heure requis' }); return;
  }
  const id = generateId();
  await execute(
    'INSERT INTO restaurant_reservations (id,user_id,customer_name,customer_phone,date,time,guests,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, req.user!.id, customer_name, customer_phone, date, time, guests ?? 2, notes ?? null]
  );
  await createNotification(req.user!.id, '🍽️ Table réservée',
    `${date} à ${time} — ${guests ?? 2} personne(s). Confirmation par téléphone.`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM restaurant_reservations WHERE id = $1', [id]));
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const r = await queryOne<{ user_id: string }>('SELECT user_id FROM restaurant_reservations WHERE id = $1', [req.params.id]);
  if (!r || r.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE restaurant_reservations SET status = 'cancelled' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
