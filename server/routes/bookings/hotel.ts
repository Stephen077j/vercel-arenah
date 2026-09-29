import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';
import { sendBookingConfirmation } from '../../services/email.js';
import { smsBookingConfirmed }     from '../../services/sms.js';

const router = Router();

router.get('/rooms', async (_req: Request, res: Response) => {
  res.json(await query('SELECT * FROM hotel_rooms WHERE active = true'));
});

router.get('/rooms/:id/availability', async (req: Request, res: Response) => {
  const { check_in, check_out } = req.query as Record<string, string>;
  if (!check_in || !check_out) { res.status(400).json({ error: 'check_in et check_out requis' }); return; }
  const conflict = await queryOne(
    `SELECT id FROM hotel_bookings WHERE room_id = $1 AND status != 'annule'
     AND NOT (check_out <= $2 OR check_in >= $3)`,
    [req.params.id, check_in, check_out]
  );
  res.json({ available: !conflict });
});

// Disponibilité batch — 1 seul appel pour toutes les chambres
// Taux d'occupation hôtel (public)
router.get('/stats', async (_req: Request, res: Response) => {
  const [roomCount, occupied] = await Promise.all([
    queryOne<{ total: string }>('SELECT COUNT(*) AS total FROM hotel_rooms WHERE active = true'),
    queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT room_id) AS count FROM hotel_bookings
       WHERE status != 'annule' AND check_in <= CURRENT_DATE AND check_out > CURRENT_DATE`
    ),
  ]);
  const total = Number(roomCount?.total ?? 0);
  const occ   = Number(occupied?.count ?? 0);
  res.json({ total, occupied: occ, free: total - occ, rate: total ? Math.round(occ / total * 100) : 0 });
});

router.get('/availability-batch', async (req: Request, res: Response) => {
  const { check_in, check_out } = req.query as Record<string, string>;
  if (!check_in || !check_out) { res.status(400).json({ error: 'check_in et check_out requis' }); return; }
  const rooms  = await query<{ id: string }>('SELECT id FROM hotel_rooms WHERE active = true');
  const booked = await query<{ room_id: string }>(
    `SELECT room_id FROM hotel_bookings WHERE status != 'annule'
     AND NOT (check_out <= $1 OR check_in >= $2)`, [check_in, check_out]
  );
  const bookedIds = new Set(booked.map(r => r.room_id));
  const result: Record<string, boolean> = {};
  for (const r of rooms) result[r.id] = !bookedIds.has(r.id);
  res.json(result);
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT hb.*, hr.name as room_name, hr.type as room_type
     FROM hotel_bookings hb JOIN hotel_rooms hr ON hr.id = hb.room_id
     WHERE hb.user_id = $1 ORDER BY hb.created_at DESC`, [req.user!.id]
  ));
});

router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT hb.*, hr.name as room_name, u.email
     FROM hotel_bookings hb JOIN hotel_rooms hr ON hr.id = hb.room_id
     JOIN users u ON u.id = hb.user_id ORDER BY hb.created_at DESC LIMIT 200`
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { room_id, check_in, check_out, guests, customer_name, customer_phone, customer_email } = req.body;
  if (!room_id || !check_in || !check_out) { res.status(400).json({ error: 'room_id, check_in et check_out requis' }); return; }

  const room = await queryOne<{ price_per_night: number }>('SELECT price_per_night FROM hotel_rooms WHERE id = $1 AND active = true', [room_id]);
  if (!room) { res.status(404).json({ error: 'Chambre introuvable' }); return; }

  const conflict = await queryOne(
    `SELECT id FROM hotel_bookings WHERE room_id = $1 AND status != 'annule'
     AND NOT (check_out <= $2 OR check_in >= $3)`, [room_id, check_in, check_out]
  );
  if (conflict) { res.status(409).json({ error: 'Chambre déjà réservée pour ces dates' }); return; }

  const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000);
  const total = nights * room.price_per_night;
  const deposit = Math.round(total * 0.3);
  const id = generateId();
  await execute(
    'INSERT INTO hotel_bookings (id,user_id,room_id,check_in,check_out,nights,guests,total,deposit,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [id, req.user!.id, room_id, check_in, check_out, nights, guests||1, total, deposit, customer_name||null, customer_phone||null]
  );
  const roomRow = await queryOne<{ name: string }>('SELECT name FROM hotel_rooms WHERE id = $1', [room_id]);
  const u = await queryOne<{ email: string; fullname: string; phone: string }>('SELECT email, fullname, phone FROM users WHERE id = $1', [req.user!.id]);
  await createNotification(req.user!.id, '🏨 Réservation hôtel confirmée',
    `${roomRow?.name} — ${check_in} → ${check_out} (${nights} nuit(s)) — ${total.toLocaleString('fr-FR')} Ar`, 'success');
  if (u) {
    const details = `${roomRow?.name ?? 'Chambre'} · ${nights} nuit(s)`;
    sendBookingConfirmation({ to: u.email, fullname: u.fullname, module: 'hotel', details, date: `${check_in} → ${check_out}`, amount: deposit, bookingRef: id }).catch(() => {});
    if (u.phone) smsBookingConfirmed(u.phone, 'hôtel', check_in).catch(() => {});
  }
  res.status(201).json(await queryOne('SELECT * FROM hotel_bookings WHERE id = $1', [id]));
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM hotel_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE hotel_bookings SET status = 'annule', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
