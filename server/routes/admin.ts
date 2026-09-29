import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { requireSuperAdmin, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { getSettings, updateSettings, ALL_MODULES } from '../services/settings.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Mapping module → types de réservations correspondants
const MODULE_BOOKING_TYPES: Record<string, string[]> = {
  boutique:    ['order'],
  restaurant:  ['order'],
  hotel:       ['hotel'],
  gym:         ['gym', 'gym_coach'],
  salon:       ['salon'],
  field:       ['field'],
  pool:        ['pool', 'pool_course'],
  event:       ['event'],
  spectacles:  ['show'],
  cybercafe:   ['cybercafe'],
};

// Helper: est-ce que cet utilisateur est super_admin ?
const isSuperAdmin = (req: AuthRequest) => req.user?.role === 'super_admin';
// Helper: module_assigned de l'admin connecté (null = super_admin, voit tout)
const userModule = (req: AuthRequest): string | null =>
  isSuperAdmin(req) ? null : (req.user?.module_assigned ?? null);

// ─── Super Admin stats ─────────────────────────────────────────────────────
router.get('/stats', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  const [clients, admins, orders, revenue, hotel, gym] = await Promise.all([
    queryOne<{ n: string }>('SELECT COUNT(*) as n FROM users WHERE role = $1', ['client']),
    queryOne<{ n: string }>('SELECT COUNT(*) as n FROM users WHERE role IN ($1,$2)', ['admin_module','super_admin']),
    queryOne<{ n: string }>('SELECT COUNT(*) as n FROM orders'),
    queryOne<{ s: string }>('SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status != $1', ['annulee']),
    queryOne<{ n: string }>('SELECT COUNT(*) as n FROM hotel_bookings WHERE status != $1', ['annule']),
    queryOne<{ n: string }>('SELECT COUNT(*) as n FROM gym_subscriptions WHERE status = $1', ['active']),
  ]);
  res.json({
    clients:       Number(clients?.n ?? 0),
    admins:        Number(admins?.n ?? 0),
    orders:        Number(orders?.n ?? 0),
    revenue:       Number(revenue?.s ?? 0),
    hotel_bookings:Number(hotel?.n ?? 0),
    gym_active:    Number(gym?.n ?? 0),
  });
});

// ─── Dashboard KPIs (adaptatif selon le module) ────────────────────────────
router.get('/dashboard', requireAdmin, async (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const mod   = userModule(req);

  // KPIs communs
  const [pendingPayments, pendingCash, totalClients] = await Promise.all([
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM payments WHERE status = 'pending'`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM payments WHERE status = 'pending_cash'`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM users WHERE role = 'client'`),
  ]);

  // KPIs filtrés par module
  let todayOrders = { n: '0' };
  let todayRevenue = { s: '0' };
  let hotelToday = { n: '0' };
  let gymActive  = { n: '0' };

  if (!mod || mod === 'boutique' || mod === 'restaurant') {
    const modFilter = mod ? ` AND module = '${mod}'` : '';
    const [o, r] = await Promise.all([
      queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM orders WHERE DATE(created_at) = $1 AND status != 'annulee'${modFilter}`, [today]),
      queryOne<{ s: string }>(`SELECT COALESCE(SUM(total),0) as s FROM orders WHERE DATE(created_at) = $1 AND status != 'annulee'${modFilter}`, [today]),
    ]);
    todayOrders  = o ?? { n: '0' };
    todayRevenue = (r as { s: string }) ?? { s: '0' };
  }
  if (!mod || mod === 'hotel') {
    hotelToday = await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM hotel_bookings WHERE DATE(created_at) = $1`, [today]) ?? { n: '0' };
  }
  if (!mod || mod === 'gym') {
    gymActive = await queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM gym_subscriptions WHERE status = 'active'`) ?? { n: '0' };
  }

  // Revenus hebdo
  const weeklyRevenue = await query<{ day: string; revenue: string; count: string }>(
    `SELECT TO_CHAR(DATE(created_at),'DD/MM') as day, COALESCE(SUM(total),0) as revenue, COUNT(*) as count
     FROM orders WHERE created_at >= NOW() - INTERVAL '7 days' AND status != 'annulee'
     ${mod ? `AND module = '${mod}'` : ''}
     GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
  );

  res.json({
    today_orders:     Number(todayOrders?.n ?? 0),
    today_revenue:    Number(todayRevenue?.s ?? 0),
    pending_payments: Number(pendingPayments?.n ?? 0),
    pending_cash:     Number(pendingCash?.n ?? 0),
    total_clients:    Number(totalClients?.n ?? 0),
    hotel_today:      Number(hotelToday?.n ?? 0),
    gym_active:       Number(gymActive?.n ?? 0),
    weekly_revenue:   weeklyRevenue,
    module:           mod, // renvoyé au frontend pour personnaliser l'affichage
  });
});

// ─── Réservations (filtrées par module) ────────────────────────────────────
router.get('/bookings', requireAdmin, async (req: AuthRequest, res: Response) => {
  const mod = userModule(req);
  const types = mod ? (MODULE_BOOKING_TYPES[mod] ?? []) : null;

  // Si admin_module sans module connu → rien
  if (mod && (!types || types.length === 0)) { res.json([]); return; }

  const shouldFetch = (type: string) => !types || types.includes(type);

  const [hotel, gym, gymCoach, salon, field, pool, courses, events, shows, cyber] = await Promise.all([
    shouldFetch('hotel') ? query(`
      SELECT id, 'hotel' as type, customer_name, customer_phone,
             CONCAT(check_in,' → ',check_out) as info, status, deposit as amount, created_at
      FROM hotel_bookings ORDER BY created_at DESC LIMIT 15`) : Promise.resolve([]),

    shouldFetch('gym') ? query(`
      SELECT gs.id, 'gym' as type, gs.customer_name, gs.customer_phone,
             gp.label as info, gs.status, gs.price as amount, gs.created_at
      FROM gym_subscriptions gs JOIN gym_plans gp ON gp.id = gs.plan_id
      ORDER BY gs.created_at DESC LIMIT 15`) : Promise.resolve([]),

    shouldFetch('gym_coach') ? query(`
      SELECT gcb.id, 'gym_coach' as type, gcb.customer_name, gcb.customer_phone,
             CONCAT(gc.name,' — ',gcb.date) as info, 'confirme' as status, gcb.price as amount, gcb.created_at
      FROM gym_coach_bookings gcb JOIN gym_coaches gc ON gc.id = gcb.coach_id
      ORDER BY gcb.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('salon') ? query(`
      SELECT sb.id, 'salon' as type, sb.customer_name, sb.customer_phone,
             CONCAT(ss.label,' — ',sb.date,' ',sb.slot) as info, sb.status, sb.price as amount, sb.created_at
      FROM salon_bookings sb JOIN salon_services ss ON ss.id = sb.service_id
      ORDER BY sb.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('field') ? query(`
      SELECT fb.id, 'field' as type, fb.customer_name, fb.customer_phone,
             CONCAT(fb.date,' ',COALESCE(fb.slot_label,fb.slot)) as info, fb.status, fb.price as amount, fb.created_at
      FROM field_bookings fb ORDER BY fb.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('pool') ? query(`
      SELECT pp.id, 'pool' as type, pp.customer_name, pp.customer_phone,
             CONCAT(pt.label,' — ',pp.entries_left,' entrées') as info, 'active' as status, pp.price as amount, pp.created_at
      FROM pool_passes pp JOIN pool_pass_types pt ON pt.id = pp.pass_type_id
      ORDER BY pp.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('pool_course') ? query(`
      SELECT id, 'pool_course' as type, customer_name, customer_phone,
             CONCAT(course_name,' — ',date,' ',slot) as info, status, price as amount, created_at
      FROM pool_course_bookings ORDER BY created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('event') ? query(`
      SELECT eb.id, 'event' as type, eb.customer_name, eb.customer_phone,
             CONCAT(eh.name,' — ',eb.event_date) as info, eb.status, eb.deposit as amount, eb.created_at
      FROM event_bookings eb JOIN event_halls eh ON eh.id = eb.hall_id
      ORDER BY eb.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('show') ? query(`
      SELECT sb.id, 'show' as type, sb.customer_name, sb.customer_phone,
             CONCAT(s.title,' — ',sb.seats_count,' place(s)') as info,
             COALESCE(sb.status,'confirme') as status, sb.total as amount, sb.created_at
      FROM show_bookings sb JOIN shows s ON s.id = sb.show_id
      ORDER BY sb.created_at DESC LIMIT 10`) : Promise.resolve([]),

    shouldFetch('cybercafe') ? query(`
      SELECT cb.id, 'cybercafe' as type, cb.customer_name, cb.customer_phone,
             CONCAT('Poste ',cs.number,' — ',cd.label) as info,
             COALESCE(cb.status,'confirme') as status, cb.total as amount, cb.created_at
      FROM cybercafe_bookings cb
      JOIN cybercafe_stations cs ON cs.id = cb.station_id
      JOIN cybercafe_durations cd ON cd.id = cb.duration_id
      ORDER BY cb.created_at DESC LIMIT 10`) : Promise.resolve([]),
  ]);

  const all = [
    ...hotel, ...gym, ...gymCoach, ...salon, ...field,
    ...pool, ...courses, ...events, ...shows, ...cyber,
  ].sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
   .slice(0, 60);

  res.json(all);
});

// ─── Gestion utilisateurs (Super Admin) ────────────────────────────────────

router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  const search = req.query.q as string || '';
  const role   = req.query.role as string || '';
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) { params.push(`%${search}%`); conditions.push(`(email ILIKE $${params.length} OR fullname ILIKE $${params.length})`); }
  if (role)   { params.push(role); conditions.push(`role = $${params.length}`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  res.json(await query(
    `SELECT id, email, fullname, phone, role, module_assigned, active, created_at,
            (SELECT COUNT(*) FROM payments WHERE user_id = users.id) as payment_count,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE user_id = users.id) as total_spent
     FROM users ${where} ORDER BY created_at DESC LIMIT 500`,
    params as (string|number)[]
  ));
});

// Créer un utilisateur (super_admin uniquement)
router.post('/users', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const { email, fullname, phone, role, module_assigned, password } = req.body;
  if (!email?.trim() || !password?.trim() || !role?.trim()) {
    res.status(400).json({ error: 'email, password, role requis' }); return;
  }
  const exists = await queryOne<{ id: string }>('SELECT id FROM users WHERE email=$1', [email.trim()]);
  if (exists) { res.status(409).json({ error: 'Email déjà utilisé' }); return; }
  const hash = await bcrypt.hash(password, 10);
  const user = await queryOne(
    `INSERT INTO users (id, email, fullname, phone, password_hash, role, module_assigned, active)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true) RETURNING id, email, fullname, role, module_assigned, active, created_at`,
    [email.trim(), fullname?.trim()||null, phone?.trim()||null, hash, role.trim(), module_assigned||null]
  );
  res.status(201).json(user);
});

// Modifier un utilisateur (super_admin uniquement)
router.put('/users/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const { email, fullname, phone, role, module_assigned, active, password } = req.body;
  const { id } = req.params;
  if (email)    await execute('UPDATE users SET email=$1, updated_at=NOW() WHERE id=$2', [email, id]);
  if (fullname) await execute('UPDATE users SET fullname=$1, updated_at=NOW() WHERE id=$2', [fullname, id]);
  if (phone !== undefined) await execute('UPDATE users SET phone=$1, updated_at=NOW() WHERE id=$2', [phone||null, id]);
  if (role)     await execute('UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2', [role, id]);
  if (module_assigned !== undefined) await execute('UPDATE users SET module_assigned=$1, updated_at=NOW() WHERE id=$2', [module_assigned||null, id]);
  if (active !== undefined) await execute('UPDATE users SET active=$1, updated_at=NOW() WHERE id=$2', [active, id]);
  if (password?.trim()) {
    const hash = await bcrypt.hash(password, 10);
    await execute('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, id]);
  }
  res.json(await queryOne('SELECT id, email, fullname, phone, role, module_assigned, active, created_at FROM users WHERE id=$1', [id]));
});

// PATCH (compatibilité ancienne route)
router.patch('/users/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const { active, role, module_assigned } = req.body;
  if (active !== undefined) await execute('UPDATE users SET active=$1, updated_at=NOW() WHERE id=$2', [active, req.params.id]);
  if (role) await execute('UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2', [role, req.params.id]);
  if (module_assigned !== undefined) await execute('UPDATE users SET module_assigned=$1, updated_at=NOW() WHERE id=$2', [module_assigned, req.params.id]);
  res.json({ success: true });
});

// Désactiver définitivement (soft delete)
router.delete('/users/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const self = req.user!;
  if (req.params.id === self.id) { res.status(400).json({ error: 'Impossible de supprimer votre propre compte' }); return; }
  const target = await queryOne<{ role: string }>('SELECT role FROM users WHERE id=$1', [req.params.id]);
  if (target?.role === 'super_admin') { res.status(403).json({ error: 'Impossible de supprimer un super admin' }); return; }
  await execute('UPDATE users SET active=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── Historique global (toutes réservations) ──────────────────────────────
router.get('/history', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const limit  = parseInt(String(req.query.limit  || 100));
  const module = req.query.module as string || '';
  const userId = req.query.user_id as string || '';

  const rows = await query<{ id:string; type:string; module:string; user_email:string; customer_name:string|null; amount:number|null; status:string; created_at:string }>(
    `SELECT * FROM (
      SELECT h.id::text, 'hotel' as type, 'hotel' as module,
             u.email as user_email, h.customer_name,
             h.total as amount, h.status, h.created_at
      FROM hotel_bookings h JOIN users u ON u.id=h.user_id

      UNION ALL
      SELECT g.id::text, 'gym_session', 'gym',
             u.email, g.customer_name, g.price, g.status, g.created_at
      FROM gym_sessions g JOIN users u ON u.id=g.user_id

      UNION ALL
      SELECT g.id::text, 'gym_coach', 'gym',
             u.email, g.customer_name, g.total, g.status, g.created_at
      FROM gym_coach_bookings g JOIN users u ON u.id=g.user_id

      UNION ALL
      SELECT p.id::text, 'pool_pass', 'pool',
             u.email, p.customer_name, p.price, 'active', p.created_at
      FROM pool_passes p JOIN users u ON u.id=p.user_id

      UNION ALL
      SELECT pe.id::text, 'pool_entry', 'pool',
             u.email, pe.customer_name, pe.total_price, pe.status, pe.created_at
      FROM pool_entries pe JOIN users u ON u.id=pe.user_id

      UNION ALL
      SELECT f.id::text, 'field', 'field',
             u.email, f.customer_name, f.price, f.status, f.created_at
      FROM field_bookings f JOIN users u ON u.id=f.user_id

      UNION ALL
      SELECT e.id::text, 'event', 'event',
             u.email, e.customer_name, e.total, e.status, e.created_at
      FROM event_bookings e JOIN users u ON u.id=e.user_id

      UNION ALL
      SELECT sb.id::text, 'spectacle', 'spectacles',
             u.email, sb.customer_name, sb.total, sb.status, sb.created_at
      FROM show_bookings sb JOIN users u ON u.id=sb.user_id

      UNION ALL
      SELECT cb.id::text, 'cybercafe', 'cybercafe',
             u.email, cb.customer_name, cb.total, cb.status, cb.created_at
      FROM cybercafe_bookings cb JOIN users u ON u.id=cb.user_id

      UNION ALL
      SELECT tb.id::text, 'restaurant_table', 'restaurant',
             COALESCE(u.email, 'anonyme'), tb.customer_name, NULL, tb.status, tb.date::timestamptz
      FROM table_bookings tb LEFT JOIN users u ON u.id=tb.user_id

      UNION ALL
      SELECT o.id::text, 'order', o.module,
             u.email, u.fullname, o.total, o.status, o.created_at
      FROM orders o JOIN users u ON u.id=o.user_id

      UNION ALL
      SELECT pay.id::text, 'payment', 'paiement',
             u.email, u.fullname, pay.amount, pay.status, pay.created_at
      FROM payments pay JOIN users u ON u.id=pay.user_id
    ) h
    WHERE ($1 = '' OR h.module = $1)
      AND ($2 = '' OR h.user_email ILIKE '%' || $2 || '%')
    ORDER BY h.created_at DESC
    LIMIT $3`,
    [module, userId, limit]
  );
  res.json(rows);
});

router.get('/audit-logs', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const limit = parseInt(String(req.query.limit || 200));
  res.json(await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]));
});

router.get('/revenue', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const { module } = req.query as Record<string, string>;
  if (module) {
    res.json(await query(
      `SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as count
       FROM orders WHERE module = $1 AND status != 'annulee'
       GROUP BY date ORDER BY date DESC LIMIT 30`, [module]
    ));
  } else {
    res.json(await query(
      `SELECT module, SUM(total) as revenue, COUNT(*) as count
       FROM orders WHERE status != 'annulee' GROUP BY module ORDER BY revenue DESC`
    ));
  }
});

// ─── Tableau de bord Super Admin (page /super-admin/dashboard) ─────────────
// Renvoie en un seul appel la structure DashboardData attendue par
// src/services/superAdminService.ts.

// Statuts marquant une réservation annulée — la valeur diffère selon les tables
// ('annule' historiquement, 'cancelled' sur les modules plus récents).
const CANCELLED = `('annule','annulee','cancelled')`;

// Tables de réservation, avec ou sans colonne status.
const BOOKING_TABLES: { table: string; hasStatus: boolean }[] = [
  { table: 'hotel_bookings',          hasStatus: true  },
  { table: 'gym_subscriptions',       hasStatus: true  },
  { table: 'gym_coach_bookings',      hasStatus: true  },
  { table: 'salon_bookings',          hasStatus: true  },
  { table: 'field_bookings',          hasStatus: true  },
  { table: 'pool_passes',             hasStatus: false },
  { table: 'pool_course_bookings',    hasStatus: true  },
  { table: 'event_bookings',          hasStatus: true  },
  { table: 'show_bookings',           hasStatus: true  },
  { table: 'cybercafe_bookings',      hasStatus: true  },
  { table: 'kids_bookings',           hasStatus: true  },
  { table: 'restaurant_reservations', hasStatus: true  },
  { table: 'table_bookings',          hasStatus: true  },
];

// booking_type stocké dans payments → libellé affiché sur le dashboard
const MODULE_LABELS: Record<string, string> = {
  order: 'Boutique & Resto', hotel: 'Hôtel', gym: 'Gym & Sport', gym_coach: 'Coaching',
  salon: 'Salon', field: 'Terrains', pool: 'Piscine', pool_course: 'Cours piscine',
  event: 'Événements', show: 'Spectacles', cybercafe: 'Cybercafé', kids: 'Espace Kids',
};

router.get('/sa-dashboard', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  const DAYS = 14;

  const reservationsSql = BOOKING_TABLES
    .map(t => `(SELECT COUNT(*) FROM ${t.table}${t.hasStatus ? ` WHERE COALESCE(status,'') NOT IN ${CANCELLED}` : ''})`)
    .join(' + ');

  const [stats, revenueRows, moduleRows, growthRows, alertRows, activityRows] = await Promise.all([
    queryOne<Record<string, string>>(`
      SELECT
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success')            as revenue,
        (SELECT COUNT(*) FROM users WHERE role='client')                                 as clients,
        (SELECT COUNT(*) FROM users WHERE role='admin_module')                           as module_admins,
        (SELECT COUNT(*) FROM orders WHERE status != 'annulee')                          as orders,
        (${reservationsSql})                                                             as reservations,
        (SELECT COUNT(*) FROM notifications WHERE type IN ('error','warning'))           as critical_alerts,
        (SELECT COUNT(DISTINCT user_id) FROM payments
          WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours')       as active_clients_24h
    `),

    // Recette encaissée par jour sur la fenêtre glissante
    query<{ date: string; revenue: string }>(`
      SELECT TO_CHAR(created_at,'YYYY-MM-DD') as date, COALESCE(SUM(amount),0) as revenue
      FROM payments
      WHERE status='success' AND created_at >= CURRENT_DATE - INTERVAL '${DAYS - 1} days'
      GROUP BY date ORDER BY date ASC`),

    // Répartition du CA par module sur 30 jours
    query<{ module: string; revenue: string }>(`
      SELECT COALESCE(booking_type,'autre') as module, COALESCE(SUM(amount),0) as revenue
      FROM payments
      WHERE status='success' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY booking_type ORDER BY revenue DESC LIMIT 8`),

    // Nouveaux clients par jour (cumulé côté serveur plus bas)
    query<{ date: string; count: string }>(`
      SELECT TO_CHAR(created_at,'YYYY-MM-DD') as date, COUNT(*) as count
      FROM users
      WHERE role='client' AND created_at >= CURRENT_DATE - INTERVAL '${DAYS - 1} days'
      GROUP BY date ORDER BY date ASC`),

    query<{ id: string; type: string; title: string; message: string; created_at: string }>(`
      SELECT id, type, title, message, created_at FROM notifications
      WHERE type IN ('error','warning') ORDER BY created_at DESC LIMIT 8`),

    query<{ id: string; action: string; module: string; user_email: string; created_at: string }>(`
      SELECT id, action, module, user_email, created_at FROM audit_logs
      ORDER BY created_at DESC LIMIT 10`),
  ]);

  // Nombre de clients antérieurs à la fenêtre, pour que la courbe parte du bon niveau
  const before = await queryOne<{ n: string }>(
    `SELECT COUNT(*) as n FROM users WHERE role='client' AND created_at < CURRENT_DATE - INTERVAL '${DAYS - 1} days'`
  );

  // Séries denses : un point par jour même sans activité, sinon les graphes sautent des jours
  const days: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  const revenueByDay = new Map(revenueRows.map(r => [r.date, Number(r.revenue)]));
  const newByDay     = new Map(growthRows.map(r => [r.date, Number(r.count)]));

  let cumulative = Number(before?.n ?? 0);
  const userGrowth = days.map(date => {
    cumulative += newByDay.get(date) ?? 0;
    return { date, users: cumulative };
  });

  res.json({
    stats: {
      revenue:           Number(stats?.revenue ?? 0),
      clients:           Number(stats?.clients ?? 0),
      moduleAdmins:      Number(stats?.module_admins ?? 0),
      orders:            Number(stats?.orders ?? 0),
      reservations:      Number(stats?.reservations ?? 0),
      activeModules:     await countActiveModules(),
      criticalAlerts:    Number(stats?.critical_alerts ?? 0),
      activeClients24h:  Number(stats?.active_clients_24h ?? 0),
    },
    revenue: days.map(date => ({ date, revenue: revenueByDay.get(date) ?? 0 })),
    modulePerformance: moduleRows.map(r => ({
      module: MODULE_LABELS[r.module] ?? r.module,
      value:  Number(r.revenue),
    })),
    userGrowth,
    alerts: alertRows.map(r => ({
      id:        r.id,
      type:      r.type === 'error' ? 'critical' : 'warning',
      title:     r.title,
      message:   r.message ?? '',
      createdAt: r.created_at,
    })),
    activity: activityRows.map(r => ({
      id:         r.id,
      action:     r.action,
      entity:     r.module,
      actorEmail: r.user_email,
      createdAt:  r.created_at,
    })),
  });
});

async function countActiveModules(): Promise<number> {
  const settings = await getSettings();
  return settings.active_modules.length;
}

// ─── Paramètres plateforme (Super Admin) ───────────────────────────────────
router.get('/platform-settings', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  res.json(await getSettings());
});

router.patch('/platform-settings', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  const patch = req.body as Record<string, unknown>;

  if (patch.active_modules !== undefined) {
    const list = patch.active_modules;
    if (!Array.isArray(list) || list.some(m => !ALL_MODULES.includes(m as typeof ALL_MODULES[number]))) {
      res.status(400).json({ error: `active_modules doit être une liste parmi : ${ALL_MODULES.join(', ')}` });
      return;
    }
  }
  if (patch.max_bookings_per_user !== undefined) {
    const n = Number(patch.max_bookings_per_user);
    if (!Number.isInteger(n) || n < 1) {
      res.status(400).json({ error: 'max_bookings_per_user doit être un entier ≥ 1' });
      return;
    }
    patch.max_bookings_per_user = n;
  }

  const updated = await updateSettings(patch);
  await execute(
    'INSERT INTO audit_logs (user_id, user_email, action, module, details) VALUES ($1,$2,$3,$4,$5)',
    [req.user!.id, req.user!.email, 'platform_settings.update', 'platform', JSON.stringify(Object.keys(patch))]
  );
  res.json(updated);
});

export default router;
