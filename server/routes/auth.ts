import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAuth, signToken, AuthRequest } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { awardPoints } from './loyalty.js';

const router = Router();

interface UserRow {
  id: string; email: string; fullname: string; phone: string;
  password_hash: string; avatar_url: string; role: string;
  module_assigned: string | null;
  active: boolean; created_at: string;
}

// Code parrainage d'un user = 6 premiers chars de son UUID en majuscules
export function refCode(userId: string) {
  return userId.replace(/-/g, '').slice(0, 6).toUpperCase();
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, fullname, phone, ref_code } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return; }

  const { registration_enabled } = await getSettings();
  if (!registration_enabled) {
    res.status(403).json({ error: 'Les inscriptions sont temporairement fermées' });
    return;
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) { res.status(409).json({ error: 'Email déjà utilisé' }); return; }

  const hash = await bcrypt.hash(password, 10);
  const id = generateId();
  await execute(
    'INSERT INTO users (id, email, fullname, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, email, fullname || '', phone || '', hash, 'client']
  );
  await execute('INSERT INTO client_profiles (id) VALUES ($1)', [id]);

  // Parrainage : 500 pts au parrain + 500 pts au filleul (= 5 000 Ar chacun)
  if (ref_code) {
    const code = String(ref_code).toUpperCase();
    const allUsers = await query<{ id: string }>('SELECT id FROM users WHERE role = $1', ['client']);
    const referrer = allUsers.find(u => refCode(u.id) === code && u.id !== id);
    if (referrer) {
      await awardPoints(referrer.id, 50000, `Parrainage de ${email}`);   // 500 pts
      await awardPoints(id, 50000, `Bienvenue via parrainage`);           // 500 pts
    }
  }

  const token = signToken({ id, email, role: 'client' });
  res.status(201).json({ token, user: { id, email, fullname, phone, role: 'client' } });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return; }

  const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1 AND active = true', [email]);
  if (!user) { res.status(401).json({ error: 'Identifiants incorrects' }); return; }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) { res.status(401).json({ error: 'Identifiants incorrects' }); return; }

  const token = signToken({ id: user.id, email: user.email, role: user.role, module_assigned: user.module_assigned ?? undefined });
  res.json({ token, user: { id: user.id, email: user.email, fullname: user.fullname, phone: user.phone, avatar_url: user.avatar_url, role: user.role, module_assigned: user.module_assigned } });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await queryOne<UserRow>(
    'SELECT id, email, fullname, phone, avatar_url, role, active, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  if (!user) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
  const profile = await queryOne('SELECT bio, address, city, zipcode, country FROM client_profiles WHERE id = $1', [req.user!.id]);
  res.json({ ...user, profile });
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { fullname, phone, avatar_url, bio, address, city, country, password } = req.body;
  if (fullname || phone || avatar_url) {
    await execute(
      'UPDATE users SET fullname = COALESCE($1, fullname), phone = COALESCE($2, phone), avatar_url = COALESCE($3, avatar_url), updated_at = NOW() WHERE id = $4',
      [fullname || null, phone || null, avatar_url || null, req.user!.id]
    );
  }
  if (bio !== undefined || address !== undefined || city !== undefined || country !== undefined) {
    await execute(
      'UPDATE client_profiles SET bio = COALESCE($1,bio), address = COALESCE($2,address), city = COALESCE($3,city), country = COALESCE($4,country), updated_at = NOW() WHERE id = $5',
      [bio ?? null, address ?? null, city ?? null, country ?? null, req.user!.id]
    );
  }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await execute('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user!.id]);
  }
  res.json({ success: true });
});

export default router;
