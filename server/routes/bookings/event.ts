import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

router.get('/halls', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM event_halls WHERE active = true ORDER BY capacity')); });
router.get('/options', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM event_options WHERE active = true')); });

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT eb.*, eh.name as hall_name, eh.capacity FROM event_bookings eb JOIN event_halls eh ON eh.id = eb.hall_id WHERE eb.user_id = $1 ORDER BY eb.created_at DESC',
    [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { hall_id, event_date, guests, options = [], customer_name, customer_phone } = req.body;
  if (!hall_id || !event_date || !guests) { res.status(400).json({ error: 'hall_id, event_date et guests requis' }); return; }
  const hall = await queryOne<{ base_price: number }>('SELECT base_price FROM event_halls WHERE id = $1 AND active = true', [hall_id]);
  if (!hall) { res.status(404).json({ error: 'Salle introuvable' }); return; }
  let optionsTotal = 0;
  if (options.length) {
    const optRows = await query<{ price: number }>(`SELECT price FROM event_options WHERE id = ANY($1) AND active = true`, [options]);
    optionsTotal = optRows.reduce((s, o) => s + o.price, 0);
  }
  const total = hall.base_price + optionsTotal;
  const deposit = Math.round(total * 0.3);
  const id = generateId();
  await execute(
    'INSERT INTO event_bookings (id,user_id,hall_id,event_date,guests,options,total,deposit,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, req.user!.id, hall_id, event_date, guests, JSON.stringify(options), total, deposit, customer_name||null, customer_phone||null]
  );
  const hallRow = await queryOne<{ name: string }>('SELECT name FROM event_halls WHERE id = $1', [hall_id]);
  await createNotification(req.user!.id, '🎉 Devis événement créé',
    `${hallRow?.name} — ${event_date} — ${guests} invités — Acompte ${deposit.toLocaleString('fr-FR')} Ar`, 'info');
  res.status(201).json(await queryOne('SELECT * FROM event_bookings WHERE id = $1', [id]));
});

router.patch('/:id/sign', requireAuth, async (req: AuthRequest, res: Response) => {
  const { signature_data } = req.body;
  if (!signature_data) { res.status(400).json({ error: 'signature_data requis' }); return; }
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM event_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE event_bookings SET signature_data = $1, status = 'signe', updated_at = NOW() WHERE id = $2", [signature_data, req.params.id]);
  res.json({ success: true });
});

router.patch('/:id/status', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const { status } = _req.body;
  if (!['devis','signe','confirme','annule'].includes(status)) { res.status(400).json({ error: 'Statut invalide' }); return; }
  await execute('UPDATE event_bookings SET status = $1, updated_at = NOW() WHERE id = $2', [status, _req.params.id]);
  res.json({ success: true });
});

router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT eb.*, eh.name as hall_name, u.email FROM event_bookings eb
     JOIN event_halls eh ON eh.id = eb.hall_id JOIN users u ON u.id = eb.user_id
     ORDER BY eb.created_at DESC LIMIT 200`
  ));
});

export default router;
