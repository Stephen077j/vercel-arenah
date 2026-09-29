import { Router, Response } from 'express';
import crypto from 'crypto';
import { execute, queryOne, generateId } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendOtpSms } from '../services/sms.js';
import { sendOtp as sendOtpEmail } from '../services/email.js';

const router = Router();

function genCode(): string { return String(Math.floor(100000 + Math.random() * 900000)); }

// ─── Envoyer un OTP (SMS + email) ────────────────────────────────────────
router.post('/send', requireAuth, async (req: AuthRequest, res: Response) => {
  const { purpose } = req.body as { purpose?: string };
  const p = purpose ?? 'verify';
  const userId = req.user!.id;

  // Récupérer infos utilisateur
  const u = await queryOne<{ phone: string; email: string; fullname: string }>(
    'SELECT phone, email, fullname FROM users WHERE id = $1', [userId]
  );
  if (!u?.phone) { res.status(400).json({ error: 'Numéro de téléphone requis dans votre profil' }); return; }

  // Invalider les OTP précédents pour ce phone+purpose
  await execute(
    'UPDATE otp_codes SET used = true WHERE phone = $1 AND purpose = $2 AND used = false',
    [u.phone, p]
  );

  const code      = genCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await execute(
    'INSERT INTO otp_codes (id, phone, user_id, code, purpose, expires_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [generateId(), u.phone, userId, code, p, expiresAt]
  );

  await Promise.all([
    sendOtpSms(u.phone, code),
    sendOtpEmail(u.phone, u.email, code, p),
  ]);

  res.json({
    success: true,
    phone:   u.phone.replace(/(\+261)(\d{2})(\d{3})(\d{2})/, '$1 $2 XXX $4'),
    expires_in: 300,
  });
});

// ─── Vérifier un OTP ─────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  const { code, purpose } = req.body as { code: string; purpose?: string };
  const p = purpose ?? 'verify';
  const userId = req.user!.id;

  const otp = await queryOne<{ id: string; expires_at: string; used: boolean }>(
    `SELECT id, expires_at, used FROM otp_codes
     WHERE user_id = $1 AND code = $2 AND purpose = $3 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [userId, code, p]
  );

  if (!otp)               { res.status(400).json({ error: 'Code incorrect' }); return; }
  if (new Date(otp.expires_at) < new Date()) { res.status(400).json({ error: 'Code expiré' }); return; }

  await execute('UPDATE otp_codes SET used = true WHERE id = $1', [otp.id]);
  res.json({ success: true });
});

export default router;
