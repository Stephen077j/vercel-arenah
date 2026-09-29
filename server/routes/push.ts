import { Router, Response } from 'express';
import webpush from 'web-push';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:contact@arenah.mg',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

const router = Router();

// ─── Clé publique VAPID ───────────────────────────────────────────────────
router.get('/vapid-key', (_req, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' });
});

// ─── S'abonner ────────────────────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Subscription invalide' }); return;
  }
  await execute(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth_key)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (endpoint) DO UPDATE SET user_id=$2, p256dh=$4, auth_key=$5`,
    [generateId(), req.user!.id, endpoint, keys.p256dh, keys.auth]
  );
  res.json({ success: true });
});

// ─── Se désabonner ────────────────────────────────────────────────────────
router.delete('/unsubscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  await execute('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2', [endpoint, req.user!.id]);
  res.json({ success: true });
});

// ─── Utilitaire : envoyer push à un user ─────────────────────────────────
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  icon = '/icons/icon-192.png',
  url  = '/'
): Promise<void> {
  if (!vapidConfigured) return; // pas de clés VAPID → pas d'envoi
  const subs = await query<{ endpoint: string; p256dh: string; auth_key: string }>(
    'SELECT endpoint, p256dh, auth_key FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  const payload = JSON.stringify({ title, body, icon, url });
  const dead: string[] = [];

  await Promise.allSettled(subs.map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload
      );
    } catch (e: unknown) {
      // 410 = subscription expirée → supprimer
      if ((e as { statusCode?: number }).statusCode === 410) dead.push(s.endpoint);
    }
  }));

  if (dead.length) {
    await Promise.all(dead.map(ep =>
      execute('DELETE FROM push_subscriptions WHERE endpoint=$1', [ep])
    ));
  }
}

export default router;
