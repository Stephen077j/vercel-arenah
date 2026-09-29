/**
 * Routes POS — Utilisées par le POS Desktop (Electron) et le POS Mobile (React Native)
 * Auth: Bearer JWT (caissier connecté) OU X-Api-Key (device POS)
 * Toutes les ventes POS créent des commandes sans nécessiter de compte client.
 */
import { Router, Response } from 'express';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { fireWebhook } from './webhooks.js';
import { sendPushToUser } from './push.js';
import { smsOrderReady } from '../services/sms.js';

const router = Router();

// ─── Catalogue produits (lecture rapide pour POS) ─────────────────────────
router.get('/products', requireAuth, async (req: AuthRequest, res: Response) => {
  const { module, q } = req.query as Record<string, string>;
  let sql = `SELECT id, name, category, price, stock, image_url, module
             FROM products WHERE active = true`;
  const params: string[] = [];
  let i = 1;
  if (module) { sql += ` AND module = $${i++}`; params.push(module); }
  if (q)      { sql += ` AND (LOWER(name) LIKE LOWER($${i++}) OR LOWER(category) LIKE LOWER($${i++}))`; params.push(`%${q}%`, `%${q}%`); i++; }
  sql += ' ORDER BY module, category, name LIMIT 200';
  res.json(await query(sql, params));
});

// ─── Vente rapide POS (sans compte client obligatoire) ────────────────────
/**
 * Body: {
 *   items: [{ product_id, qty }],
 *   customer_name?: string,       // client de passage
 *   customer_phone?: string,
 *   method: 'especes'|'mvola'|'orange'|'airtel'|'carte',
 *   discount?: number,            // remise manuelle en Ar
 *   notes?: string,
 *   module: string,
 * }
 */
router.post('/sale', requireAuth, async (req: AuthRequest, res: Response) => {
  const { items, customer_name, customer_phone, method, discount, notes, module } = req.body as {
    items: { product_id: string; qty: number }[];
    customer_name?: string;
    customer_phone?: string;
    method: string;
    discount?: number;
    notes?: string;
    module: string;
  };

  if (!items?.length || !method || !module) {
    res.status(400).json({ error: 'items, method et module requis' }); return;
  }

  // Charger les produits et calculer le total
  const productIds = items.map(i => i.product_id);
  const products   = await query<{ id: string; name: string; price: number; stock: number }>(
    `SELECT id, name, price, stock FROM products WHERE id = ANY($1)`, [productIds]
  );
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  let subtotal = 0;
  const orderItems: { product_id: string; name: string; qty: number; unit_price: number; total: number }[] = [];

  for (const item of items) {
    const p = productMap[item.product_id];
    if (!p) { res.status(404).json({ error: `Produit ${item.product_id} introuvable` }); return; }
    if (p.stock < item.qty) { res.status(400).json({ error: `Stock insuffisant pour "${p.name}"` }); return; }
    const total = p.price * item.qty;
    subtotal += total;
    orderItems.push({ product_id: p.id, name: p.name, qty: item.qty, unit_price: p.price, total });
  }

  const discountAmt = Math.min(discount ?? 0, subtotal);
  const totalAmount = subtotal - discountAmt;
  const fee         = ['mvola','orange','airtel'].includes(method) ? Math.ceil(totalAmount * 0.03) : 0;
  const grand_total = totalAmount + fee;

  // Créer la commande
  const orderId = generateId();
  await execute(
    `INSERT INTO orders (id, user_id, module, total, mode, notes, status, items_count)
     VALUES ($1, $2, $3, $4, $5, $6, 'preparation', $7)`,
    [orderId, req.user!.id, module, grand_total,
     `POS-${method}`, [customer_name, customer_phone, notes].filter(Boolean).join(' · ') || null,
     orderItems.length]
  );

  // Insérer les items + décrémenter le stock
  for (const item of orderItems) {
    await execute(
      `INSERT INTO order_items (id, order_id, product_id, name, qty, unit_price, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [generateId(), orderId, item.product_id, item.name, item.qty, item.unit_price, item.total]
    );
    await execute('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.qty, item.product_id]);
  }

  // Créer le paiement
  const paymentId  = generateId();
  const reference  = `POS-${Date.now().toString(36).toUpperCase()}`;
  const payStatus  = method === 'especes' ? 'success' : 'pending';
  await execute(
    `INSERT INTO payments (id, user_id, reference, amount, fee, method, status, booking_type, booking_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'order',$8,$9)`,
    [paymentId, req.user!.id, reference, totalAmount, fee, method, payStatus, orderId,
     customer_name ? `POS · ${customer_name}` : 'Vente POS']
  );

  if (payStatus === 'success') {
    await execute(`UPDATE orders SET status = 'livree', paid = true WHERE id = $1`, [orderId]);
    await fireWebhook('order.created', { order_id: orderId, reference, total: grand_total, method, customer_name });
  }

  // Données du reçu thermique
  const receipt = {
    reference,
    order_id:      orderId,
    payment_id:    paymentId,
    payment_status: payStatus,
    cashier:       req.user!.email,
    customer_name: customer_name ?? 'Client de passage',
    customer_phone,
    items:         orderItems,
    subtotal,
    discount:      discountAmt,
    fee,
    total:         grand_total,
    method,
    date:          new Date().toISOString(),
    company: {
      name:    'ARENAH IVATO',
      address: 'Soavinarivo, Antananarivo 102',
      phone:   '+261 XX XXX XX',
    },
  };

  res.status(201).json({ success: true, receipt });
});

// ─── Résumé journalier POS ─────────────────────────────────────────────────
router.get('/stats/today', requireAuth, async (_req, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows  = await query<{ method: string; count: number; total: number }>(
    `SELECT method, COUNT(*) as count, SUM(amount) as total
     FROM payments
     WHERE status = 'success'
       AND created_at >= $1::date AND created_at < ($1::date + interval '1 day')
     GROUP BY method`,
    [today]
  );
  const grand = rows.reduce((s, r) => s + Number(r.total), 0);
  const count  = rows.reduce((s, r) => s + Number(r.count), 0);
  res.json({ date: today, total: grand, count, by_method: rows });
});

// ─── Reçu thermique pour une commande POS ─────────────────────────────────
router.get('/receipt/:orderId', requireAuth, async (req: AuthRequest, res: Response) => {
  const o = await queryOne<{ id: string; module: string; total: number; mode: string; notes: string; created_at: string; status: string }>(
    'SELECT id, module, total, mode, notes, created_at, status FROM orders WHERE id = $1', [req.params.orderId]
  );
  if (!o) { res.status(404).json({ error: 'Commande introuvable' }); return; }

  const items = await query<{ name: string; qty: number; unit_price: number; total: number }>(
    'SELECT name, qty, unit_price, total FROM order_items WHERE order_id = $1', [o.id]
  );
  const payment = await queryOne<{ reference: string; method: string; status: string; amount: number; fee: number }>(
    `SELECT reference, method, status, amount, fee FROM payments WHERE booking_id = $1 AND booking_type = 'order' LIMIT 1`,
    [o.id]
  );

  res.json({
    order: o, items, payment,
    company: { name: 'ARENAH IVATO', address: 'Soavinarivo, Antananarivo 102' },
    printed_at: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC POS ↔ WEB  — commandes web visibles sur Electron / React Native
// Ces routes s'ajoutent sans modifier aucune route existante.
// L'admin module web continue d'utiliser /api/orders comme avant.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Healthcheck — le POS vérifie que le serveur répond ──────────────────
router.get('/ping', (_req, res: Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── Commandes web à afficher sur l'écran POS ────────────────────────────
// GET /api/pos/orders?since=ISO_DATE&limit=40
// Le module est lu depuis le JWT (module_assigned du staff connecté)
router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  const module = req.user!.module_assigned;
  if (!module) {
    res.status(403).json({ error: 'Aucun module assigné à ce compte' }); return;
  }

  const { since, limit = '40' } = req.query as Record<string, string>;
  // Par défaut : commandes des dernières 24h
  const sinceDate = since
    ? new Date(since)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const orders = await query<{
    id: string; module: string; total: number; status: string;
    mode: string; notes: string | null; items_count: number;
    created_at: string; user_id: string | null;
    client_name: string | null; client_phone: string | null; client_email: string | null;
  }>(
    `SELECT o.id, o.module, o.total, o.status, o.mode, o.notes, o.items_count,
            o.created_at, o.user_id,
            u.fullname  AS client_name,
            u.phone     AS client_phone,
            u.email     AS client_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.module = $1
       AND o.created_at >= $2
       AND o.status != 'annule'
     ORDER BY o.created_at DESC
     LIMIT $3`,
    [module, sinceDate.toISOString(), parseInt(limit)]
  );

  // Charger les articles de chaque commande en une seule requête
  const ids = orders.map(o => o.id);
  const items = ids.length
    ? await query<{ order_id: string; name: string; qty: number; unit_price: number; total: number }>(
        `SELECT order_id, name, qty, unit_price, total
         FROM order_items WHERE order_id = ANY($1)`, [ids]
      )
    : [];

  const byOrder: Record<string, typeof items> = {};
  items.forEach(it => { (byOrder[it.order_id] ??= []).push(it); });

  res.json({
    orders: orders.map(o => ({ ...o, items: byOrder[o.id] ?? [] })),
    count: orders.length,
    since: sinceDate.toISOString(),
  });
});

// ─── Mise à jour statut + notification client ─────────────────────────────
// PATCH /api/pos/orders/:id/status
// body: { status: "en_cours" | "pret" | "livre" | "annule" }
router.patch('/orders/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id }     = req.params;
  const { status } = req.body as { status: string };

  const VALID = ['en_cours', 'pret', 'livre', 'annule'];
  if (!VALID.includes(status)) {
    res.status(400).json({ error: `Statut invalide. Attendu : ${VALID.join(' | ')}` }); return;
  }

  const order = await queryOne<{
    id: string; user_id: string | null; module: string; total: number;
  }>('SELECT id, user_id, module, total FROM orders WHERE id = $1', [id]);

  if (!order) { res.status(404).json({ error: 'Commande introuvable' }); return; }

  // Vérifier que le staff peut modifier cette commande (même module)
  const staffModule = req.user!.module_assigned;
  if (staffModule && staffModule !== order.module) {
    res.status(403).json({ error: 'Cette commande appartient à un autre module' }); return;
  }

  await execute('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

  // ── Notifications client ──────────────────────────────────────────────
  if (order.user_id) {
    const MODULE_LABELS: Record<string, string> = {
      restaurant: 'Restaurant', boutique: 'Boutique', hotel: 'Hôtel',
      show: 'Spectacles', salon: 'Salon', gym: 'Gym', pool: 'Piscine',
      field: 'Terrain', cybercafe: 'Cybercafé', kids: 'Espace Enfants',
    };
    const label = MODULE_LABELS[order.module] ?? order.module;

    if (status === 'pret') {
      // Notification in-app
      await createNotification(
        order.user_id,
        `✅ Commande ${label} prête !`,
        `Venez récupérer votre commande — elle vous attend.`,
        'order_ready'
      );
      // Push téléphone
      await sendPushToUser(
        order.user_id,
        `✅ Commande ${label} prête !`,
        `Venez récupérer votre commande — elle vous attend.`
      ).catch(() => {});
      // SMS
      const u = await queryOne<{ phone: string | null }>(
        'SELECT phone FROM users WHERE id = $1', [order.user_id]
      );
      if (u?.phone) await smsOrderReady(u.phone, label).catch(() => {});
    }

    if (status === 'annule') {
      await createNotification(
        order.user_id,
        `❌ Commande ${label} annulée`,
        `Votre commande a été annulée. Contactez-nous pour plus d'informations.`,
        'order_cancelled'
      );
    }
  }

  res.json({ ok: true, order_id: id, status });
});

export default router;
