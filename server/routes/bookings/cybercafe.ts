import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

// Stations avec disponibilité temps réel
router.get('/stations', async (req: Request, res: Response) => {
  const { date, time_from, time_to } = req.query as Record<string, string>;
  const stations = await query<{ id: string; number: number; label: string; station_type: string; specs: string; hourly_rate: number; active: boolean }>(
    'SELECT id, number, label, station_type, specs, hourly_rate, active FROM cybercafe_stations WHERE active = true ORDER BY station_type, number'
  );
  if (!date || !time_from || !time_to) { res.json(stations.map(s => ({ ...s, booking: null }))); return; }
  // start_time/end_time sont des timestamptz — on compare avec des heures en texte sur la même date
  const busy = await query<{ station_id: string; st: string; et: string }>(
    `SELECT station_id,
            TO_CHAR(start_time AT TIME ZONE 'Indian/Antananarivo', 'HH24:MI') as st,
            TO_CHAR(end_time   AT TIME ZONE 'Indian/Antananarivo', 'HH24:MI') as et
     FROM cybercafe_bookings
     WHERE DATE(start_time AT TIME ZONE 'Indian/Antananarivo') = $1 AND status != 'cancelled'`, [date]
  );
  res.json(stations.map(s => {
    const conflict = busy.find(b => b.station_id === s.id && b.st < time_to && b.et > time_from);
    return { ...s, booking: conflict ? { time_from: conflict.st, time_to: conflict.et } : null };
  }));
});

// Jeux PS4
router.get('/ps4-games', async (_req: Request, res: Response) => {
  res.json(await query('SELECT * FROM ps4_games WHERE active = true ORDER BY title'));
});
router.get('/durations', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM cybercafe_durations WHERE active = true ORDER BY minutes')); });
router.get('/services', async (_req: Request, res: Response) => { res.json(await query('SELECT * FROM cybercafe_services WHERE active = true ORDER BY price')); });

router.get('/availability', async (req: Request, res: Response) => {
  const { date } = req.query as Record<string, string>;
  if (!date) { res.status(400).json({ error: 'date requis' }); return; }
  const stations = await query<{ id: string; number: number; specs: string }>('SELECT id, number, specs FROM cybercafe_stations WHERE active = true');
  const busy = await query<{ station_id: string }>(
    "SELECT station_id FROM cybercafe_bookings WHERE DATE(start_time) = $1 AND status = 'active'", [date]
  );
  const busyIds = busy.map(r => r.station_id);
  res.json(stations.map(s => ({ ...s, available: !busyIds.includes(s.id) })));
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT cb.*, cs.number as station_number, cd.label as duration_label
     FROM cybercafe_bookings cb JOIN cybercafe_stations cs ON cs.id = cb.station_id
     JOIN cybercafe_durations cd ON cd.id = cb.duration_id
     WHERE cb.user_id = $1 ORDER BY cb.created_at DESC`, [req.user!.id]
  ));
});

// Réservation par créneau horaire (nouveau plan visuel)
router.post('/by-slot', requireAuth, async (req: AuthRequest, res: Response) => {
  const { station_id, date, time_from, time_to, duration_hours, customer_name, game_title } = req.body;
  if (!station_id || !date || !time_from || !time_to) { res.status(400).json({ error: 'station_id, date, time_from, time_to requis' }); return; }
  const station = await queryOne<{ id: string; hourly_rate: number; label: string }>('SELECT id, hourly_rate, label FROM cybercafe_stations WHERE id = $1 AND active = true', [station_id]);
  if (!station) { res.status(404).json({ error: 'Poste introuvable' }); return; }
  const hours = duration_hours ?? 1;
  const total = station.hourly_rate * hours;
  const startTime = new Date(`${date}T${time_from}:00+03:00`).toISOString();
  const endTime   = new Date(`${date}T${time_to}:00+03:00`).toISOString();
  const id = generateId();
  // Trouver un duration_id valide (on prend le premier dispo)
  const defaultDur = await queryOne<{ id: string }>('SELECT id FROM cybercafe_durations ORDER BY active DESC, minutes LIMIT 1');
  if (!defaultDur) { res.status(500).json({ error: 'Aucune durée configurée' }); return; }
  await execute(
    `INSERT INTO cybercafe_bookings (id,user_id,station_id,duration_id,services,duration_price,services_total,total,start_time,end_time,customer_name,status)
     VALUES ($1,$2,$3,$4,'[]',$5,0,$5,$6,$7,$8,'active')`,
    [id, req.user!.id, station_id, defaultDur.id, total, startTime, endTime, customer_name || null]
  );
  if (game_title) {
    await execute(`UPDATE cybercafe_bookings SET customer_phone = $1 WHERE id = $2`, [`jeu:${game_title}`, id]);
  }
  await createNotification(req.user!.id, `🖥️ ${station.label} réservé`, `${date} de ${time_from} à ${time_to} · ${total.toLocaleString()} Ar`, 'booking');
  res.status(201).json({ id, total });
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { station_id, duration_id, services = [], customer_name, customer_phone } = req.body;
  if (!station_id || !duration_id) { res.status(400).json({ error: 'station_id et duration_id requis' }); return; }
  const dur = await queryOne<{ price: number; minutes: number }>('SELECT price, minutes FROM cybercafe_durations WHERE id = $1 AND active = true', [duration_id]);
  if (!dur) { res.status(404).json({ error: 'Durée introuvable' }); return; }
  let servicesTotal = 0;
  if (services.length) {
    const svcRows = await query<{ price: number }>('SELECT price FROM cybercafe_services WHERE id = ANY($1) AND active = true', [services]);
    servicesTotal = svcRows.reduce((s, sv) => s + sv.price, 0);
  }
  const total = dur.price + servicesTotal;
  const startTime = new Date().toISOString();
  const endTime = new Date(Date.now() + dur.minutes * 60000).toISOString();
  const id = generateId();
  await execute(
    'INSERT INTO cybercafe_bookings (id,user_id,station_id,duration_id,services,duration_price,services_total,total,start_time,end_time,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [id, req.user!.id, station_id, duration_id, JSON.stringify(services), dur.price, servicesTotal, total, startTime, endTime, customer_name||null, customer_phone||null]
  );
  const stRow = await queryOne<{ number: number }>('SELECT number FROM cybercafe_stations WHERE id = $1', [station_id]);
  const durRow = await queryOne<{ label: string }>('SELECT label FROM cybercafe_durations WHERE id = $1', [duration_id]);
  await createNotification(req.user!.id, '💻 Session cybercafé démarrée',
    `Poste ${stRow?.number} — ${durRow?.label} — ${total.toLocaleString('fr-FR')} Ar`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM cybercafe_bookings WHERE id = $1', [id]));
});

router.patch('/:id/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string; station_id: string }>('SELECT user_id, station_id FROM cybercafe_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Session introuvable' }); return; }
  await execute("UPDATE cybercafe_bookings SET status = 'completed' WHERE id = $1", [req.params.id]);
  // Notifier le premier utilisateur en liste d'attente pour ce poste
  const waiter = await queryOne<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM cybercafe_waitlist WHERE (station_id = $1 OR station_id IS NULL) AND notified_at IS NULL ORDER BY created_at LIMIT 1',
    [b.station_id]
  );
  if (waiter) {
    await execute('UPDATE cybercafe_waitlist SET notified_at = NOW() WHERE id = $1', [waiter.id]);
    await createNotification(waiter.user_id, '💻 Poste cybercafé disponible !',
      'Un poste s\'est libéré. Connectez-vous vite pour le réserver.', 'success');
  }
  res.json({ success: true });
});

// ── Liste d'attente ───────────────────────────────────────────────────────

router.get('/waitlist', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT cw.*, cs.number as station_number, cs.specs
     FROM cybercafe_waitlist cw
     LEFT JOIN cybercafe_stations cs ON cs.id = cw.station_id
     WHERE cw.user_id = $1 AND cw.notified_at IS NULL
     ORDER BY cw.created_at`,
    [req.user!.id]
  );
  res.json(rows);
});

router.post('/waitlist', requireAuth, async (req: AuthRequest, res: Response) => {
  const { station_id } = req.body;
  // Vérifier pas déjà en liste
  const existing = await queryOne(
    'SELECT id FROM cybercafe_waitlist WHERE user_id = $1 AND (station_id = $2 OR station_id IS NULL) AND notified_at IS NULL',
    [req.user!.id, station_id ?? null]
  );
  if (existing) { res.status(409).json({ error: 'Déjà en liste d\'attente' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO cybercafe_waitlist (id, user_id, station_id) VALUES ($1,$2,$3)',
    [id, req.user!.id, station_id ?? null]
  );
  await createNotification(req.user!.id, '💻 Liste d\'attente',
    station_id ? `En attente du poste sélectionné` : 'En attente de n\'importe quel poste disponible', 'info');
  res.status(201).json({ id, user_id: req.user!.id, station_id: station_id ?? null });
});

router.delete('/waitlist/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const entry = await queryOne<{ user_id: string }>('SELECT user_id FROM cybercafe_waitlist WHERE id = $1', [req.params.id]);
  if (!entry || entry.user_id !== req.user!.id) { res.status(404).json({ error: 'Entrée introuvable' }); return; }
  await execute('DELETE FROM cybercafe_waitlist WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
