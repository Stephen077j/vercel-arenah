import { Router, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// GET /api/bookings/tables/layout?date=YYYY-MM-DD
router.get('/layout', async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const tables = await query<{
    id: string; name: string; capacity: number; zone: string; pos_x: number; pos_y: number;
  }>('SELECT id, name, capacity, zone, pos_x, pos_y FROM restaurant_tables WHERE active = true ORDER BY zone, name');

  const bookings = await query<{
    table_id: string; time_from: string; time_to: string; status: string;
  }>('SELECT table_id, time_from, time_to, status FROM table_bookings WHERE date = $1 AND status != $2', [date, 'cancelled']);

  const result = tables.map(t => ({
    ...t,
    bookings: bookings.filter(b => b.table_id === t.id),
  }));
  res.json(result);
});

// POST /api/bookings/tables/check — vérifier disponibilité
router.post('/check', requireAuth, async (req: AuthRequest, res: Response) => {
  const { table_id, date, time_from, time_to } = req.body;
  if (!table_id || !date || !time_from || !time_to) { res.status(400).json({ error: 'Données manquantes' }); return; }

  const conflict = await queryOne<{ id: string }>(
    `SELECT id FROM table_bookings
     WHERE table_id = $1 AND date = $2 AND status != 'cancelled'
     AND time_from < $4 AND time_to > $3`,
    [table_id, date, time_from, time_to]
  );
  res.json({ available: !conflict });
});

// POST /api/bookings/tables — créer réservation
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { table_id, date, time_from, time_to, guests, customer_name, customer_phone, notes } = req.body;
  if (!table_id || !date || !time_from || !time_to) { res.status(400).json({ error: 'Données manquantes' }); return; }

  const conflict = await queryOne<{ id: string }>(
    `SELECT id FROM table_bookings WHERE table_id = $1 AND date = $2 AND status != 'cancelled' AND time_from < $4 AND time_to > $3`,
    [table_id, date, time_from, time_to]
  );
  if (conflict) { res.status(409).json({ error: 'Table déjà réservée sur ce créneau' }); return; }

  const table = await queryOne<{ name: string; capacity: number }>('SELECT name, capacity FROM restaurant_tables WHERE id = $1', [table_id]);
  if (!table) { res.status(404).json({ error: 'Table introuvable' }); return; }

  const id = generateId();
  await execute(
    `INSERT INTO table_bookings (id, table_id, user_id, customer_name, customer_phone, guests, date, time_from, time_to, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, table_id, req.user!.id, customer_name || '', customer_phone || '', guests || 2, date, time_from, time_to, notes || '']
  );

  // Notification
  await execute(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1,$2,$3,$4,$5)`,
    [generateId(), req.user!.id, '🍽️ Table réservée', `Table ${table.name} le ${date} de ${time_from} à ${time_to}`, 'booking']
  );

  res.status(201).json({ id, table_name: table.name, date, time_from, time_to });
});

// GET /api/bookings/tables/my
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT tb.*, rt.name as table_name, rt.capacity, rt.zone
     FROM table_bookings tb JOIN restaurant_tables rt ON rt.id = tb.table_id
     WHERE tb.user_id = $1 ORDER BY tb.date DESC, tb.time_from DESC`,
    [req.user!.id]
  );
  res.json(rows);
});

// DELETE /api/bookings/tables/:id — annuler
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM table_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(403).json({ error: 'Interdit' }); return; }
  await execute("UPDATE table_bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
