import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
  module_assigned?: string; // présent uniquement pour admin_module
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!['super_admin', 'admin_module'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    next();
  });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({ error: 'Accès super-admin requis' });
      return;
    }
    next();
  });
}

/**
 * Lit le jeton d'une requête sans rejeter celle-ci.
 * Pour les middlewares qui doivent adapter leur comportement selon le rôle
 * mais laisser passer les visiteurs non authentifiés.
 */
export function readToken(req: Request): AuthPayload | null {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}
