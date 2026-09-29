import { Router, Response } from 'express';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Points par 100 Ar dépensés, et taux de remboursement
const PTS_PER_100AR = Number(process.env.LOYALTY_POINTS_PER_100AR ?? 1);
const AR_PER_POINT  = Number(process.env.LOYALTY_REDEEM_RATE ?? 10); // 1 point = 10 Ar

export function computeLevel(total: number) {
  if (total >= 5000) return { name: 'Platine', color: '#a78bfa', min: 5000, next: null };
  if (total >= 1000) return { name: 'Or',      color: '#d4a843', min: 1000, next: 5000 };
  return               { name: 'Bronze',   color: '#b87333', min: 0,    next: 1000 };
}

export function pointsFromAmount(amount: number) {
  return Math.floor(amount / 100) * PTS_PER_100AR;
}

// ─── Solde + historique ───────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ points: number; type: string; description: string; reference: string; created_at: string }>(
    'SELECT points, type, description, reference, created_at FROM loyalty_points WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user!.id]
  );
  const total = rows.reduce((s, r) => s + r.points, 0);
  const level = computeLevel(total);
  res.json({ total, level, ar_per_point: AR_PER_POINT, history: rows });
});

// ─── Valider un nombre de points à utiliser ───────────────────────────────
router.post('/preview-redeem', requireAuth, async (req: AuthRequest, res: Response) => {
  const { points } = req.body as { points: number };
  if (!points || points < 100) { res.status(400).json({ error: 'Minimum 100 points' }); return; }
  const rows = await query<{ points: number }>('SELECT points FROM loyalty_points WHERE user_id = $1', [req.user!.id]);
  const total = rows.reduce((s, r) => s + r.points, 0);
  if (points > total) { res.status(400).json({ error: 'Solde insuffisant' }); return; }
  const discount = points * AR_PER_POINT;
  res.json({ points, discount, remaining: total - points });
});

export async function awardPoints(userId: string, amount: number, reference: string) {
  const pts = pointsFromAmount(amount);
  if (pts <= 0) return;
  await execute(
    'INSERT INTO loyalty_points (id, user_id, points, type, description, reference) VALUES ($1,$2,$3,$4,$5,$6)',
    [generateId(), userId, pts, 'earn', `Achat de ${amount.toLocaleString()} Ar`, reference]
  );
}

export async function redeemPoints(userId: string, points: number, reference: string): Promise<number> {
  const rows = await query<{ points: number }>('SELECT points FROM loyalty_points WHERE user_id = $1', [userId]);
  const total = rows.reduce((s, r) => s + r.points, 0);
  if (points > total) throw new Error('Solde points insuffisant');
  await execute(
    'INSERT INTO loyalty_points (id, user_id, points, type, description, reference) VALUES ($1,$2,$3,$4,$5,$6)',
    [generateId(), userId, -points, 'redeem', `Remise de ${(points * AR_PER_POINT).toLocaleString()} Ar`, reference]
  );
  return points * AR_PER_POINT;
}

export default router;
