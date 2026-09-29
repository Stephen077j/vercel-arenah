import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

export type WebhookEvent =
  | 'payment.confirmed'
  | 'payment.failed'
  | 'order.created'
  | 'order.status_changed'
  | 'booking.created';

// ─── Envoyer un webhook à tous les abonnés de cet événement ──────────────
export async function fireWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  const subs = await query<{ id: string; url: string; secret: string }>(
    `SELECT id, url, secret FROM webhook_subscriptions WHERE active = true AND $1 = ANY(events)`,
    [event]
  );
  if (!subs.length) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(subs.map(async sub => {
    const sig = crypto.createHmac('sha256', sub.secret).update(body).digest('hex');
    const deliveryId = generateId();
    let status = 'failed'; let code: number | null = null;
    try {
      const r = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-Arenah-Signature':  `sha256=${sig}`,
          'X-Arenah-Event':      event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      code   = r.status;
      status = r.ok ? 'success' : 'failed';
    } catch { status = 'failed'; }

    await execute(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, response_code, attempts, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,1,$7)`,
      [deliveryId, sub.id, event, JSON.parse(body), status, code, status === 'success' ? new Date() : null]
    );
  }));
}

// ─── Admin : lister les webhooks ──────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res: Response) => {
  res.json(await query('SELECT id, url, events, active, created_at FROM webhook_subscriptions ORDER BY created_at DESC'));
});

// ─── Admin : créer un webhook ─────────────────────────────────────────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { url, events } = req.body as { url: string; events: string[] };
  if (!url || !events?.length) { res.status(400).json({ error: 'url et events requis' }); return; }

  const VALID_EVENTS: WebhookEvent[] = ['payment.confirmed','payment.failed','order.created','order.status_changed','booking.created'];
  const invalid = events.filter(e => !VALID_EVENTS.includes(e as WebhookEvent));
  if (invalid.length) { res.status(400).json({ error: `Événements invalides: ${invalid.join(', ')}`, valid: VALID_EVENTS }); return; }

  const secret = crypto.randomBytes(32).toString('hex');
  const row = await queryOne(
    `INSERT INTO webhook_subscriptions (id, url, events, secret) VALUES ($1,$2,$3,$4) RETURNING id, url, events, active, created_at`,
    [generateId(), url, events, secret]
  );
  res.status(201).json({ ...row, secret, warning: 'Sauvegardez ce secret pour vérifier les signatures HMAC-SHA256.' });
});

// ─── Admin : activer/désactiver ───────────────────────────────────────────
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('UPDATE webhook_subscriptions SET active = $1 WHERE id = $2', [req.body.active, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM webhook_subscriptions WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── Admin : historique des livraisons ───────────────────────────────────
router.get('/:id/deliveries', requireAdmin, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT id, event, status, response_code, attempts, delivered_at, created_at
     FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.params.id]
  ));
});

export default router;
