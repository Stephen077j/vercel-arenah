import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT o.*, STRING_AGG(oi.name || ' x' || oi.quantity, ', ') as items_summary
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`, [req.user!.id]
  ));
});

router.get('/all', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, module } = req.query as Record<string, string>;
  // admin_module ne voit que son module ; super_admin voit tout
  const forcedModule = req.user?.role === 'admin_module' ? req.user.module_assigned : null;

  let sql = 'SELECT o.*, u.email, u.fullname FROM orders o JOIN users u ON u.id = o.user_id WHERE 1=1';
  const params: string[] = [];
  let i = 1;
  if (status) { sql += ` AND o.status = $${i++}`; params.push(status); }
  const effectiveModule = forcedModule ?? module ?? null;
  if (effectiveModule) { sql += ` AND o.module = $${i++}`; params.push(effectiveModule); }
  sql += ' ORDER BY o.created_at DESC LIMIT 200';
  res.json(await query(sql, params));
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const order = await queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  if (!order) { res.status(404).json({ error: 'Commande introuvable' }); return; }
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  res.json({ ...order, items });
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { module, type, mode, items, address, notes, customer_name, customer_phone, promo_code } = req.body;
  if (!items?.length || !mode) { res.status(400).json({ error: 'items et mode requis' }); return; }

  const subtotal = items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);

  // Appliquer le code promo si fourni
  let discount = 0;
  let promoId: string | null = null;
  if (promo_code) {
    const promo = await queryOne<{
      id: string; type: string; value: number; min_amount: number;
      active: boolean; valid_until: string | null; max_uses: number | null;
      uses_count: number; module: string | null;
    }>('SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1)', [promo_code]);
    if (promo?.active) {
      const expired = promo.valid_until && new Date(promo.valid_until) < new Date();
      const exhausted = promo.max_uses !== null && promo.uses_count >= promo.max_uses;
      const moduleOk = !promo.module || promo.module === (module || 'boutique');
      if (!expired && !exhausted && moduleOk && subtotal >= promo.min_amount) {
        discount = promo.type === 'percent'
          ? Math.floor(subtotal * promo.value / 100)
          : Math.min(promo.value, subtotal);
        promoId = promo.id;
      }
    }
  }

  const total = Math.max(0, subtotal - discount);
  const id = generateId();
  const finalNotes = [notes, promo_code ? `Promo: ${promo_code.toUpperCase()}` : ''].filter(Boolean).join(' — ') || null;

  await execute(
    'INSERT INTO orders (id, user_id, module, type, mode, total, address, notes, customer_name, customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, req.user!.id, module||'boutique', type||module||'boutique', mode, total, address||null, finalNotes, customer_name||null, customer_phone||null]
  );
  for (const i of items as { product_id?: string; name: string; price: number; quantity: number; note?: string }[]) {
    await execute(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity, note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [generateId(), id, i.product_id||null, i.name, i.price, i.quantity, i.note||null]
    );
    if (i.product_id) {
      await execute('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [i.quantity, i.product_id]);
    }
  }
  if (promoId) {
    await execute('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = $1', [promoId]);
  }
  await execute('DELETE FROM cart_items WHERE user_id = $1', [req.user!.id]);
  const moduleLabel: Record<string, string> = { boutique: '🛍️ Boutique', restaurant: '🍽️ Restaurant' };
  const discountNote = discount > 0 ? ` — remise ${discount.toLocaleString('fr-FR')} Ar` : '';
  await createNotification(req.user!.id,
    `${moduleLabel[module] || '📦'} Commande confirmée`,
    `${items.length} article(s) — ${total.toLocaleString('fr-FR')} Ar${discountNote}`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM orders WHERE id = $1', [id]));
});

router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const allowed = ['en_attente','preparation','expediee','livree','annulee'];
  if (!allowed.includes(status)) { res.status(400).json({ error: 'Statut invalide' }); return; }
  await execute('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
  res.json({ success: true });
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const order = await queryOne<{ status: string; user_id: string }>('SELECT status, user_id FROM orders WHERE id = $1', [req.params.id]);
  if (!order || order.user_id !== req.user!.id) { res.status(404).json({ error: 'Commande introuvable' }); return; }
  if (!['en_attente','preparation'].includes(order.status)) { res.status(400).json({ error: 'Non annulable dans ce statut' }); return; }
  await execute("UPDATE orders SET status = 'annulee', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
