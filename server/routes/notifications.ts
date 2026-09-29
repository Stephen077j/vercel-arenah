import { Router, Response } from 'express';
import { query, execute, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user!.id]
  ));
});

router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  await execute('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  res.json({ success: true });
});

router.patch('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  await execute('UPDATE notifications SET read = true WHERE user_id = $1', [req.user!.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  res.json({ success: true });
});

export async function createNotification(user_id: string, title: string, message: string, type = 'info'): Promise<void> {
  await execute(
    'INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1,$2,$3,$4,$5)',
    [generateId(), user_id, title, message, type]
  );
}

export default router;
