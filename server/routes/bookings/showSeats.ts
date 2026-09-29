import { Router, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// Génère les sièges pour un spectacle si inexistants
async function ensureSeats(showId: string, basePrice: number) {
  const existing = await queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM show_seats WHERE show_id = $1', [showId]);
  if (existing && existing.c > 0) return;

  const rows = [
    { label: 'A', category: 'VIP',      price: Math.round(basePrice * 1.8) },
    { label: 'B', category: 'VIP',      price: Math.round(basePrice * 1.8) },
    { label: 'C', category: 'premium',  price: Math.round(basePrice * 1.3) },
    { label: 'D', category: 'premium',  price: Math.round(basePrice * 1.3) },
    { label: 'E', category: 'standard', price: basePrice },
    { label: 'F', category: 'standard', price: basePrice },
    { label: 'G', category: 'standard', price: basePrice },
    { label: 'H', category: 'standard', price: basePrice },
  ];
  const SEATS_PER_ROW = 10;
  for (const row of rows) {
    for (let s = 1; s <= SEATS_PER_ROW; s++) {
      await execute(
        `INSERT INTO show_seats (id, show_id, row_label, seat_number, category, price, status)
         VALUES ($1,$2,$3,$4,$5,$6,'free') ON CONFLICT DO NOTHING`,
        [generateId(), showId, row.label, s, row.category, row.price]
      );
    }
  }
}

// GET /api/bookings/shows/:showId/seats
router.get('/:showId/seats', async (req: AuthRequest, res: Response) => {
  const show = await queryOne<{ id: string; base_price: number }>('SELECT id, base_price FROM shows WHERE id = $1', [req.params.showId]);
  if (!show) { res.status(404).json({ error: 'Spectacle introuvable' }); return; }
  await ensureSeats(show.id, show.base_price);
  const seats = await query('SELECT * FROM show_seats WHERE show_id = $1 ORDER BY row_label, seat_number', [show.id]);
  res.json(seats);
});

// POST /api/bookings/shows/:showId/book-seats
router.post('/:showId/book-seats', requireAuth, async (req: AuthRequest, res: Response) => {
  const { seat_ids, customer_name, customer_phone } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) { res.status(400).json({ error: 'Aucun siège sélectionné' }); return; }

  // Vérifier que tous les sièges sont libres
  const placeholders = seat_ids.map((_: string, i: number) => `$${i + 2}`).join(',');
  const taken = await query<{ id: string }>(
    `SELECT id FROM show_seats WHERE show_id = $1 AND id IN (${placeholders}) AND status != 'free'`,
    [req.params.showId, ...seat_ids]
  );
  if (taken.length > 0) { res.status(409).json({ error: 'Certains sièges sont déjà pris' }); return; }

  // Calculer le total
  const seats = await query<{ id: string; price: number; row_label: string; seat_number: number }>(
    `SELECT id, price, row_label, seat_number FROM show_seats WHERE show_id = $1 AND id IN (${placeholders})`,
    [req.params.showId, ...seat_ids]
  );
  const total = seats.reduce((s, seat) => s + seat.price, 0);

  // Créer la réservation
  const bookingId = generateId();
  const seatLabels = seats.map(s => `${s.row_label}${s.seat_number}`);
  await execute(
    `INSERT INTO show_bookings (id, user_id, show_id, seats, total, customer_name, customer_phone, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed')`,
    [bookingId, req.user!.id, req.params.showId, JSON.stringify(seatLabels), total, customer_name || '', customer_phone || '']
  );

  // Bloquer les sièges
  await execute(
    `UPDATE show_seats SET status = 'booked', booking_id = $1 WHERE id IN (${placeholders})`,
    [bookingId, ...seat_ids]
  );

  // Notification
  await execute(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1,$2,$3,$4,$5)`,
    [generateId(), req.user!.id, '🎭 Billets réservés', `${seats.length} siège(s) : ${seatLabels.join(', ')}`, 'booking']
  );

  res.status(201).json({ booking_id: bookingId, seats: seatLabels, total });
});

export default router;
