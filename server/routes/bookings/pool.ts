import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { query, queryOne, execute, generateId } from '../../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

// ── Pass ─────────────────────────────────────────────────────────────────

router.get('/pass-types', async (_req: Request, res: Response) => {
  res.json(await query('SELECT * FROM pool_pass_types WHERE active = true ORDER BY price'));
});

router.get('/passes', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT pp.*, pt.label as pass_label FROM pool_passes pp JOIN pool_pass_types pt ON pt.id = pp.pass_type_id WHERE pp.user_id = $1 ORDER BY pp.created_at DESC',
    [req.user!.id]
  ));
});

router.post('/passes', requireAuth, async (req: AuthRequest, res: Response) => {
  const { pass_type_id, customer_name, customer_phone } = req.body;
  if (!pass_type_id) { res.status(400).json({ error: 'pass_type_id requis' }); return; }
  const pt = await queryOne<{ price: number; entries: number; validity_days: number; label: string }>(
    'SELECT price, entries, validity_days, label FROM pool_pass_types WHERE id = $1 AND active = true', [pass_type_id]
  );
  if (!pt) { res.status(404).json({ error: 'Type de pass introuvable' }); return; }
  const expires = new Date(Date.now() + pt.validity_days * 86400000).toISOString().slice(0, 10);
  const id = generateId();
  await execute(
    'INSERT INTO pool_passes (id,user_id,pass_type_id,entries_left,expires_at,price,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, req.user!.id, pass_type_id, pt.entries, expires, pt.price, customer_name||null, customer_phone||null]
  );
  await createNotification(req.user!.id, '🏊 Forfait piscine acheté',
    `${pt.label} — ${pt.entries === 999 ? 'Illimité' : pt.entries + ' entrée(s)'} — expire le ${expires}`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM pool_passes WHERE id = $1', [id]));
});

// QR code pour un pass (PNG base64)
router.get('/passes/:id/qr', requireAuth, async (req: AuthRequest, res: Response) => {
  const pass = await queryOne<{ id: string; user_id: string; entries_left: number; expires_at: string }>(
    'SELECT id, user_id, entries_left, expires_at FROM pool_passes WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (!pass) { res.status(404).json({ error: 'Pass introuvable' }); return; }
  const payload = JSON.stringify({ pass_id: pass.id, entries_left: pass.entries_left, expires_at: pass.expires_at });
  const qr = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
  res.json({ qr_data_url: qr, pass_id: pass.id });
});

router.post('/entry', requireAuth, async (req: AuthRequest, res: Response) => {
  const { pass_id } = req.body;
  const pass = await queryOne<{ id: string; entries_left: number; expires_at: string; user_id: string }>(
    'SELECT id, entries_left, expires_at, user_id FROM pool_passes WHERE id = $1 AND user_id = $2', [pass_id, req.user!.id]
  );
  if (!pass) { res.status(404).json({ error: 'Pass introuvable' }); return; }
  if (pass.entries_left <= 0) { res.status(400).json({ error: 'Plus d\'entrées disponibles' }); return; }
  if (new Date(pass.expires_at) < new Date()) { res.status(400).json({ error: 'Pass expiré' }); return; }
  await execute('UPDATE pool_passes SET entries_left = entries_left - 1 WHERE id = $1', [pass_id]);
  const id = generateId();
  await execute('INSERT INTO pool_entries (id, user_id, pass_id) VALUES ($1,$2,$3)', [id, req.user!.id, pass_id]);
  res.status(201).json({ success: true, entry_id: id });
});

// ── Cours (catalogue DB) ─────────────────────────────────────────────────

router.get('/courses-catalog', async (_req: Request, res: Response) => {
  const courses = await query<{ id: string; name: string; instructor: string | null; slots: string[]; price: number; max_students: number }>(
    'SELECT * FROM pool_courses WHERE active = true ORDER BY name'
  );
  // Pour chaque cours, compter les inscrits par date (jours futurs)
  res.json(courses);
});

// Nombre d'inscrits pour un cours à une date+slot donnés
router.get('/courses-catalog/:id/availability', async (req: Request, res: Response) => {
  const { date, slot } = req.query as Record<string, string>;
  if (!date || !slot) { res.status(400).json({ error: 'date et slot requis' }); return; }
  const course = await queryOne<{ max_students: number }>(
    'SELECT max_students FROM pool_courses WHERE id = $1 AND active = true', [req.params.id]
  );
  if (!course) { res.status(404).json({ error: 'Cours introuvable' }); return; }
  const enrolled = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM pool_course_bookings WHERE course_id = $1 AND date = $2 AND slot = $3 AND status != 'annule'",
    [req.params.id, date, slot]
  );
  const count = Number(enrolled?.n ?? 0);
  res.json({ max_students: course.max_students, enrolled: count, available: count < course.max_students });
});

// Admin : CRUD cours
// Réservé à l'admin piscine : les autres admins de module n'ont pas à modifier les cours
function poolAdminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user!.role === 'super_admin' || req.user!.module_assigned === 'pool') { next(); return; }
  res.status(403).json({ error: 'Réservé à l\'administrateur de la piscine' });
}

router.get('/courses-admin', requireAdmin, poolAdminOnly, async (_req: Request, res: Response) => {
  res.json(await query('SELECT * FROM pool_courses ORDER BY name'));
});

router.post('/courses-admin', requireAdmin, poolAdminOnly, async (req: Request, res: Response) => {
  const { name, instructor, slots, price, max_students } = req.body;
  if (!name || !price) { res.status(400).json({ error: 'name et price requis' }); return; }
  const id = generateId();
  await execute(
    'INSERT INTO pool_courses (id,name,instructor,slots,price,max_students) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, name, instructor||null, slots||[], price, max_students||10]
  );
  res.status(201).json(await queryOne('SELECT * FROM pool_courses WHERE id = $1', [id]));
});

router.patch('/courses-admin/:id', requireAdmin, poolAdminOnly, async (req: Request, res: Response) => {
  const { name, instructor, slots, price, max_students, active } = req.body;
  await execute(
    'UPDATE pool_courses SET name=COALESCE($1,name), instructor=COALESCE($2,instructor), slots=COALESCE($3,slots), price=COALESCE($4,price), max_students=COALESCE($5,max_students), active=COALESCE($6,active) WHERE id=$7',
    [name??null, instructor??null, slots??null, price??null, max_students??null, active??null, req.params.id]
  );
  res.json({ success: true });
});

// ── Réservation cours ─────────────────────────────────────────────────────

router.get('/courses', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    `SELECT pcb.*, pc.name as course_name_ref, pc.instructor as instructor_ref
     FROM pool_course_bookings pcb
     LEFT JOIN pool_courses pc ON pc.id = pcb.course_id
     WHERE pcb.user_id = $1 ORDER BY pcb.created_at DESC`,
    [req.user!.id]
  ));
});

router.post('/courses', requireAuth, async (req: AuthRequest, res: Response) => {
  const { course_id, date, slot, customer_name, customer_phone } = req.body;
  if (!course_id || !date || !slot) { res.status(400).json({ error: 'course_id, date et slot requis' }); return; }

  const course = await queryOne<{ name: string; instructor: string | null; price: number; max_students: number; slots: string[] }>(
    'SELECT name, instructor, price, max_students, slots FROM pool_courses WHERE id = $1 AND active = true', [course_id]
  );
  if (!course) { res.status(404).json({ error: 'Cours introuvable' }); return; }
  if (!course.slots.includes(slot)) { res.status(400).json({ error: 'Créneau horaire invalide pour ce cours' }); return; }

  // Vérifier limite de places
  const enrolled = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM pool_course_bookings WHERE course_id = $1 AND date = $2 AND slot = $3 AND status != 'annule'",
    [course_id, date, slot]
  );
  if (Number(enrolled?.n ?? 0) >= course.max_students) {
    res.status(409).json({ error: 'Ce cours est complet pour cette séance' }); return;
  }

  // Pas de double réservation
  const dup = await queryOne(
    "SELECT id FROM pool_course_bookings WHERE user_id = $1 AND course_id = $2 AND date = $3 AND slot = $4 AND status != 'annule'",
    [req.user!.id, course_id, date, slot]
  );
  if (dup) { res.status(409).json({ error: 'Vous êtes déjà inscrit à ce cours' }); return; }

  const id = generateId();
  await execute(
    'INSERT INTO pool_course_bookings (id,user_id,course_id,course_name,instructor,date,slot,price,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, req.user!.id, course_id, course.name, course.instructor||null, date, slot, course.price, customer_name||null, customer_phone||null]
  );
  await createNotification(req.user!.id, '🌊 Cours piscine réservé',
    `${course.name}${course.instructor ? ' avec ' + course.instructor : ''} — ${date} à ${slot}`, 'success');
  res.status(201).json(await queryOne('SELECT * FROM pool_course_bookings WHERE id = $1', [id]));
});

router.patch('/courses/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const b = await queryOne<{ user_id: string }>('SELECT user_id FROM pool_course_bookings WHERE id = $1', [req.params.id]);
  if (!b || b.user_id !== req.user!.id) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
  await execute("UPDATE pool_course_bookings SET status = 'annule', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// ── Entrée piscine (tarifs depuis module_config) ──

async function getPoolPricing() {
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM module_config WHERE module='pool' AND key IN ('tarif_entree','tarif_accompagnant')`
  );
  const map = Object.fromEntries(rows.map(r => [r.key, Number(r.value)]));
  return { entry: map['tarif_entree'] ?? 5000, companion: map['tarif_accompagnant'] ?? 2000 };
}

router.post('/entries', requireAuth, async (req: AuthRequest, res: Response) => {
  const { companion_count = 0, customer_name } = req.body;
  const { entry, companion } = await getPoolPricing();
  const total_price = entry + Number(companion_count) * companion;
  const id = generateId();
  await execute(
    `INSERT INTO pool_entries (id, user_id, pass_id, entered_at, companion_count, total_price, customer_name, status)
     VALUES ($1,$2,NULL,NOW(),$3,$4,$5,'active')`,
    [id, req.user!.id, companion_count, total_price, customer_name || null]
  );
  await createNotification(req.user!.id, '🏊 Entrée piscine', `${companion_count > 0 ? companion_count + ' accompagnant(s) · ' : ''}Total: ${total_price.toLocaleString()} Ar`, 'booking');
  res.status(201).json({ id, total_price, companion_count });
});

router.get('/entries/price', async (req: Request, res: Response) => {
  const companions = parseInt(String(req.query.companions ?? 0));
  const { entry, companion } = await getPoolPricing();
  res.json({ entry, companion, total: entry + companions * companion });
});

export default router;
