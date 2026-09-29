-- ============================================================
-- ARENAH — PATCH v2
-- Nouveaux créneaux basket + Services Barbier & Ongles
--
-- Appliqué automatiquement par : npm run db:init
--
-- Exécution manuelle, en local :
--   psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f server/db/patch_v2.sql
-- Sur une base managée :
--   psql "$DATABASE_URL" -f server/db/patch_v2.sql
-- ============================================================

-- ─── 1. TERRAIN : ajouter les colonnes manquantes ───────────────────────

ALTER TABLE field_slots ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'foot';
ALTER TABLE field_slots ADD COLUMN IF NOT EXISTS equipment  TEXT;

-- ─── Nouveaux créneaux basket dédiés ────────────────────────────────────

INSERT INTO field_slots (id, label, price, sport_type, equipment) VALUES
  ('basket-07:30', '07h30 – 09h00',  25000, 'basket', 'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-09:30', '09h30 – 11h00',  25000, 'basket', 'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-13:00', '13h00 – 14h30',  30000, 'basket', 'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-15:30', '15h30 – 17h00',  30000, 'basket', 'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-17:30', '17h30 – 19h00',  35000, 'basket', 'Ballons fournis · Paniers réglables · Éclairage inclus')
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  price      = EXCLUDED.price,
  sport_type = EXCLUDED.sport_type,
  equipment  = EXCLUDED.equipment;

-- Remettre les créneaux foot et tennis à jour
INSERT INTO field_slots (id, label, price, sport_type, equipment) VALUES
  ('foot-08:00',  '08h00 – 09h30',  30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-10:00',  '10h00 – 11h30',  30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-14:00',  '14h00 – 15h30',  35000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-18:00',  '18h00 – 19h30',  40000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  ('foot-20:00',  '20h00 – 21h30',  45000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  ('tennis-09:00','09h00 – 10h30',  25000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('tennis-11:00','11h00 – 12h30',  25000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('tennis-16:00','16h00 – 17h30',  30000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('multi-19:30', '19h30 – 21h00',  40000, 'multisport','Équipement complet · Éclairage inclus')
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  price      = EXCLUDED.price,
  sport_type = EXCLUDED.sport_type,
  equipment  = EXCLUDED.equipment;

-- Supprimer les anciens créneaux à IDs courts (08:00, 10:00...) s'ils existent encore
DELETE FROM field_slots WHERE id IN ('08:00','10:00','14:00','16:00','18:00','20:00');

-- ─── 2. SALON : ajouter la colonne catégorie ─────────────────────────────

ALTER TABLE salon_services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'coiffure';

-- Catégoriser les services existants
UPDATE salon_services SET category = 'coiffure' WHERE id IN ('s1','s2','s3','s4','s5','s8','s9','s10');
UPDATE salon_services SET category = 'ongles'   WHERE id IN ('s6','s7');

-- ─── 3. SALON : services Barbier ─────────────────────────────────────────

INSERT INTO salon_services (id, label, price, duration, category) VALUES
  ('b1', 'Coupe + Taille de barbe',    22000,  45, 'barbier'),
  ('b2', 'Taille de barbe seule',      10000,  20, 'barbier'),
  ('b3', 'Rasage à l''ancienne',       18000,  30, 'barbier'),
  ('b4', 'Coupe homme + Rasage',       30000,  60, 'barbier'),
  ('b5', 'Coloration barbe',           12000,  25, 'barbier'),
  ('b6', 'Soin barbe (huile + masque)',  8000,  20, 'barbier')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. SALON : services Ongles & Beauté ─────────────────────────────────

INSERT INTO salon_services (id, label, price, duration, category) VALUES
  ('n1', 'Manucure classique',           15000,  45, 'ongles'),
  ('n2', 'Pédicure classique',           20000,  60, 'ongles'),
  ('n3', 'Pose vernis semi-permanent',   25000,  60, 'ongles'),
  ('n4', 'Pose gel (ongles naturels)',   35000,  75, 'ongles'),
  ('n5', 'Nail art (par ongle)',          3000,  10, 'ongles'),
  ('n6', 'Dépose gel / extension',       15000,  30, 'ongles'),
  ('n7', 'Soin des mains complet',       28000,  60, 'ongles'),
  ('n8', 'Soin des pieds complet',       35000,  75, 'ongles')
ON CONFLICT (id) DO NOTHING;

-- ─── 5. SALON : spécialiste Barbier ──────────────────────────────────────

INSERT INTO salon_hairdressers (id, name, specialty) VALUES
  ('20000000-0000-0000-0000-000000000010', 'Karim Razafi',   'Barbier & coupes hommes'),
  ('20000000-0000-0000-0000-000000000011', 'Lova Andrianony','Manucure & Nail Art')
ON CONFLICT (id) DO NOTHING;

-- ─── Vérification ────────────────────────────────────────────────────────

SELECT 'field_slots' as table_name, sport_type, COUNT(*) as total FROM field_slots GROUP BY sport_type
UNION ALL
SELECT 'salon_services', category, COUNT(*) FROM salon_services GROUP BY category;
