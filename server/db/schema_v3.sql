-- ============================================================================
-- ARENAH – Schéma v3 (PostgreSQL)
--
-- Tables ajoutées après schema.pg.sql et patch_v2.sql : elles existaient en base
-- mais n'étaient dans aucun fichier de schéma, donc une installation neuve
-- produisait une base incomplète (Espace Kids, réservation de tables, plan de
-- salle des spectacles, newsletter, paramètres plateforme…).
--
-- Entièrement idempotent : rejouable sans risque sur une base existante.
-- ============================================================================

-- ─── Paramètres plateforme (clé/valeur, lu par server/services/settings.ts) ──
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Configuration par module (tarifs, capacités…) ──────────────────────────
CREATE TABLE IF NOT EXISTS module_config (
  module     TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (module, key)
);

-- ─── Espace Kids ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_ticket_types (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  price          INTEGER NOT NULL,
  duration_hours NUMERIC(4,1) NOT NULL DEFAULT 1,
  per_person     BOOLEAN DEFAULT true,
  active         BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS kids_bookings (
  id             TEXT PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT,
  visit_date     DATE NOT NULL,
  duration       INTEGER DEFAULT 60,
  children_count INTEGER DEFAULT 1,
  notes          TEXT,
  status         TEXT DEFAULT 'pending',
  amount         NUMERIC(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kids_user ON kids_bookings (user_id);

-- ─── Restaurant : plan de salle et réservation de tables ────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  zone     TEXT NOT NULL DEFAULT 'intérieur',
  pos_x    INTEGER DEFAULT 0,
  pos_y    INTEGER DEFAULT 0,
  active   BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS table_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id       UUID NOT NULL REFERENCES restaurant_tables(id),
  user_id        UUID REFERENCES users(id),
  customer_name  TEXT,
  customer_phone TEXT,
  guests         INTEGER NOT NULL DEFAULT 2,
  date           DATE NOT NULL,
  time_from      TEXT NOT NULL,
  time_to        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'confirmed',
  payment_id     UUID,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_table_bookings_date ON table_bookings (date, table_id);

-- ─── Spectacles : plan de salle numéroté ────────────────────────────────────
CREATE TABLE IF NOT EXISTS show_seats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  row_label   TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  category    TEXT NOT NULL DEFAULT 'standard',
  price       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'free',
  booking_id  UUID,
  CONSTRAINT show_seats_show_id_row_label_seat_number_key
    UNIQUE (show_id, row_label, seat_number)
);

-- ─── Gym : séances libres ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gym_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  date          DATE NOT NULL,
  time_from     TEXT NOT NULL,
  time_to       TEXT NOT NULL,
  skill_level   TEXT NOT NULL DEFAULT 'debutant',
  sport         TEXT,
  objective     TEXT,
  customer_name TEXT,
  price         INTEGER NOT NULL DEFAULT 5000,
  status        TEXT NOT NULL DEFAULT 'confirmed',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Salon : formules combinées ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salon_service_combos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  service_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price  INTEGER NOT NULL,
  duration_min INTEGER,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cybercafé : catalogue de jeux PS4 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ps4_games (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title     TEXT NOT NULL,
  genre     TEXT,
  players   INTEGER DEFAULT 1,
  image_url TEXT,
  active    BOOLEAN DEFAULT true
);

-- ─── Newsletter ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active     BOOLEAN DEFAULT true
);

-- ─── Contrainte manquante sur products ──────────────────────────────────────
-- Sans elle, le seed dupliquait tout le catalogue à chaque exécution.
DO $$
BEGIN
  ALTER TABLE products ADD CONSTRAINT products_module_name_key UNIQUE (module, name);
EXCEPTION
  WHEN duplicate_table THEN NULL;   -- contrainte déjà présente
  WHEN duplicate_object THEN NULL;
END $$;
