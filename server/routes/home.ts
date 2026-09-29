import { Router, Request, Response } from 'express';
import { query } from '../db/database.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { recommendForUser } from '../ai/recommender.js';

const router = Router();

// Public — pas d'auth requis
router.get('/feed', async (_req: Request, res: Response) => {
  const [products_raw, promos_raw, testimonials_raw, top_services_raw] = await Promise.all([

    // Top produits par nombre de commandes + note moyenne
    query<{
      id: string; name: string; price: number; category: string;
      image_url: string | null; module: string;
      order_count: number; avg_rating: number | null; review_count: number;
    }>(`
      SELECT p.id, p.name, p.price, p.category, p.image_url, p.module,
             COALESCE((SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id), 0) AS order_count,
             (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.booking_id = p.id::text AND r.approved = true) AS avg_rating,
             COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.booking_id = p.id::text AND r.approved = true), 0) AS review_count
      FROM products p
      WHERE p.active = true
      ORDER BY order_count DESC, p.created_at DESC
      LIMIT 8
    `),

    // Promos actives (tous modules)
    query<{ code: string; type: string; value: number; module: string | null; valid_until: string | null }>(`
      SELECT code, type, value, module, valid_until
      FROM promo_codes
      WHERE active = true
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (max_uses IS NULL OR uses_count < max_uses)
      ORDER BY value DESC LIMIT 6
    `),

    // Avis récents approuvés ≥ 4 étoiles
    query<{ module: string; rating: number; comment: string | null; fullname: string; created_at: string }>(`
      SELECT r.module, r.rating, r.comment, u.fullname, r.created_at
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.approved = true AND r.rating >= 4 AND r.comment IS NOT NULL
      ORDER BY r.created_at DESC LIMIT 6
    `),

    // Top modules par nombre de paiements réussis
    query<{ module: string; bookings: number }>(`
      SELECT booking_type AS module, COUNT(*) AS bookings
      FROM payments WHERE status = 'success'
      GROUP BY booking_type ORDER BY bookings DESC LIMIT 6
    `),
  ]);

  const promos = promos_raw.map(p => ({
    ...p,
    label: p.type === 'percent' ? `-${p.value}%` : `-${Number(p.value).toLocaleString('fr-FR')} Ar`,
    badge: p.type === 'percent' ? `${p.value}% Off` : `-${Number(p.value).toLocaleString('fr-FR')} Ar`,
    hint: p.module
      ? `Valable pour : ${p.module}`
      : p.valid_until
        ? `Expire le ${new Date(p.valid_until).toLocaleDateString('fr-FR')}`
        : 'Tous les services',
  }));

  res.json({
    top_products:  products_raw,
    promos,
    testimonials:  testimonials_raw,
    top_services:  top_services_raw,
  });
});

// ── Recommandations personnalisées (IA : filtrage collaboratif) ─────────────
// Pas d'auth obligatoire — JWT optionnel pour personnaliser.
// L'algorithme est dans server/ai/recommender.ts.
router.get('/recommendations', async (req: Request, res: Response) => {
  let userId: string | null = null;
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
      userId = payload.id;
    }
  } catch { /* token absent ou invalide = visiteur anonyme */ }

  const reco = await recommendForUser(userId, 4);

  // Fallback absolu (base vide)
  const defaults = ['hotel', 'restaurant', 'gym', 'salon', 'show', 'pool', 'boutique', 'field'];
  for (const d of defaults) {
    if (reco.modules.length >= 4) break;
    if (!reco.modules.includes(d) && !reco.used.includes(d)) reco.modules.push(d);
  }

  res.json({
    modules: reco.modules.slice(0, 4),
    personalized: reco.personalized,
    reason: reco.personalized
      ? 'Des clients au profil proche du vôtre ont aussi apprécié ces services'
      : 'Les plus populaires en ce moment',
    details: reco.details,
  });
});

export default router;
