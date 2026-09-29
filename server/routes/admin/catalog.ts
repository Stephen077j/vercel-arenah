/**
 * ARENAH – Catalogue des offres gérées par l'admin
 *
 *   GET    /api/admin/catalog/:kind       liste (actives et retirées)
 *   POST   /api/admin/catalog/:kind       ajouter une offre
 *   PUT    /api/admin/catalog/:kind/:id   modifier / réactiver
 *   DELETE /api/admin/catalog/:kind/:id   retirer (active=false, jamais supprimée :
 *                                         les réservations passées y font référence)
 *
 * Une seule route pour plusieurs types d'offres. Les tables et colonnes sont
 * fixées ci-dessous (liste blanche) : rien de ce qu'envoie le navigateur n'est
 * inséré tel quel dans le SQL. Chaque admin de module ne gère que son module.
 */
import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne } from '../../db/database.js';
import { requireAdmin, AuthRequest } from '../../middleware/auth.js';

type FieldType = 'text' | 'int' | 'text[]' | 'url';
interface Field { type: FieldType; required?: boolean; max?: number }
interface Catalog {
  module: string;
  table: string;
  textId?: string;             // préfixe si l'identifiant est un texte (sinon UUID généré par la base)
  fields: Record<string, Field>;
  order: string;
}

export const CATALOGS: Record<string, Catalog> = {
  'salon-services': {
    module: 'salon', table: 'salon_services', textId: 'svc', order: 'category, price',
    fields: {
      label: { type: 'text', required: true }, price: { type: 'int', required: true, max: 10_000_000 },
      duration: { type: 'int', required: true, max: 600 }, category: { type: 'text', required: true },
    },
  },
  'salon-hairdressers': {
    module: 'salon', table: 'salon_hairdressers', order: 'name',
    fields: { name: { type: 'text', required: true }, specialty: { type: 'text' } },
  },
  'pool-courses': {
    module: 'pool', table: 'pool_courses', order: 'name',
    fields: {
      name: { type: 'text', required: true }, instructor: { type: 'text' }, slots: { type: 'text[]' },
      price: { type: 'int', required: true, max: 10_000_000 }, max_students: { type: 'int', required: true, max: 200 },
    },
  },
  'cybercafe-durations': {
    module: 'cybercafe', table: 'cybercafe_durations', textId: 'dur', order: 'minutes',
    fields: {
      label: { type: 'text', required: true }, minutes: { type: 'int', required: true, max: 1440 },
      price: { type: 'int', required: true, max: 10_000_000 },
    },
  },
  'cybercafe-services': {
    module: 'cybercafe', table: 'cybercafe_services', textId: 'srv', order: 'price',
    fields: { label: { type: 'text', required: true }, price: { type: 'int', required: true, max: 10_000_000 } },
  },
  'ps4-games': {
    module: 'cybercafe', table: 'ps4_games', order: 'title',
    fields: {
      title: { type: 'text', required: true }, genre: { type: 'text' },
      players: { type: 'int', max: 8 }, image_url: { type: 'url' },
    },
  },
};

const router = Router();
router.use(requireAdmin);

/** Vérifie le type d'offre et que l'admin a la charge de ce module. */
function resolve(req: AuthRequest, res: Response): Catalog | null {
  const catalog = CATALOGS[String(req.params.kind)];
  if (!catalog) { res.status(404).json({ error: 'Type d\'offre inconnu' }); return null; }
  const u = req.user!;
  if (u.role !== 'super_admin' && u.module_assigned !== catalog.module) {
    res.status(403).json({ error: 'Cette offre ne concerne pas votre module' }); return null;
  }
  return catalog;
}

/** Valide et convertit le corps de la requête. Renvoie un message d'erreur ou les valeurs. */
function validate(catalog: Catalog, body: Record<string, unknown>, partial: boolean): string | Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(catalog.fields)) {
    const raw = body[name];
    const empty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    if (empty) {
      if (f.required && !partial) return `Champ obligatoire : ${name}`;
      if (raw !== undefined) values[name] = f.type === 'text[]' ? [] : null;
      continue;
    }
    switch (f.type) {
      case 'int': {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || (f.max !== undefined && n > f.max)) return `Valeur invalide pour ${name}`;
        values[name] = n;
        break;
      }
      case 'text': {
        const s = String(raw).trim();
        if (s.length > 200) return `${name} : 200 caractères maximum`;
        if (f.required && !s) return `Champ obligatoire : ${name}`;
        values[name] = s;
        break;
      }
      case 'url': {
        const s = String(raw).trim();
        if (!/^(https:\/\/|\/uploads\/)/.test(s) || s.length > 500) return `${name} : adresse https:// ou /uploads/ attendue`;
        values[name] = s;
        break;
      }
      case 'text[]': {
        const list = (Array.isArray(raw) ? raw : String(raw).split(','))
          .map(x => String(x).trim()).filter(Boolean);
        if (list.length > 30 || list.some(x => x.length > 40)) return `${name} : liste trop longue`;
        values[name] = list;
        break;
      }
    }
  }
  return values;
}

router.get('/:kind', async (req: AuthRequest, res: Response) => {
  const c = resolve(req, res); if (!c) return;
  res.json(await query(`SELECT * FROM ${c.table} ORDER BY active DESC, ${c.order}`));
});

router.post('/:kind', async (req: AuthRequest, res: Response) => {
  const c = resolve(req, res); if (!c) return;
  const v = validate(c, req.body ?? {}, false);
  if (typeof v === 'string') { res.status(400).json({ error: v }); return; }
  const cols = Object.keys(v);
  const vals = Object.values(v);
  if (c.textId) { cols.unshift('id'); vals.unshift(`${c.textId}-${crypto.randomBytes(4).toString('hex')}`); }
  const row = await queryOne(
    `INSERT INTO ${c.table} (${cols.join(', ')}, active) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}, true) RETURNING *`,
    vals);
  res.status(201).json(row);
});

router.put('/:kind/:id', async (req: AuthRequest, res: Response) => {
  const c = resolve(req, res); if (!c) return;
  const v = validate(c, req.body ?? {}, true);
  if (typeof v === 'string') { res.status(400).json({ error: v }); return; }
  if (typeof req.body?.active === 'boolean') v.active = req.body.active;
  const cols = Object.keys(v);
  if (!cols.length) { res.status(400).json({ error: 'Rien à modifier' }); return; }
  const row = await queryOne(
    `UPDATE ${c.table} SET ${cols.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id::text = $${cols.length + 1} RETURNING *`,
    [...Object.values(v), String(req.params.id)]);
  if (!row) { res.status(404).json({ error: 'Offre introuvable' }); return; }
  res.json(row);
});

router.delete('/:kind/:id', async (req: AuthRequest, res: Response) => {
  const c = resolve(req, res); if (!c) return;
  const row = await queryOne(`UPDATE ${c.table} SET active = false WHERE id::text = $1 RETURNING id`, [String(req.params.id)]);
  if (!row) { res.status(404).json({ error: 'Offre introuvable' }); return; }
  res.json({ success: true });
});

export default router;
