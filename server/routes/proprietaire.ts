import { Router, Response } from 'express';
import { query } from '../db/database.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware: réserve aux propriétaires et super_admins
function requireOwner(req: AuthRequest, res: Response, next: () => void) {
  const role = req.user?.role;
  if (role !== 'proprietaire' && role !== 'super_admin') {
    res.status(403).json({ error: 'Accès réservé aux propriétaires' });
    return;
  }
  next();
}

router.use(requireAuth, (req: AuthRequest, res: Response, next: () => void) => requireOwner(req, res, next));

// KPIs globaux
router.get('/kpi', async (_req, res: Response) => {
  const [revenue, bookings, clients, modules] = await Promise.all([
    query<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='success' AND created_at >= NOW() - INTERVAL '30 days'`),
    query<{ n: number }>(`SELECT COUNT(*) as n FROM (
      SELECT id FROM hotel_bookings WHERE status!='annule' AND created_at >= NOW() - INTERVAL '30 days' UNION ALL
      SELECT id FROM gym_bookings WHERE created_at >= NOW() - INTERVAL '30 days' UNION ALL
      SELECT id FROM show_bookings WHERE created_at >= NOW() - INTERVAL '30 days' UNION ALL
      SELECT id FROM cybercafe_bookings WHERE created_at >= NOW() - INTERVAL '30 days'
    ) t`),
    query<{ n: number }>(`SELECT COUNT(*) as n FROM users WHERE role='client' AND created_at >= NOW() - INTERVAL '30 days'`),
    query<{ module: string; count: number; revenue: number }>(`
      SELECT booking_type as module, COUNT(*) as count, COALESCE(SUM(amount),0) as revenue
      FROM payments WHERE status='success' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY booking_type ORDER BY revenue DESC
    `),
  ]);
  res.json({
    revenue_30d: Number((revenue as { total: number }[])[0]?.total ?? 0),
    bookings_30d: Number((bookings as { n: number }[])[0]?.n ?? 0),
    new_clients_30d: Number((clients as { n: number }[])[0]?.n ?? 0),
    by_module: modules,
  });
});

// Réservations récentes toutes sources
router.get('/recent-bookings', async (_req, res: Response) => {
  const rows = await query(`
    SELECT 'hôtel' as source, hb.id, u.fullname as client, hb.check_in as date, hb.status, hr.name as detail
    FROM hotel_bookings hb JOIN users u ON u.id=hb.user_id JOIN hotel_rooms hr ON hr.id=hb.room_id
    WHERE hb.created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'gym', gb.id, u.fullname, gb.date, gb.status, gb.sport
    FROM gym_bookings gb JOIN users u ON u.id=gb.user_id
    WHERE gb.created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'spectacle', sb.id, u.fullname, s.date, sb.status, s.title
    FROM show_bookings sb JOIN users u ON u.id=sb.user_id JOIN shows s ON s.id=sb.show_id
    WHERE sb.created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'salon', slb.id, u.fullname, slb.date, slb.status, slb.service_name
    FROM salon_bookings slb JOIN users u ON u.id=slb.user_id
    WHERE slb.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY date DESC LIMIT 50
  `);
  res.json(rows);
});

// Paiements récents
router.get('/payments', async (_req, res: Response) => {
  const rows = await query(`
    SELECT p.id, p.amount, p.booking_type, p.status, p.created_at,
           u.fullname as client, u.email
    FROM payments p JOIN users u ON u.id=p.user_id
    ORDER BY p.created_at DESC LIMIT 50
  `);
  res.json(rows);
});

// Utilisateurs (lecture seule)
router.get('/users', async (_req, res: Response) => {
  const rows = await query(`
    SELECT id, fullname, email, phone, role, created_at,
           (SELECT COALESCE(SUM(amount),0) FROM payments WHERE user_id=users.id AND status='success') as total_spent
    FROM users ORDER BY created_at DESC LIMIT 100
  `);
  res.json(rows);
});

// Revenue par jour (30 jours)
router.get('/revenue-chart', async (_req, res: Response) => {
  const rows = await query(`
    SELECT DATE(created_at) as day, COALESCE(SUM(amount),0) as total
    FROM payments WHERE status='success' AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day
  `);
  res.json(rows);
});

export default router;
