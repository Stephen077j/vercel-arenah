import { Router, Response } from 'express';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT ci.id, ci.quantity, ci.note,
            p.id as product_id, p.name, p.price, p.image_url, p.module, p.stock
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1`, [req.user!.id]
  ));
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { product_id, quantity = 1, note } = req.body;
  if (!product_id) { res.status(400).json({ error: 'product_id requis' }); return; }
  const product = await queryOne<{ stock: number }>('SELECT stock FROM products WHERE id = $1 AND active = true', [product_id]);
  if (!product) { res.status(404).json({ error: 'Produit introuvable' }); return; }
  const existing = await queryOne<{ id: string; quantity: number }>(
    'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.user!.id, product_id]
  );
  if (existing) {
    await execute('UPDATE cart_items SET quantity = $1, note = COALESCE($2, note) WHERE id = $3',
      [existing.quantity + quantity, note ?? null, existing.id]);
  } else {
    await execute('INSERT INTO cart_items (id, user_id, product_id, quantity, note) VALUES ($1,$2,$3,$4,$5)',
      [generateId(), req.user!.id, product_id, quantity, note ?? null]);
  }
  res.status(201).json({ success: true });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { quantity, note } = req.body;
  if (quantity != null && quantity <= 0) {
    await execute('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  } else {
    await execute('UPDATE cart_items SET quantity = COALESCE($1,quantity), note = COALESCE($2,note) WHERE id = $3 AND user_id = $4',
      [quantity ?? null, note ?? null, req.params.id, req.user!.id]);
  }
  res.json({ success: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  res.json({ success: true });
});

router.delete('/', requireAuth, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM cart_items WHERE user_id = $1', [req.user!.id]);
  res.json({ success: true });
});

export default router;
