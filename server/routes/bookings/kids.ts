import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

/* ── Tarifs depuis DB (kids_ticket_types) ─────────────────────────── */
router.get('/ticket-types', async (_req: Request, res: Response) => {
  const types = await query('SELECT * FROM kids_ticket_types WHERE active=true ORDER BY price');
  res.json(types);
});

/* ── Mes réservations ─────────────────────────────────────────────── */
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query(
    'SELECT * FROM kids_bookings WHERE user_id = $1 ORDER BY visit_date DESC',
    [req.user!.id]
  );
  res.json(rows);
});

/* ── Créer une réservation ────────────────────────────────────────── */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { ticket_type_id, visit_date, num_children, num_adults, notes } = req.body;

  if (!ticket_type_id || !visit_date || !num_children) {
    res.status(400).json({ error: 'Champs requis manquants' });
    return;
  }

  const ticketType = await queryOne<{ id: string; label: string; price: number; per_person: boolean; duration_hours: number }>(
    'SELECT * FROM kids_ticket_types WHERE id=$1 AND active=true', [ticket_type_id]
  );
  if (!ticketType) { res.status(404).json({ error: 'Type de ticket introuvable' }); return; }

  const children = Number(num_children) || 1;
  const adults   = Number(num_adults)   || 0;

  let total = 0;
  if (ticketType.per_person) {
    total = ticketType.price * children;
    if (ticket_type_id !== 'birthday_pack') total += 1000 * adults;
  } else {
    total = ticketType.price;
  }

  const id = generateId();
  await execute(
    `INSERT INTO kids_bookings
       (id, user_id, booking_type, visit_date, num_children, num_adults, duration_hours, package_label, total_price, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id, req.user!.id,
      ticket_type_id === 'birthday_pack' ? 'birthday' : 'entry',
      visit_date, children, adults,
      ticketType.duration_hours,
      ticketType.label,
      total,
      notes || null,
    ]
  );

  await createNotification(
    req.user!.id,
    '🧸 Espace Enfants réservé',
    `${ticketType.label} — ${children} enfant${children > 1 ? 's' : ''} — ${visit_date}`,
    'success'
  );

  const booking = await queryOne('SELECT * FROM kids_bookings WHERE id = $1', [id]);
  res.status(201).json(booking);
});

/* ── Admin : toutes les réservations ─────────────────────────────── */
router.get('/admin/all', requireAuth, async (_req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT kb.*, u.fullname, u.email
     FROM kids_bookings kb
     LEFT JOIN users u ON u.id = kb.user_id
     ORDER BY kb.visit_date DESC`
  );
  res.json(rows);
});

export default router;
