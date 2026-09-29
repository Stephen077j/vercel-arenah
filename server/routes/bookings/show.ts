import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';
import QRCode from 'qrcode';

const router = Router();
const ROWS = ['A','B','C','D','E','F','G','H'];
const PRICING: Record<string, number> = { A:1.5, B:1.3, C:1.1, D:1, E:1, F:0.9, G:0.8, H:0.8 };

router.get('/shows', async (_req: Request, res: Response) => {
  const TOTAL_SEATS = ROWS.length * 12; // 8 rangées × 12 sièges = 96
  const shows = await query<Record<string, unknown>>(`
    SELECT s.*,
      COALESCE((
        SELECT SUM(jsonb_array_length(sb.seats))
        FROM show_bookings sb
        WHERE sb.show_id = s.id AND sb.status != 'cancelled'
      ), 0) AS seats_sold
    FROM shows s
    WHERE s.active = true AND s.date >= CURRENT_DATE
    ORDER BY s.date ASC
  `);
  res.json(shows.map(s => ({
    ...s,
    total_seats: TOTAL_SEATS,
    seats_sold:  Number(s.seats_sold),
    sold_pct:    Math.round(Number(s.seats_sold) / TOTAL_SEATS * 100),
  })));
});

router.get('/shows/:id/seats', async (req: Request, res: Response) => {
  const show = await queryOne<{ id: string; base_price: number }>('SELECT id, base_price FROM shows WHERE id = $1', [req.params.id]);
  if (!show) { res.status(404).json({ error: 'Spectacle introuvable' }); return; }
  const takenRaw = await query<{ seats: unknown }>("SELECT seats FROM show_bookings WHERE show_id = $1 AND status != 'cancelled'", [req.params.id]);
  const takenSeats = takenRaw.flatMap(r => Array.isArray(r.seats) ? r.seats as { row: string; number: number }[] : []);
  const seats = ROWS.flatMap(row =>
    Array.from({ length: 12 }, (_, i) => {
      const number = i + 1;
      const type = ['A','B'].includes(row) ? 'vip' : ['C','D'].includes(row) ? 'premium' : 'standard';
      return { row, number, type, price: Math.round(show.base_price * (PRICING[row] || 1)), taken: takenSeats.some(s => s.row === row && s.number === number) };
    })
  );
  res.json(seats);
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT sb.*, s.title, s.artist, s.date as show_date, s.time as show_time, s.venue FROM show_bookings sb JOIN shows s ON s.id = sb.show_id WHERE sb.user_id = $1 ORDER BY sb.created_at DESC',
    [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { show_id, seats, customer_name, customer_phone } = req.body;
  if (!show_id || !seats?.length) { res.status(400).json({ error: 'show_id et seats requis' }); return; }
  const show = await queryOne('SELECT id FROM shows WHERE id = $1 AND active = true', [show_id]);
  if (!show) { res.status(404).json({ error: 'Spectacle introuvable' }); return; }
  const takenRaw = await query<{ seats: unknown }>("SELECT seats FROM show_bookings WHERE show_id = $1 AND status != 'cancelled'", [show_id]);
  const takenSeats = takenRaw.flatMap(r => Array.isArray(r.seats) ? r.seats as { row: string; number: number }[] : []);
  const conflict = seats.some((s: { row: string; number: number }) => takenSeats.some(t => t.row === s.row && t.number === s.number));
  if (conflict) { res.status(409).json({ error: 'Certains sièges sont déjà pris' }); return; }
  const total = seats.reduce((sum: number, s: { price: number }) => sum + s.price, 0);
  const id = generateId();
  await execute(
    "INSERT INTO show_bookings (id,user_id,show_id,seats,total,customer_name,customer_phone,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed')",
    [id, req.user!.id, show_id, JSON.stringify(seats), total, customer_name||null, customer_phone||null]
  );
  const showRow = await queryOne<{ title: string; date: string; time: string }>('SELECT title, date, time FROM shows WHERE id = $1', [show_id]);
  await createNotification(req.user!.id, '🎭 Billets confirmés',
    `${showRow?.title} — ${showRow?.date} à ${showRow?.time} — ${seats.length} siège(s) — ${total.toLocaleString('fr-FR')} Ar`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM show_bookings WHERE id = $1', [id]));
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM show_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE show_bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// QR code pour un billet (accessible par le propriétaire)
router.get('/:id/qr', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string; status: string }>('SELECT user_id, status FROM show_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Billet introuvable' }); return; }
  const payload = `ARENAH-TICKET:${req.params.id}:${Date.now()}`;
  const dataUrl = await QRCode.toDataURL(payload, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } });
  res.json({ qr: dataUrl });
});

// Spectacles du jour (pour la bannière home)
router.get('/events', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const shows = await query('SELECT id, title, artist, date, time, venue, category, base_price FROM shows WHERE date = $1 AND active = true ORDER BY time ASC', [date]);
  res.json(shows);
});

export default router;
