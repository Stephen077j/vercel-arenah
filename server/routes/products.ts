import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  const { module, category, q } = req.query as Record<string, string>;
  let sql = 'SELECT * FROM products WHERE active = true';
  const params: string[] = [];
  let i = 1;
  if (module)   { sql += ` AND module = $${i++}`;                               params.push(module); }
  if (category) { sql += ` AND category = $${i++}`;                             params.push(category); }
  if (q)        { sql += ` AND (name ILIKE $${i} OR description ILIKE $${i++})`; params.push(`%${q}%`); }
  sql += ' ORDER BY name ASC';
  res.json(await query(sql, params));
});

// GET /api/products/today-orders?module=restaurant
router.get('/today-orders', async (req: Request, res: Response) => {
  const { module } = req.query as Record<string, string>;
  const params: string[] = [];
  let moduleSql = '';
  if (module) { moduleSql = ' AND o.module = $1'; params.push(module); }
  const rows = await query<{ product_id: string; count: string }>(
    `SELECT oi.product_id, COUNT(*) AS count
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= CURRENT_DATE${moduleSql}
     GROUP BY oi.product_id`,
    params
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.product_id] = Number(r.count);
  res.json(result);
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  const p = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!p) { res.status(404).json({ error: 'Produit introuvable' }); return; }
  res.json(p);
});

// POST /api/products
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { module, name, description, price, category, image_url, stock } = req.body;
  if (!module || !name || price == null) { res.status(400).json({ error: 'module, name et price requis' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO products (id, module, name, description, price, category, image_url, stock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, module, name, description || null, price, category || null, image_url || null, stock ?? 0]
  );
  res.status(201).json(await queryOne('SELECT * FROM products WHERE id = $1', [id]));
});

// PATCH /api/products/:id
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, price, category, image_url, stock, active } = req.body;
  await execute(
    `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description),
     price=COALESCE($3,price), category=COALESCE($4,category), image_url=COALESCE($5,image_url),
     stock=COALESCE($6,stock), active=COALESCE($7,active), updated_at=NOW() WHERE id=$8`,
    [name??null, description??null, price??null, category??null, image_url??null, stock??null, active??null, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]));
});

// DELETE /api/products/:id
router.delete('/:id', requireAdmin, async (_req: AuthRequest, res: Response) => {
  await execute('UPDATE products SET active = false WHERE id = $1', [_req.params.id]);
  res.json({ success: true });
});

export default router;
