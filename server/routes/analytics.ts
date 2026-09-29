import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { query, queryOne } from '../db/database.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Utilitaires ───────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n) || 0;

// ─── Revenus par module ───────────────────────────────────────────────────
router.get('/revenue', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { period = '30d', module } = req.query as Record<string,string>;

  const intervals: Record<string, string> = {
    '7d':  '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y':  '1 year',
  };
  const interval = intervals[period] ?? '30 days';
  const groupBy  = period === '1y' ? "TO_CHAR(p.created_at, 'YYYY-MM')" : "TO_CHAR(p.created_at, 'YYYY-MM-DD')";

  let sql = `
    SELECT ${groupBy} as day,
           p.booking_type as module,
           SUM(p.amount) as revenue,
           COUNT(*) as count
    FROM payments p
    WHERE p.status = 'success'
      AND p.created_at >= NOW() - INTERVAL '${interval}'
    `;
  const params: string[] = [];
  if (module) { sql += ` AND p.booking_type = $1`; params.push(module); }
  sql += ` GROUP BY day, p.booking_type ORDER BY day ASC`;

  const rows = await query<{ day: string; module: string; revenue: number; count: number }>(sql, params);
  res.json({ period, rows });
});

// ─── KPI globaux ──────────────────────────────────────────────────────────
router.get('/kpis', requireAdmin, async (_req, res: Response) => {
  const [
    todayRevenue, weekRevenue, monthRevenue,
    totalClients, newClientsMonth,
    byModule,
    byMethod,
  ] = await Promise.all([
    queryOne<{ r: number }>(`SELECT COALESCE(SUM(amount),0) as r FROM payments WHERE status='success' AND created_at::date = CURRENT_DATE`),
    queryOne<{ r: number }>(`SELECT COALESCE(SUM(amount),0) as r FROM payments WHERE status='success' AND created_at >= NOW()-INTERVAL '7 days'`),
    queryOne<{ r: number }>(`SELECT COALESCE(SUM(amount),0) as r FROM payments WHERE status='success' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
    queryOne<{ n: number }>(`SELECT COUNT(*) as n FROM users WHERE role='client'`),
    queryOne<{ n: number }>(`SELECT COUNT(*) as n FROM users WHERE role='client' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
    query<{ module: string; revenue: number; count: number }>(
      `SELECT booking_type as module, SUM(amount) as revenue, COUNT(*) as count
       FROM payments WHERE status='success' AND created_at >= NOW()-INTERVAL '30 days'
       GROUP BY booking_type ORDER BY revenue DESC`
    ),
    query<{ method: string; revenue: number; count: number }>(
      `SELECT method, SUM(amount) as revenue, COUNT(*) as count
       FROM payments WHERE status='success' AND created_at >= NOW()-INTERVAL '30 days'
       GROUP BY method ORDER BY revenue DESC`
    ),
  ]);

  res.json({
    today_revenue:   fmt(todayRevenue?.r ?? 0),
    week_revenue:    fmt(weekRevenue?.r  ?? 0),
    month_revenue:   fmt(monthRevenue?.r ?? 0),
    total_clients:   fmt(totalClients?.n ?? 0),
    new_clients_month: fmt(newClientsMonth?.n ?? 0),
    by_module:  byModule,
    by_method:  byMethod,
  });
});

// ─── Taux d'occupation hôtel ──────────────────────────────────────────────
router.get('/occupancy/hotel', requireAdmin, async (_req, res: Response) => {
  const today   = new Date().toISOString().slice(0, 10);
  const [total, occupied] = await Promise.all([
    queryOne<{ n: number }>('SELECT COUNT(*) as n FROM hotel_rooms WHERE active = true'),
    queryOne<{ n: number }>(
      `SELECT COUNT(DISTINCT room_id) as n FROM hotel_bookings
       WHERE check_in <= $1 AND check_out > $1 AND status != 'annule'`,
      [today]
    ),
  ]);
  const t = fmt(total?.n ?? 0);
  const o = fmt(occupied?.n ?? 0);
  const days7 = await query<{ date: string; occupied: number }>(
    `SELECT TO_CHAR(d::date,'YYYY-MM-DD') as date,
            COUNT(DISTINCT hb.room_id) as occupied
     FROM generate_series(NOW()-INTERVAL '6 days', NOW(), '1 day') d
     LEFT JOIN hotel_bookings hb ON hb.check_in <= d::date AND hb.check_out > d::date AND hb.status != 'annule'
     GROUP BY d ORDER BY d`
  );
  res.json({ total: t, occupied: o, free: t - o, rate: t ? Math.round(o / t * 100) : 0, history: days7 });
});

// ─── Taux d'occupation terrain ────────────────────────────────────────────
router.get('/occupancy/field', requireAdmin, async (_req, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const [total, booked] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) as n FROM field_slots WHERE active = true`).catch(() => ({ n: 0 })),
    queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM field_bookings WHERE date = $1 AND status != 'annule'`, [today]
    ).catch(() => ({ n: 0 })),
  ]);
  const t = fmt((total as { n:number })?.n ?? 0);
  const b = fmt((booked as { n:number })?.n ?? 0);
  res.json({ total: t, booked: b, free: Math.max(0, t - b), rate: t ? Math.round(b / t * 100) : 0 });
});

// ─── Export Excel ─────────────────────────────────────────────────────────
router.get('/export', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { period = '30d' } = req.query as Record<string,string>;
  const intervals: Record<string,string> = { '7d':'7 days', '30d':'30 days', '90d':'90 days', '1y':'1 year' };
  const interval = intervals[period] ?? '30 days';

  const [payments, bookings, clients, products] = await Promise.all([
    query(`SELECT p.reference, p.amount, p.fee, p.method, p.status, p.booking_type,
                  TO_CHAR(p.created_at,'DD/MM/YYYY HH24:MI') as date,
                  u.fullname as client, u.email, u.phone
           FROM payments p LEFT JOIN users u ON u.id = p.user_id
           WHERE p.created_at >= NOW()-INTERVAL '${interval}'
           ORDER BY p.created_at DESC`),
    query(`SELECT 'Hôtel' as type, hb.id, u.fullname, u.email,
                  hr.name as detail, hb.check_in, hb.check_out, hb.total,
                  TO_CHAR(hb.created_at,'DD/MM/YYYY') as date
           FROM hotel_bookings hb
           JOIN users u ON u.id = hb.user_id
           JOIN hotel_rooms hr ON hr.id = hb.room_id
           WHERE hb.created_at >= NOW()-INTERVAL '${interval}'
           ORDER BY hb.created_at DESC`),
    query(`SELECT fullname, email, phone, role,
                  TO_CHAR(created_at,'DD/MM/YYYY') as inscription
           FROM users WHERE role='client' ORDER BY created_at DESC LIMIT 500`),
    query(`SELECT module, name, category, price, stock,
                  CASE WHEN active THEN 'Oui' ELSE 'Non' END as actif
           FROM products ORDER BY module, category, name`),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments),  'Paiements');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookings),  'Réservations Hôtel');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients),   'Clients');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products),  'Produits');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `ARENAH-rapport-${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── Top 5 produits par revenus ───────────────────────────────────────────
router.get('/top-products', requireAdmin, async (_req, res: Response) => {
  res.json(await query(
    `SELECT p.name, p.module, p.category,
            SUM(oi.total) as revenue, SUM(oi.qty) as units
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= NOW()-INTERVAL '30 days'
     GROUP BY p.id, p.name, p.module, p.category
     ORDER BY revenue DESC LIMIT 5`
  ));
});

export default router;
