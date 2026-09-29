import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query, execute, queryOne, generateId } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Utilitaires ──────────────────────────────────────────────────────────
function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw    = `ARN_${crypto.randomBytes(24).toString('base64url')}`;
  const prefix = raw.slice(0, 12);
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ─── Middleware: vérifier une API key dans les headers ─────────────────────
export async function verifyApiKey(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  const header = req.headers['x-api-key'] as string | undefined;
  if (!header) { res.status(401).json({ error: 'API key manquante (header X-Api-Key)' }); return; }

  const hash = hashKey(header);
  const key = await queryOne<{ id: string; permissions: string[]; device_type: string; active: boolean }>(
    'SELECT id, permissions, device_type, active FROM api_keys WHERE key_hash = $1', [hash]
  );
  if (!key || !key.active) { res.status(401).json({ error: 'API key invalide ou révoquée' }); return; }

  await execute('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]);
  (req as AuthRequest & { apiKey: typeof key }).apiKey = key;
  next();
}

// ─── Admin : lister les clés ───────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res: Response) => {
  res.json(await query(
    'SELECT id, name, prefix, device_type, permissions, active, last_used_at, created_at FROM api_keys ORDER BY created_at DESC'
  ));
});

// ─── Admin : créer une clé ────────────────────────────────────────────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, device_type, permissions } = req.body as {
    name: string; device_type?: string; permissions?: string[];
  };
  if (!name) { res.status(400).json({ error: 'name requis' }); return; }

  const { raw, prefix, hash } = generateKey();
  const perms = permissions ?? ['read'];
  const dtype = device_type ?? 'external';

  await execute(
    `INSERT INTO api_keys (id, name, key_hash, prefix, device_type, permissions)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [generateId(), name, hash, prefix, dtype, perms]
  );

  // On retourne la clé RAW une seule fois — elle ne sera plus jamais visible
  res.status(201).json({
    key: raw,
    prefix,
    device_type: dtype,
    permissions: perms,
    warning: 'Sauvegardez cette clé maintenant — elle ne sera plus affichée.',
  });
});

// ─── Admin : révoquer une clé ─────────────────────────────────────────────
router.patch('/:id/revoke', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('UPDATE api_keys SET active = false WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await execute('DELETE FROM api_keys WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
