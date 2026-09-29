import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { execute } from '../db/database.js';
import { storage } from '../services/storage.js';

const router = Router();

// Le fichier transite en mémoire puis part vers le pilote de stockage
// (server/services/storage.ts). C'est ce qui permet de remplacer le disque
// local par un stockage objet sans toucher à cette route.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier image uniquement'));
  },
});

// POST /api/upload/avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'Aucun fichier reçu' }); return; }

  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const key = `avatars/avatar_${Date.now()}${ext}`;

  const saved = await storage.save(key, req.file.buffer, req.file.mimetype);

  await execute(
    'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
    [saved.url, req.user!.id]
  );
  res.json({ url: saved.url });
});

export default router;
