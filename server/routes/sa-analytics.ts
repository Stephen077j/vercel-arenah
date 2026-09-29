import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/database.js';

const router = Router();

/* ─── KPIs globaux ─────────────────────────────────────────────────────── */
router.get('/kpis', async (_req: Request, res: Response) => {
  try {
    const [todayRev, weekRev, monthRev, totalClients, newClientsMonth, byModule, byMethod] =
      await Promise.all([
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
      today_revenue:     Number(todayRev?.r     ?? 0),
      week_revenue:      Number(weekRev?.r      ?? 0),
      month_revenue:     Number(monthRev?.r     ?? 0),
      total_clients:     Number(totalClients?.n ?? 0),
      new_clients_month: Number(newClientsMonth?.n ?? 0),
      by_module:         byModule,
      by_method:         byMethod,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ─── Revenus par jour/semaine/mois ────────────────────────────────────── */
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query as Record<string, string>;
    const intervals: Record<string, string> = {
      '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year',
    };
    const interval = intervals[period] ?? '30 days';
    const groupBy  = period === '1y'
      ? "TO_CHAR(created_at, 'YYYY-MM')"
      : "TO_CHAR(created_at, 'YYYY-MM-DD')";

    const rows = await query<{ day: string; module: string; revenue: number; count: number }>(
      `SELECT ${groupBy} as day, booking_type as module, SUM(amount) as revenue, COUNT(*) as count
       FROM payments
       WHERE status = 'success' AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY day, booking_type ORDER BY day ASC`
    );
    res.json({ period, rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ─── Clients ──────────────────────────────────────────────────────────── */
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query as Record<string, string>;
    const intervals: Record<string, string> = {
      '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year',
    };
    const interval = intervals[period] ?? '30 days';
    const groupBy  = period === '1y'
      ? "TO_CHAR(created_at, 'YYYY-MM')"
      : "TO_CHAR(created_at, 'YYYY-MM-DD')";

    const [total, newByDay] = await Promise.all([
      queryOne<{ n: number }>(`SELECT COUNT(*) as n FROM users WHERE role='client'`),
      query<{ day: string; count: number }>(
        `SELECT ${groupBy} as day, COUNT(*) as count
         FROM users WHERE role='client' AND created_at >= NOW() - INTERVAL '${interval}'
         GROUP BY day ORDER BY day ASC`
      ),
    ]);

    res.json({
      total:     Number(total?.n ?? 0),
      new_count: newByDay.reduce((s, r) => s + Number(r.count), 0),
      by_day:    newByDay,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ─── Occupation temps réel ─────────────────────────────────────────────── */
router.get('/occupancy', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [hotelTotal, hotelOccupied, cyberActive, fieldBooked] = await Promise.all([
      queryOne<{ n: number }>('SELECT COUNT(*) as n FROM hotel_rooms WHERE active = true'),
      queryOne<{ n: number }>(
        `SELECT COUNT(DISTINCT room_id) as n FROM hotel_bookings
         WHERE check_in <= $1 AND check_out > $1 AND status != 'annule'`, [today]
      ),
      queryOne<{ n: number }>(
        `SELECT COUNT(*) as n FROM cybercafe_bookings WHERE status = 'active'`
      ).catch(() => ({ n: 0 })),
      queryOne<{ n: number }>(
        `SELECT COUNT(*) as n FROM field_bookings WHERE date = $1 AND status != 'annule'`, [today]
      ).catch(() => ({ n: 0 })),
    ]);

    const ht = Number(hotelTotal?.n ?? 0);
    const ho = Number(hotelOccupied?.n ?? 0);

    res.json({
      hotel:    { total: ht, occupied: ho, rate: ht ? Math.round((ho / ht) * 100) : 0 },
      cybercafe:{ active: Number((cyberActive  as any)?.n ?? 0), total: 10 },
      field:    { booked: Number((fieldBooked  as any)?.n ?? 0), total: 14 },
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
