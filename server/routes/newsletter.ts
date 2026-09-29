import { Router, Request, Response } from 'express';
import { execute, queryOne } from '../db/database.js';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Email invalide' });
    return;
  }
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        active BOOLEAN DEFAULT true
      )
    `);
    const existing = await queryOne('SELECT id FROM newsletter_subscribers WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      res.json({ success: true, message: 'Vous êtes déjà inscrit(e) !' });
      return;
    }
    await execute('INSERT INTO newsletter_subscribers (email, name) VALUES ($1, $2)', [email.toLowerCase(), name || null]);
    res.json({ success: true, message: 'Inscription confirmée ! Merci.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
