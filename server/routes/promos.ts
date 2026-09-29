import { Router, Response } from 'express';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface PromoRow {
  id: string; code: string; type: 'percent' | 'fixed'; value: number;
  min_amount: number; max_uses: number | null; uses_count: number;
  valid_from: string | null; valid_until: string | null;
  module: string | null; active: boolean; created_at: string;
}

function calcDiscount(promo: PromoRow, amount: number): number {
  if (promo.type === 'percent') return Math.floor(amount * promo.value / 100);
  return Math.min(promo.value, amount);
}

// ─── Promos actives publiques pour un module ─────────────────────────────
router.get('/public/:module', async (req, res: Response) => {
  const { module } = req.params;
  const rows = await query<{ code: string; type: string; value: number }>(
    `SELECT code, type, value FROM promo_codes
     WHERE active = true
       AND (module IS NULL OR module = $1)
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (max_uses IS NULL OR uses_count < max_uses)
     ORDER BY value DESC LIMIT 5`,
    [module]
  );
  res.json(rows.map(p => ({
    ...p,
    label: p.type === 'percent' ? `-${p.value}%` : `-${p.value.toLocaleString('fr-FR')} Ar`,
  })));
});

// ─── Valider un code (client connecté) ───────────────────────────────────
router.post('/validate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { code, amount, module } = req.body as { code: string; amount: number; module?: string };
  if (!code || !amount) { res.status(400).json({ error: 'code et amount requis' }); return; }

  const promo = await queryOne<PromoRow>(
    'SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1)', [code.trim()]
  );
  if (!promo || !promo.active) { res.status(404).json({ error: 'Code invalide' }); return; }

  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now)  { res.status(400).json({ error: 'Code pas encore actif' }); return; }
  if (promo.valid_until && new Date(promo.valid_until) < now) { res.status(400).json({ error: 'Code expiré' }); return; }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) { res.status(400).json({ error: 'Code épuisé' }); return; }
  if (amount < promo.min_amount) { res.status(400).json({ error: `Montant minimum: ${promo.min_amount.toLocaleString()} Ar` }); return; }
  if (promo.module && module && promo.module !== module)     { res.status(400).json({ error: `Code valable uniquement pour ${promo.module}` }); return; }

  const discount = calcDiscount(promo, amount);
  res.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    final_amount: Math.max(0, amount - discount),
    description: promo.type === 'percent' ? `-${promo.value}%` : `-${promo.value.toLocaleString()} Ar`,
  });
});

// ─── Appliquer (incrément uses_count, appelé par payment route) ──────────
export async function applyPromo(code: string): Promise<void> {
  await execute('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE UPPER(code) = UPPER($1)', [code]);
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res: Response) => {
  res.json(await query('SELECT * FROM promo_codes ORDER BY created_at DESC'));
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { code, type, value, min_amount, max_uses, valid_from, valid_until, module } = req.body;
  if (!code || !type || !value) { res.status(400).json({ error: 'code, type, value requis' }); return; }
  const existing = await queryOne('SELECT id FROM promo_codes WHERE UPPER(code) = UPPER($1)', [code]);
  if (existing) { res.status(409).json({ error: 'Code déjà existant' }); return; }
  const row = await queryOne<PromoRow>(
    `INSERT INTO promo_codes (id, code, type, value, min_amount, max_uses, valid_from, valid_until, module)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [generateId(), code.toUpperCase().trim(), type, value, min_amount ?? 0,
     max_uses ?? null, valid_from ?? null, valid_until ?? null, module ?? null]
  );
  res.status(201).json(row);
});

router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { active } = req.body;
  await execute('UPDATE promo_codes SET active = $1 WHERE id = $2', [active, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
