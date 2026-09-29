/**
 * Routes de configuration des modules par l'admin
 * POST/PUT/DELETE tables restaurant, stations cybercafé, sièges spectacle, combos salon
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Middleware module ──────────────────────────────────────────
function allowedModule(module: string) {
  return (req: AuthRequest, res: Response, next: () => void) => {
    const u = req.user!;
    if (u.role === 'super_admin' || u.module_assigned === module) { next(); return; }
    res.status(403).json({ error: `Accès réservé à l'admin du module ${module}` });
  };
}

/* ═══════════════════════════════════════════════════════════════
   RESTAURANT — Tables
═══════════════════════════════════════════════════════════════ */

router.get('/restaurant/tables', allowedModule('restaurant'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM restaurant_tables ORDER BY zone, name'));
});

router.post('/restaurant/tables', allowedModule('restaurant'), async (req: Request, res: Response) => {
  const { name, capacity, zone } = req.body;
  if (!name || !capacity || !zone) { res.status(400).json({ error: 'name, capacity, zone requis' }); return; }
  if (!['intérieur', 'terrasse'].includes(zone)) { res.status(400).json({ error: 'zone: intérieur ou terrasse' }); return; }
  if (Number(capacity) < 1 || Number(capacity) > 20) { res.status(400).json({ error: 'capacity: 1–20' }); return; }
  const dup = await queryOne('SELECT id FROM restaurant_tables WHERE name = $1', [name]);
  if (dup) { res.status(409).json({ error: 'Une table avec ce nom existe déjà' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO restaurant_tables (id, name, capacity, zone, pos_x, pos_y) VALUES ($1,$2,$3,$4,0,0)',
    [id, name.trim(), Number(capacity), zone]
  );
  res.status(201).json(await queryOne('SELECT * FROM restaurant_tables WHERE id = $1', [id]));
});

router.put('/restaurant/tables/:id', allowedModule('restaurant'), async (req: Request, res: Response) => {
  const { name, capacity, zone } = req.body;
  const t = await queryOne<{ id: string }>('SELECT id FROM restaurant_tables WHERE id = $1', [req.params.id]);
  if (!t) { res.status(404).json({ error: 'Table introuvable' }); return; }
  await execute(
    'UPDATE restaurant_tables SET name=$1, capacity=$2, zone=$3 WHERE id=$4',
    [name, Number(capacity), zone, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM restaurant_tables WHERE id = $1', [req.params.id]));
});

router.delete('/restaurant/tables/:id', allowedModule('restaurant'), async (req: Request, res: Response) => {
  await execute('DELETE FROM restaurant_tables WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════════
   CYBERCAFÉ — Stations
═══════════════════════════════════════════════════════════════ */

router.get('/cybercafe/stations', allowedModule('cybercafe'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM cybercafe_stations ORDER BY station_type, number'));
});

router.post('/cybercafe/stations', allowedModule('cybercafe'), async (req: Request, res: Response) => {
  const { label, station_type, specs, hourly_rate } = req.body;
  if (!label || !station_type) { res.status(400).json({ error: 'label, station_type requis' }); return; }
  if (!['pc', 'ps4', 'billard'].includes(station_type)) { res.status(400).json({ error: 'station_type: pc | ps4 | billard' }); return; }
  const maxNum = await queryOne<{ m: number }>('SELECT COALESCE(MAX(number),0) as m FROM cybercafe_stations');
  const id = generateId();
  await execute(
    'INSERT INTO cybercafe_stations (id, number, label, station_type, specs, hourly_rate, active) VALUES ($1,$2,$3,$4,$5,$6,true)',
    [id, Number(maxNum?.m ?? 0) + 1, label.trim(), station_type, specs || null, Number(hourly_rate) || 2000]
  );
  res.status(201).json(await queryOne('SELECT * FROM cybercafe_stations WHERE id = $1', [id]));
});

router.put('/cybercafe/stations/:id', allowedModule('cybercafe'), async (req: Request, res: Response) => {
  const { label, station_type, specs, hourly_rate, active } = req.body;
  await execute(
    'UPDATE cybercafe_stations SET label=$1, station_type=$2, specs=$3, hourly_rate=$4, active=$5 WHERE id=$6',
    [label, station_type, specs || null, Number(hourly_rate), active !== false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM cybercafe_stations WHERE id = $1', [req.params.id]));
});

router.delete('/cybercafe/stations/:id', allowedModule('cybercafe'), async (req: Request, res: Response) => {
  const hasBookings = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int as n FROM cybercafe_bookings WHERE station_id=$1 AND end_time > NOW()`, [req.params.id]
  );
  if (Number(hasBookings?.n) > 0) {
    await execute('UPDATE cybercafe_stations SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true, note: 'Station désactivée (réservations actives existantes)' });
  } else {
    await execute('DELETE FROM cybercafe_stations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SPECTACLES — Sièges par show
═══════════════════════════════════════════════════════════════ */

router.get('/shows', allowedModule('spectacles'), async (_req, res: Response) => {
  res.json(await query('SELECT id, title, date, venue, active FROM shows ORDER BY date DESC'));
});

router.get('/shows/:showId/seats', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const seats = await query('SELECT * FROM show_seats WHERE show_id=$1 ORDER BY row_label, seat_number', [req.params.showId]);
  res.json(seats);
});

// Ajouter une rangée de sièges
router.post('/shows/:showId/seats/row', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const { row_label, seat_count = 10, category, price } = req.body;
  if (!row_label || !category || !price) { res.status(400).json({ error: 'row_label, category, price requis' }); return; }
  const show = await queryOne<{ id: string; base_price: number }>('SELECT id, base_price FROM shows WHERE id=$1', [req.params.showId]);
  if (!show) { res.status(404).json({ error: 'Spectacle introuvable' }); return; }
  const existing = await queryOne<{ n: number }>('SELECT COUNT(*)::int as n FROM show_seats WHERE show_id=$1 AND row_label=$2', [show.id, row_label]);
  if (Number(existing?.n) > 0) { res.status(409).json({ error: `Rangée ${row_label} déjà existante` }); return; }
  const count = Math.min(Math.max(1, Number(seat_count)), 30);
  const ids: string[] = [];
  for (let s = 1; s <= count; s++) {
    const id = generateId();
    await execute(
      `INSERT INTO show_seats (id, show_id, row_label, seat_number, category, price, status) VALUES ($1,$2,$3,$4,$5,$6,'free') ON CONFLICT DO NOTHING`,
      [id, show.id, row_label.toUpperCase(), s, category, Number(price)]
    );
    ids.push(id);
  }
  res.status(201).json({ created: ids.length, row: row_label, seats: count });
});

// Modifier un siège (bloquer/activer/changer prix/catégorie)
router.put('/shows/seats/:seatId', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const { status, price, category } = req.body;
  if (status && !['free', 'blocked'].includes(status)) {
    res.status(400).json({ error: 'status: free | blocked (seuls les sièges non-réservés peuvent être modifiés)' }); return;
  }
  const seat = await queryOne<{ status: string }>('SELECT status FROM show_seats WHERE id=$1', [req.params.seatId]);
  if (!seat) { res.status(404).json({ error: 'Siège introuvable' }); return; }
  if (seat.status === 'booked') { res.status(409).json({ error: 'Siège déjà réservé — impossible à modifier' }); return; }
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (status)   { updates.push(`status=$${vals.push(status)}`); }
  if (price)    { updates.push(`price=$${vals.push(Number(price))}`); }
  if (category) { updates.push(`category=$${vals.push(category)}`); }
  if (updates.length === 0) { res.status(400).json({ error: 'Rien à modifier' }); return; }
  vals.push(req.params.seatId);
  await execute(`UPDATE show_seats SET ${updates.join(',')} WHERE id=$${vals.length}`, vals as (string|number)[]);
  res.json(await queryOne('SELECT * FROM show_seats WHERE id=$1', [req.params.seatId]));
});

// Supprimer tous les sièges libres d'une rangée
router.delete('/shows/:showId/seats/row/:rowLabel', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const result = await query<{ id: string }>(
    `SELECT id FROM show_seats WHERE show_id=$1 AND row_label=$2 AND status != 'booked'`, [req.params.showId, req.params.rowLabel]
  );
  if (result.length === 0) { res.status(404).json({ error: 'Aucun siège libre dans cette rangée' }); return; }
  await execute(
    `DELETE FROM show_seats WHERE show_id=$1 AND row_label=$2 AND status != 'booked'`, [req.params.showId, req.params.rowLabel]
  );
  res.json({ deleted: result.length });
});

/* ═══════════════════════════════════════════════════════════════
   SALON — Combos services composés
═══════════════════════════════════════════════════════════════ */

router.get('/salon/services', allowedModule('salon'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM salon_services ORDER BY label'));
});

router.get('/salon/combos', allowedModule('salon'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM salon_service_combos ORDER BY name'));
});

router.post('/salon/combos', allowedModule('salon'), async (req: Request, res: Response) => {
  const { name, description, service_ids, total_price, duration_min } = req.body;
  if (!name || !Array.isArray(service_ids) || service_ids.length === 0 || !total_price) {
    res.status(400).json({ error: 'name, service_ids (array), total_price requis' }); return;
  }
  const id = generateId();
  await execute(
    'INSERT INTO salon_service_combos (id,name,description,service_ids,total_price,duration_min,active) VALUES ($1,$2,$3,$4,$5,$6,true)',
    [id, name.trim(), description||null, JSON.stringify(service_ids), Number(total_price), duration_min ? Number(duration_min) : null]
  );
  res.status(201).json(await queryOne('SELECT * FROM salon_service_combos WHERE id=$1', [id]));
});

router.put('/salon/combos/:id', allowedModule('salon'), async (req: Request, res: Response) => {
  const { name, description, service_ids, total_price, duration_min, active } = req.body;
  await execute(
    'UPDATE salon_service_combos SET name=$1, description=$2, service_ids=$3, total_price=$4, duration_min=$5, active=$6 WHERE id=$7',
    [name, description||null, JSON.stringify(service_ids), Number(total_price), duration_min||null, active!==false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM salon_service_combos WHERE id=$1', [req.params.id]));
});

router.delete('/salon/combos/:id', allowedModule('salon'), async (req: Request, res: Response) => {
  await execute('UPDATE salon_service_combos SET active=false WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════════
   HÔTEL — Chambres
═══════════════════════════════════════════════════════════════ */

router.get('/hotel/rooms', allowedModule('hotel'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM hotel_rooms ORDER BY type, price_per_night'));
});

router.post('/hotel/rooms', allowedModule('hotel'), async (req: Request, res: Response) => {
  const { name, type, price_per_night, capacity, description, amenities } = req.body;
  if (!name?.trim() || !type?.trim() || !price_per_night) { res.status(400).json({ error: 'name, type, price requis' }); return; }
  const amenitiesArr = Array.isArray(amenities) ? amenities : [];
  const room = await queryOne(
    `INSERT INTO hotel_rooms (name, type, price_per_night, capacity, description, amenities, active)
     VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
    [name.trim(), type.trim(), Number(price_per_night), Number(capacity)||2, description||null, JSON.stringify(amenitiesArr)]
  );
  res.json(room);
});

router.put('/hotel/rooms/:id', allowedModule('hotel'), async (req: Request, res: Response) => {
  const { name, type, price_per_night, capacity, description, amenities, active } = req.body;
  const amenitiesArr = Array.isArray(amenities) ? amenities : [];
  await execute(
    `UPDATE hotel_rooms SET name=$1, type=$2, price_per_night=$3, capacity=$4, description=$5, amenities=$6, active=$7 WHERE id=$8`,
    [name, type, Number(price_per_night), Number(capacity)||2, description||null, JSON.stringify(amenitiesArr), active!==false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM hotel_rooms WHERE id=$1', [req.params.id]));
});

router.delete('/hotel/rooms/:id', allowedModule('hotel'), async (req: Request, res: Response) => {
  const bookings = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM hotel_bookings WHERE room_id=$1 AND check_out > NOW() AND status NOT IN ('annulee','cancelled')`,
    [req.params.id]
  );
  if (Number(bookings?.count) > 0) {
    await execute('UPDATE hotel_rooms SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true, note: 'Chambre désactivée (réservations en cours)' });
  } else {
    await execute('DELETE FROM hotel_rooms WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GYM — Plans d'abonnement + Coachs
═══════════════════════════════════════════════════════════════ */

router.get('/gym/plans', allowedModule('gym'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM gym_plans WHERE active=true ORDER BY days'));
});

router.post('/gym/plans', allowedModule('gym'), async (req: Request, res: Response) => {
  const { label, price, days } = req.body;
  if (!label?.trim() || !price || !days) { res.status(400).json({ error: 'label, price, days requis' }); return; }
  const id = label.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const plan = await queryOne(
    'INSERT INTO gym_plans (id, label, price, days, active) VALUES ($1,$2,$3,$4,true) RETURNING *',
    [id, label.trim(), Number(price), Number(days)]
  );
  res.json(plan);
});

router.put('/gym/plans/:id', allowedModule('gym'), async (req: Request, res: Response) => {
  const { label, price, days } = req.body;
  await execute('UPDATE gym_plans SET label=$1, price=$2, days=$3 WHERE id=$4', [label, Number(price), Number(days), req.params.id]);
  res.json(await queryOne('SELECT * FROM gym_plans WHERE id=$1', [req.params.id]));
});

router.delete('/gym/plans/:id', allowedModule('gym'), async (req: Request, res: Response) => {
  await execute('UPDATE gym_plans SET active=false WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

router.get('/gym/coaches', allowedModule('gym'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM gym_coaches ORDER BY name'));
});

router.post('/gym/coaches', allowedModule('gym'), async (req: Request, res: Response) => {
  const { name, specialty, hour_price } = req.body;
  if (!name?.trim() || !hour_price) { res.status(400).json({ error: 'name, hour_price requis' }); return; }
  const coach = await queryOne(
    'INSERT INTO gym_coaches (name, specialty, hour_price, active) VALUES ($1,$2,$3,true) RETURNING *',
    [name.trim(), specialty||null, Number(hour_price)]
  );
  res.json(coach);
});

router.put('/gym/coaches/:id', allowedModule('gym'), async (req: Request, res: Response) => {
  const { name, specialty, hour_price, active } = req.body;
  await execute('UPDATE gym_coaches SET name=$1, specialty=$2, hour_price=$3, active=$4 WHERE id=$5',
    [name, specialty||null, Number(hour_price), active!==false, req.params.id]);
  res.json(await queryOne('SELECT * FROM gym_coaches WHERE id=$1', [req.params.id]));
});

router.delete('/gym/coaches/:id', allowedModule('gym'), async (req: Request, res: Response) => {
  await execute('UPDATE gym_coaches SET active=false WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════════
   PISCINE — Pass types + tarifs entrée
═══════════════════════════════════════════════════════════════ */

router.get('/pool/pass-types', allowedModule('pool'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM pool_pass_types ORDER BY validity_days'));
});

router.post('/pool/pass-types', allowedModule('pool'), async (req: Request, res: Response) => {
  const { label, entries, validity_days, price } = req.body;
  if (!label?.trim() || !entries || !validity_days || !price) { res.status(400).json({ error: 'Tous les champs requis' }); return; }
  const id = label.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const pt = await queryOne(
    'INSERT INTO pool_pass_types (id, label, entries, validity_days, price, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
    [id, label.trim(), Number(entries), Number(validity_days), Number(price)]
  );
  res.json(pt);
});

router.put('/pool/pass-types/:id', allowedModule('pool'), async (req: Request, res: Response) => {
  const { label, entries, validity_days, price, active } = req.body;
  await execute('UPDATE pool_pass_types SET label=$1, entries=$2, validity_days=$3, price=$4, active=$5 WHERE id=$6',
    [label, Number(entries), Number(validity_days), Number(price), active!==false, req.params.id]);
  res.json(await queryOne('SELECT * FROM pool_pass_types WHERE id=$1', [req.params.id]));
});

router.delete('/pool/pass-types/:id', allowedModule('pool'), async (req: Request, res: Response) => {
  await execute('UPDATE pool_pass_types SET active=false WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════════
   TERRAIN — Créneaux horaires
═══════════════════════════════════════════════════════════════ */

router.get('/field/slots', allowedModule('field'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM field_slots ORDER BY sport_type, label'));
});

router.post('/field/slots', allowedModule('field'), async (req: Request, res: Response) => {
  const { label, price, sport_type, equipment } = req.body;
  if (!label?.trim() || !price || !sport_type?.trim()) { res.status(400).json({ error: 'label, price, sport_type requis' }); return; }
  const id = sport_type.trim().toLowerCase() + '-' + label.trim().replace(/[^0-9h]/gi,'').toLowerCase() + '-' + Date.now();
  const slot = await queryOne(
    'INSERT INTO field_slots (id, label, price, sport_type, equipment, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
    [id, label.trim(), Number(price), sport_type.trim(), equipment||null]
  );
  res.json(slot);
});

router.put('/field/slots/:id', allowedModule('field'), async (req: Request, res: Response) => {
  const { label, price, sport_type, equipment, active } = req.body;
  await execute('UPDATE field_slots SET label=$1, price=$2, sport_type=$3, equipment=$4, active=$5 WHERE id=$6',
    [label, Number(price), sport_type, equipment||null, active!==false, req.params.id]);
  res.json(await queryOne('SELECT * FROM field_slots WHERE id=$1', [req.params.id]));
});

router.delete('/field/slots/:id', allowedModule('field'), async (req: Request, res: Response) => {
  const bookings = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM field_bookings WHERE slot_id=$1 AND date >= CURRENT_DATE AND status NOT IN ('annulee','cancelled')`,
    [req.params.id]
  );
  if (Number(bookings?.count) > 0) {
    await execute('UPDATE field_slots SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true, note: 'Créneau désactivé (réservations en cours)' });
  } else {
    await execute('DELETE FROM field_slots WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ÉVÉNEMENTS — Salles + Options
═══════════════════════════════════════════════════════════════ */

router.get('/event/halls', allowedModule('event'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM event_halls ORDER BY capacity'));
});

router.post('/event/halls', allowedModule('event'), async (req: Request, res: Response) => {
  const { name, capacity, base_price, desc } = req.body;
  if (!name?.trim() || !capacity || !base_price) { res.status(400).json({ error: 'name, capacity, base_price requis' }); return; }
  const id = 'h-' + name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now();
  const hall = await queryOne(
    'INSERT INTO event_halls (id, name, capacity, base_price, desc, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
    [id, name.trim(), Number(capacity), Number(base_price), desc||null]
  );
  res.json(hall);
});

router.put('/event/halls/:id', allowedModule('event'), async (req: Request, res: Response) => {
  const { name, capacity, base_price, desc, active } = req.body;
  await execute('UPDATE event_halls SET name=$1, capacity=$2, base_price=$3, desc=$4, active=$5 WHERE id=$6',
    [name, Number(capacity), Number(base_price), desc||null, active!==false, req.params.id]);
  res.json(await queryOne('SELECT * FROM event_halls WHERE id=$1', [req.params.id]));
});

router.delete('/event/halls/:id', allowedModule('event'), async (req: Request, res: Response) => {
  const bookings = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM event_bookings WHERE hall_id=$1 AND event_date >= CURRENT_DATE AND status NOT IN ('annulee','cancelled')`,
    [req.params.id]
  );
  if (Number(bookings?.count) > 0) {
    await execute('UPDATE event_halls SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true, note: 'Salle désactivée (événements planifiés)' });
  } else {
    await execute('DELETE FROM event_halls WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  }
});

router.get('/event/options', allowedModule('event'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM event_options ORDER BY label'));
});

router.post('/event/options', allowedModule('event'), async (req: Request, res: Response) => {
  const { label, price } = req.body;
  if (!label?.trim() || !price) { res.status(400).json({ error: 'label, price requis' }); return; }
  const id = 'opt-' + label.trim().toLowerCase().replace(/\s+/g,'-') + '-' + Date.now();
  const opt = await queryOne(
    'INSERT INTO event_options (id, label, price, active) VALUES ($1,$2,$3,true) RETURNING *',
    [id, label.trim(), Number(price)]
  );
  res.json(opt);
});

router.put('/event/options/:id', allowedModule('event'), async (req: Request, res: Response) => {
  const { label, price, active } = req.body;
  await execute('UPDATE event_options SET label=$1, price=$2, active=$3 WHERE id=$4',
    [label, Number(price), active!==false, req.params.id]);
  res.json(await queryOne('SELECT * FROM event_options WHERE id=$1', [req.params.id]));
});

router.delete('/event/options/:id', allowedModule('event'), async (req: Request, res: Response) => {
  await execute('DELETE FROM event_options WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════════
   BOUTIQUE — Produits + Catégories
═══════════════════════════════════════════════════════════════ */

router.get('/boutique/products', allowedModule('boutique'), async (_req, res: Response) => {
  res.json(await query(`SELECT * FROM products WHERE module='boutique' ORDER BY category, name`));
});

router.post('/boutique/products', allowedModule('boutique'), async (req: Request, res: Response) => {
  const { name, description, price, category, stock } = req.body;
  if (!name?.trim() || !price) { res.status(400).json({ error: 'name, price requis' }); return; }
  const product = await queryOne(
    `INSERT INTO products (name, description, price, category, stock, module, active)
     VALUES ($1,$2,$3,$4,$5,'boutique',true) RETURNING *`,
    [name.trim(), description||null, Number(price), category||null, Number(stock)||0]
  );
  res.json(product);
});

router.put('/boutique/products/:id', allowedModule('boutique'), async (req: Request, res: Response) => {
  const { name, description, price, category, stock, active } = req.body;
  await execute(
    `UPDATE products SET name=$1, description=$2, price=$3, category=$4, stock=$5, active=$6, updated_at=NOW() WHERE id=$7 AND module='boutique'`,
    [name, description||null, Number(price), category||null, Number(stock)||0, active!==false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM products WHERE id=$1', [req.params.id]));
});

router.delete('/boutique/products/:id', allowedModule('boutique'), async (req: Request, res: Response) => {
  await execute(`UPDATE products SET active=false WHERE id=$1 AND module='boutique'`, [req.params.id]);
  res.json({ success: true });
});

router.get('/boutique/categories', allowedModule('boutique'), async (_req, res: Response) => {
  const rows = await query<{ category: string }>(
    `SELECT DISTINCT category FROM products WHERE module='boutique' AND category IS NOT NULL ORDER BY category`
  );
  res.json(rows.map(r => r.category));
});

/* ═══════════════════════════════════════════════════════════════
   CONFIG PAR MODULE (tarifs, paramètres dynamiques)
═══════════════════════════════════════════════════════════════ */

// Lecture config d'un module (accessible à l'admin du module + super_admin)
async function getModuleConfig(module: string): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>(
    'SELECT key, value FROM module_config WHERE module=$1', [module]
  );
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function setModuleConfig(module: string, key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO module_config (module, key, value, updated_at) VALUES ($1,$2,$3,NOW())
     ON CONFLICT (module, key) DO UPDATE SET value=$3, updated_at=NOW()`,
    [module, key, value]
  );
}

// GET config d'un module
router.get('/:module/config', async (req: AuthRequest, res: Response) => {
  const mod = String(req.params['module']);
  const u = req.user!;
  if (u.role !== 'super_admin' && u.module_assigned !== mod) {
    res.status(403).json({ error: 'Accès interdit' }); return;
  }
  res.json(await getModuleConfig(mod));
});

// PUT config d'un module (body: { key, value })
router.put('/:module/config', async (req: AuthRequest, res: Response) => {
  const mod = String(req.params['module']);
  const u = req.user!;
  if (u.role !== 'super_admin' && u.module_assigned !== mod) {
    res.status(403).json({ error: 'Accès interdit' }); return;
  }
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await setModuleConfig(mod, key, String(value));
  }
  res.json(await getModuleConfig(mod));
});

/* ═══════════════════════════════════════════════════════════════
   SPECTACLES — CRUD des shows
═══════════════════════════════════════════════════════════════ */

router.get('/shows/list', allowedModule('spectacles'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM shows ORDER BY date DESC'));
});

router.post('/shows/create', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const { title, artist, date, time, venue, category, base_price, description, image_url } = req.body;
  if (!title?.trim() || !date || !time?.trim() || !venue?.trim() || !base_price) {
    res.status(400).json({ error: 'title, date, time, venue, base_price requis' }); return;
  }
  const show = await queryOne(
    `INSERT INTO shows (title, artist, date, time, venue, category, base_price, description, image_url, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING *`,
    [title.trim(), artist||null, date, time.trim(), venue.trim(), category||null, Number(base_price), description||null, image_url||null]
  );
  res.json(show);
});

router.put('/shows/:id/update', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const { title, artist, date, time, venue, category, base_price, description, image_url, active } = req.body;
  await execute(
    `UPDATE shows SET title=$1, artist=$2, date=$3, time=$4, venue=$5, category=$6, base_price=$7, description=$8, image_url=$9, active=$10 WHERE id=$11`,
    [title, artist||null, date, time, venue, category||null, Number(base_price), description||null, image_url||null, active!==false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM shows WHERE id=$1', [req.params.id]));
});

router.delete('/shows/:id/delete', allowedModule('spectacles'), async (req: Request, res: Response) => {
  const bookings = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM show_bookings WHERE show_id=$1`, [req.params.id]
  );
  if (Number(bookings?.count) > 0) {
    await execute('UPDATE shows SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true, note: 'Spectacle désactivé (billets vendus)' });
  } else {
    await execute('DELETE FROM show_seats WHERE show_id=$1', [req.params.id]);
    await execute('DELETE FROM shows WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ESPACE ENFANTS — Tarifs (kids_ticket_types)
═══════════════════════════════════════════════════════════════ */

router.get('/kids/ticket-types', allowedModule('kids'), async (_req, res: Response) => {
  res.json(await query('SELECT * FROM kids_ticket_types ORDER BY price'));
});

router.post('/kids/ticket-types', allowedModule('kids'), async (req: Request, res: Response) => {
  const { label, price, duration_hours, per_person } = req.body;
  if (!label?.trim() || !price) { res.status(400).json({ error: 'label et price requis' }); return; }
  const id = 'ticket-' + Date.now();
  const tt = await queryOne(
    'INSERT INTO kids_ticket_types (id, label, price, duration_hours, per_person, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
    [id, label.trim(), Number(price), Number(duration_hours)||1, per_person!==false]
  );
  res.json(tt);
});

router.put('/kids/ticket-types/:id', allowedModule('kids'), async (req: Request, res: Response) => {
  const { label, price, duration_hours, per_person, active } = req.body;
  await execute(
    'UPDATE kids_ticket_types SET label=$1, price=$2, duration_hours=$3, per_person=$4, active=$5 WHERE id=$6',
    [label, Number(price), Number(duration_hours)||1, per_person!==false, active!==false, req.params.id]
  );
  res.json(await queryOne('SELECT * FROM kids_ticket_types WHERE id=$1', [req.params.id]));
});

router.delete('/kids/ticket-types/:id', allowedModule('kids'), async (req: Request, res: Response) => {
  await execute('UPDATE kids_ticket_types SET active=false WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
