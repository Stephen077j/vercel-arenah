import { Router, Response } from 'express';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Moyennes par item (boutique / restaurant) ────────────────────────────
router.get('/items', async (req, res: Response) => {
  const { module } = req.query as Record<string, string>;
  if (!module) { res.status(400).json({ error: 'module requis' }); return; }
  const rows = await query<{ item_ref: string; avg: string; count: string }>(
    `SELECT booking_id as item_ref,
            ROUND(AVG(rating)::numeric, 1) as avg,
            COUNT(*) as count
     FROM reviews
     WHERE module = $1 AND booking_id IS NOT NULL AND approved = true
     GROUP BY booking_id`,
    [module]
  );
  const result: Record<string, { avg: number; count: number }> = {};
  for (const r of rows) result[r.item_ref] = { avg: Number(r.avg), count: Number(r.count) };
  res.json(result);
});

// ─── Moyenne publique par module ──────────────────────────────────────────
router.get('/module/:module', async (req, res: Response) => {
  const { module } = req.params;
  const rows = await query<{ rating: number; comment: string | null; fullname: string; created_at: string }>(
    `SELECT r.rating, r.comment, u.fullname, r.created_at
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.module = $1 AND r.approved = true
     ORDER BY r.created_at DESC LIMIT 20`,
    [module]
  );
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null;
  res.json({ module, average: avg ? Math.round(avg * 10) / 10 : null, count: rows.length, reviews: rows });
});

// ─── Soumettre un avis ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { module, booking_type, booking_id, rating, comment } = req.body;
  if (!module || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'module et rating (1-5) requis' }); return;
  }
  // Vérifier doublon si booking fourni
  if (booking_id && booking_type) {
    const existing = await queryOne(
      'SELECT id FROM reviews WHERE user_id=$1 AND booking_type=$2 AND booking_id=$3',
      [req.user!.id, booking_type, booking_id]
    );
    if (existing) { res.status(409).json({ error: 'Vous avez déjà noté cette prestation' }); return; }
  }
  const row = await queryOne(
    `INSERT INTO reviews (id, user_id, module, booking_type, booking_id, rating, comment, approved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [generateId(), req.user!.id, module, booking_type ?? null, booking_id ?? null, rating, comment ?? null]
  );
  res.status(201).json(row);
});

// ─── Mes avis ────────────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC', [req.user!.id]
  ));
});

// ─── Admin : liste + modération ───────────────────────────────────────────
router.get('/admin', requireAdmin, async (_req, res: Response) => {
  res.json(await query(
    `SELECT r.*, u.fullname, u.email FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT 200`
  ));
});

router.patch('/:id/approve', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('UPDATE reviews SET approved = $1 WHERE id = $2', [req.body.approved, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
