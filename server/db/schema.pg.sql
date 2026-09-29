-- ARENAH – Schéma PostgreSQL complet
-- Local dev ET production Supabase (même fichier)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ROLES & UTILISATEURS
-- ============================================

CREATE TABLE IF NOT EXISTS app_roles (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

INSERT INTO app_roles (name, description) VALUES
  ('super_admin',  'Administrateur système'),
  ('admin_module', 'Administrateur de module'),
  ('caissier',     'Caissier'),
  ('proprietaire', 'Propriétaire (tableau de bord financier)'),
  ('client',       'Client')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  fullname      TEXT,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  role             TEXT NOT NULL DEFAULT 'client' REFERENCES app_roles(name),
  module_assigned  TEXT,             -- pour admin_module: boutique|restaurant|hotel|gym|salon|field|pool|event|spectacles|cybercafe
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS client_profiles (
  id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio        TEXT,
  address    TEXT,
  city       TEXT,
  zipcode    TEXT,
  country    TEXT DEFAULT 'Madagascar',
  verified   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUITS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL DEFAULT 0,
  category    TEXT,
  image_url   TEXT,
  stock       INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT products_module_name_key UNIQUE (module, name)
);

CREATE INDEX IF NOT EXISTS idx_products_module ON products(module);

-- ============================================
-- PANIER & COMMANDES
-- ============================================

CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  module         TEXT NOT NULL DEFAULT 'boutique',
  type           TEXT NOT NULL DEFAULT 'boutique',
  mode           TEXT NOT NULL DEFAULT 'retrait',
  total          INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'en_attente',
  address        TEXT,
  notes          TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  paid           BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  note       TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================
-- HÔTEL
-- ============================================

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  price_per_night INTEGER NOT NULL,
  capacity        INTEGER NOT NULL DEFAULT 2,
  description     TEXT,
  amenities       JSONB,
  image_url       TEXT,
  active          BOOLEAN DEFAULT true
);

INSERT INTO hotel_rooms (id, name, type, price_per_night, capacity) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Chambre Standard',   'standard',   180000, 2),
  ('00000000-0000-0000-0000-000000000002', 'Chambre Supérieure', 'superieure', 260000, 2),
  ('00000000-0000-0000-0000-000000000003', 'Chambre Familiale',  'familiale',  340000, 4),
  ('00000000-0000-0000-0000-000000000004', 'Suite Vue Mer',      'suite',      480000, 2)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  room_id         UUID NOT NULL REFERENCES hotel_rooms(id),
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  nights          INTEGER NOT NULL,
  guests          INTEGER NOT NULL DEFAULT 1,
  total           INTEGER NOT NULL,
  deposit         INTEGER NOT NULL DEFAULT 0,
  customer_name   TEXT,
  customer_phone  TEXT,
  paid            BOOLEAN DEFAULT false,
  checked_in      BOOLEAN DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'confirme',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user ON hotel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_room ON hotel_bookings(room_id);

-- ============================================
-- SALLE DE SPORT
-- ============================================

CREATE TABLE IF NOT EXISTS gym_plans (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price INTEGER NOT NULL,
  days  INTEGER NOT NULL
);

INSERT INTO gym_plans VALUES
  ('journalier',  'Pass journalier',           8000,   1),
  ('mensuel',     'Abonnement mensuel',        80000,  30),
  ('trimestriel', 'Abonnement trimestriel',   210000,  90)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gym_coaches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  specialty  TEXT,
  hour_price INTEGER NOT NULL,
  active     BOOLEAN DEFAULT true
);

INSERT INTO gym_coaches (id, name, specialty, hour_price) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Hery Andrianasolo', 'Musculation & cross-training', 30000),
  ('10000000-0000-0000-0000-000000000002', 'Vola Rakoto',       'Cardio & perte de poids',      25000),
  ('10000000-0000-0000-0000-000000000003', 'Tojo Rabe',         'Préparation physique',         35000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  plan_id        TEXT NOT NULL REFERENCES gym_plans(id),
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  price          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  auto_renew     BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_subs_user ON gym_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS gym_coach_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  coach_id       UUID NOT NULL REFERENCES gym_coaches(id),
  date           DATE NOT NULL,
  hours          INTEGER NOT NULL DEFAULT 1,
  total          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_checkins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  sub_id     UUID REFERENCES gym_subscriptions(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PISCINE
-- ============================================

CREATE TABLE IF NOT EXISTS pool_pass_types (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  entries       INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  price         INTEGER NOT NULL
);

INSERT INTO pool_pass_types VALUES
  ('journalier', 'Pass journalier',  1,  1,  10000),
  ('semaine',    'Pass semaine',     7,  7,  60000),
  ('mensuel',    'Pass mensuel',    30, 30, 200000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS pool_passes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  pass_type_id   TEXT NOT NULL REFERENCES pool_pass_types(id),
  entries_left   INTEGER NOT NULL,
  expires_at     DATE NOT NULL,
  price          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Catalogue des cours (géré par admin)
CREATE TABLE IF NOT EXISTS pool_courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  instructor   TEXT,
  slots        TEXT[] NOT NULL DEFAULT '{}',  -- horaires disponibles ex: ['07:00','09:00']
  price        INTEGER NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 10,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pool_courses (id, name, instructor, slots, price, max_students) VALUES
  (gen_random_uuid(), 'Natation adulte',  'Razafy', ARRAY['07:00','09:00','14:00'], 15000, 8),
  (gen_random_uuid(), 'Aquagym',          'Hanta',  ARRAY['08:00','15:00'],         12000, 12),
  (gen_random_uuid(), 'Natation enfant',  'Vola',   ARRAY['10:00','16:00'],         10000, 6)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS pool_course_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  course_id      UUID REFERENCES pool_courses(id),
  course_name    TEXT NOT NULL,
  instructor     TEXT,
  date           DATE NOT NULL,
  slot           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  pass_id    UUID REFERENCES pool_passes(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SALON DE COIFFURE
-- ============================================

CREATE TABLE IF NOT EXISTS salon_services (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  price    INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'coiffure'
);

INSERT INTO salon_services (id, label, price, duration, category) VALUES
  -- Coiffure
  ('s1',  'Coupe homme',            15000,  30, 'coiffure'),
  ('s2',  'Coupe femme',            25000,  45, 'coiffure'),
  ('s3',  'Coloration',             60000,  90, 'coiffure'),
  ('s4',  'Brushing',               20000,  45, 'coiffure'),
  ('s5',  'Lissage',                80000, 120, 'coiffure'),
  ('s8',  'Soin capillaire',        35000,  60, 'coiffure'),
  ('s9',  'Coupe + brushing',       40000,  75, 'coiffure'),
  ('s10', 'Tresse africaine',       50000, 120, 'coiffure'),
  -- Barbier
  ('b1',  'Coupe + Taille de barbe', 22000,  45, 'barbier'),
  ('b2',  'Taille de barbe seule',   10000,  20, 'barbier'),
  ('b3',  'Rasage à l''ancienne',    18000,  30, 'barbier'),
  ('b4',  'Coupe homme + Rasage',    30000,  60, 'barbier'),
  ('b5',  'Coloration barbe',        12000,  25, 'barbier'),
  ('b6',  'Soin barbe (huile+masque)',8000,  20, 'barbier'),
  -- Ongles & Beauté
  ('n1',  'Manucure classique',      15000,  45, 'ongles'),
  ('n2',  'Pédicure classique',      20000,  60, 'ongles'),
  ('n3',  'Vernis semi-permanent',   25000,  60, 'ongles'),
  ('n4',  'Pose gel (ongles naturels)', 35000, 75,'ongles'),
  ('n5',  'Nail art (par ongle)',     3000,  10, 'ongles'),
  ('n6',  'Dépose gel / extension',  15000,  30, 'ongles'),
  ('n7',  'Soin des mains complet',  28000,  60, 'ongles'),
  ('n8',  'Soin des pieds complet',  35000,  75, 'ongles')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS salon_hairdressers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  specialty TEXT,
  active    BOOLEAN DEFAULT true
);

INSERT INTO salon_hairdressers (id, name, specialty) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Marie Rakoto',    'Colorations & soins'),
  ('20000000-0000-0000-0000-000000000002', 'Jean Rabe',       'Coupes hommes & tendance'),
  ('20000000-0000-0000-0000-000000000003', 'Sophie Rasolo',   'Tresses & coiffures africaines'),
  ('20000000-0000-0000-0000-000000000010', 'Karim Razafi',    'Barbier & coupes hommes'),
  ('20000000-0000-0000-0000-000000000011', 'Lova Andrianony', 'Manucure & Nail Art')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS salon_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  service_id     TEXT NOT NULL REFERENCES salon_services(id),
  hairdresser_id UUID REFERENCES salon_hairdressers(id),
  date           DATE NOT NULL,
  slot           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  rating         INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment        TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_bookings_user ON salon_bookings(user_id);

-- ============================================
-- TERRAIN DE FOOT
-- ============================================

CREATE TABLE IF NOT EXISTS field_slots (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  price      INTEGER NOT NULL,
  sport_type TEXT NOT NULL DEFAULT 'foot',
  equipment  TEXT
);

INSERT INTO field_slots (id, label, price, sport_type, equipment) VALUES
  -- Football
  ('foot-08:00', '08h00 – 09h30', 30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-10:00', '10h00 – 11h30', 30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-14:00', '14h00 – 15h30', 35000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-18:00', '18h00 – 19h30', 40000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  ('foot-20:00', '20h00 – 21h30', 45000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  -- Basketball
  ('basket-07:30','07h30 – 09h00', 25000, 'basket',   'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-09:30','09h30 – 11h00', 25000, 'basket',   'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-13:00','13h00 – 14h30', 30000, 'basket',   'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-15:30','15h30 – 17h00', 30000, 'basket',   'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-17:30','17h30 – 19h00', 35000, 'basket',   'Ballons fournis · Paniers réglables · Éclairage inclus'),
  -- Tennis
  ('tennis-09:00','09h00 – 10h30', 25000, 'tennis',   'Raquettes disponibles · Balles incluses'),
  ('tennis-11:00','11h00 – 12h30', 25000, 'tennis',   'Raquettes disponibles · Balles incluses'),
  ('tennis-16:00','16h00 – 17h30', 30000, 'tennis',   'Raquettes disponibles · Balles incluses'),
  -- Multisport
  ('multi-19:30', '19h30 – 21h00', 40000, 'multisport','Équipement complet · Éclairage inclus')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, price = EXCLUDED.price,
  sport_type = EXCLUDED.sport_type, equipment = EXCLUDED.equipment;

CREATE TABLE IF NOT EXISTS field_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  date            DATE NOT NULL,
  slot            TEXT NOT NULL,
  price           INTEGER NOT NULL,
  paid            BOOLEAN DEFAULT false,
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'confirme',
  recurrence      TEXT,      -- 'weekly' | 'biweekly' | null
  recurrence_weeks INTEGER,  -- nombre de semaines de récurrence
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, slot)
);

CREATE INDEX IF NOT EXISTS idx_field_bookings_user ON field_bookings(user_id);

-- ============================================
-- ESPACE ÉVÉNEMENTIEL
-- ============================================

CREATE TABLE IF NOT EXISTS event_halls (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  capacity   INTEGER NOT NULL,
  base_price INTEGER NOT NULL
);

INSERT INTO event_halls VALUES
  ('h-petite',  'Petite salle',   50,  400000),
  ('h-moyenne', 'Salle moyenne', 150,  900000),
  ('h-grande',  'Grande salle',  400, 1800000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS event_options (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price INTEGER NOT NULL
);

INSERT INTO event_options VALUES
  ('opt-catering', 'Catering',             150000),
  ('opt-deco',     'Décoration florale',    80000),
  ('opt-dj',       'DJ & Sonorisation',    120000),
  ('opt-secu',     'Sécurité',              50000),
  ('opt-photo',    'Photographe',          200000),
  ('opt-video',    'Vidéo & projection',   100000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS event_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  hall_id        TEXT NOT NULL REFERENCES event_halls(id),
  event_date     DATE NOT NULL,
  guests         INTEGER NOT NULL,
  options        JSONB DEFAULT '[]',
  total          INTEGER NOT NULL,
  deposit        INTEGER NOT NULL,
  deposit_paid   BOOLEAN DEFAULT false,
  signature_data TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'devis',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_bookings_user ON event_bookings(user_id);

-- ============================================
-- CYBERCAFÉ
-- ============================================

CREATE TABLE IF NOT EXISTS cybercafe_stations (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  specs  TEXT,
  active BOOLEAN DEFAULT true
);

INSERT INTO cybercafe_stations (id, number, specs) VALUES
  ('30000000-0000-0000-0000-000000000001', 1, 'Intel i5, 16GB RAM, SSD 512GB'),
  ('30000000-0000-0000-0000-000000000002', 2, 'Intel i5, 16GB RAM, SSD 512GB'),
  ('30000000-0000-0000-0000-000000000003', 3, 'Intel i7, 32GB RAM, SSD 1TB'),
  ('30000000-0000-0000-0000-000000000004', 4, 'Intel i7, 32GB RAM, SSD 1TB'),
  ('30000000-0000-0000-0000-000000000005', 5, 'Intel i5, 8GB RAM, HDD 1TB'),
  ('30000000-0000-0000-0000-000000000006', 6, 'Intel i5, 8GB RAM, HDD 1TB'),
  ('30000000-0000-0000-0000-000000000007', 7, 'AMD Ryzen 5, 16GB RAM, SSD 256GB'),
  ('30000000-0000-0000-0000-000000000008', 8, 'AMD Ryzen 5, 16GB RAM, SSD 256GB')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cybercafe_durations (
  id      TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  price   INTEGER NOT NULL
);

INSERT INTO cybercafe_durations VALUES
  ('30min', '30 minutes',  30,  5000),
  ('1h',    '1 heure',     60,  8000),
  ('2h',    '2 heures',   120, 14000),
  ('3h',    '3 heures',   180, 19000),
  ('5h',    '5 heures',   300, 28000),
  ('8h',    '8 heures',   480, 40000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cybercafe_services (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price INTEGER NOT NULL
);

INSERT INTO cybercafe_services VALUES
  ('print-bw',    'Impression N&B (par page)',      200),
  ('print-color', 'Impression couleur (par page)',   500),
  ('scan',        'Scan (par page)',                 300),
  ('usb',         'Copie USB',                     1000),
  ('cd',          'Gravure CD',                    2000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cybercafe_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  station_id     UUID NOT NULL REFERENCES cybercafe_stations(id),
  duration_id    TEXT NOT NULL REFERENCES cybercafe_durations(id),
  services       JSONB DEFAULT '[]',
  duration_price INTEGER NOT NULL,
  services_total INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  paid           BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cybercafe_bookings_user    ON cybercafe_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_cybercafe_bookings_station ON cybercafe_bookings(station_id);

-- ============================================
-- SPECTACLES
-- ============================================

CREATE TABLE IF NOT EXISTS shows (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  artist     TEXT,
  date       DATE NOT NULL,
  time       TEXT NOT NULL,
  venue      TEXT NOT NULL,
  category   TEXT,
  base_price INTEGER NOT NULL,
  image_url  TEXT,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO shows (id, title, artist, date, time, venue, category, base_price) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Concert Jazz Night',     'Rakotozafy Trio',  '2026-07-15', '20:00', 'Grande Salle',      'Musique',  25000),
  ('40000000-0000-0000-0000-000000000002', 'Gala de Danse Malgache', 'Troupe Hira Gasy', '2026-07-22', '19:00', 'Scène Principale',  'Danse',    20000),
  ('40000000-0000-0000-0000-000000000003', 'Stand-up Comedy',        'Dago & Friends',   '2026-08-05', '21:00', 'Espace Événement',  'Humour',   15000),
  ('40000000-0000-0000-0000-000000000004', 'Théâtre – Ny Lalana',    'Compagnie Lasa',   '2026-08-12', '18:00', 'Grande Salle',      'Théâtre',  18000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS show_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  show_id        UUID NOT NULL REFERENCES shows(id),
  seats          JSONB NOT NULL DEFAULT '[]',
  total          INTEGER NOT NULL,
  paid           BOOLEAN DEFAULT false,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_bookings_user ON show_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_show_bookings_show ON show_bookings(show_id);

-- ============================================
-- FAVORIS & AVIS
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  item_name  TEXT,
  item_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module, item_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  item_id    TEXT,
  rating     INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  user_email TEXT,
  action     TEXT NOT NULL,
  module     TEXT,
  details    TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAIEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  reference     TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  amount        INTEGER NOT NULL,
  method        TEXT NOT NULL DEFAULT 'especes',
  status        TEXT NOT NULL DEFAULT 'pending',
  booking_type  TEXT,
  booking_id    UUID,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);

-- ============================================
-- PROGRAMME FIDÉLITÉ
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  type        TEXT NOT NULL DEFAULT 'earn', -- 'earn' | 'redeem'
  description TEXT,
  reference   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_points(user_id);

-- ============================================
-- CODES PROMO
-- ============================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  type        TEXT NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  value       INTEGER NOT NULL,
  min_amount  INTEGER NOT NULL DEFAULT 0,
  max_uses    INTEGER,
  uses_count  INTEGER NOT NULL DEFAULT 0,
  valid_from  TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  module      TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AVIS & ÉTOILES
-- ============================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS booking_type TEXT,
  ADD COLUMN IF NOT EXISTS booking_id   TEXT,
  ADD COLUMN IF NOT EXISTS approved     BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_booking
  ON reviews(user_id, booking_type, booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_module ON reviews(module);

-- ============================================
-- WEB PUSH SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ============================================
-- OTP CODES (2FA + vérification SMS)
-- ============================================

CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  purpose    TEXT NOT NULL DEFAULT 'login',  -- login | payment | verify
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, purpose, used);

-- ============================================
-- API KEYS (POS Desktop, Mobile APK, tiers)
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  key_hash     TEXT UNIQUE NOT NULL,
  prefix       TEXT NOT NULL,           -- 8 premiers chars affichés (ARN_xxxx)
  device_type  TEXT NOT NULL DEFAULT 'external', -- pos_desktop|pos_mobile|mobile_app|external
  permissions  TEXT[] NOT NULL DEFAULT ARRAY['read'],  -- read|write|pos|admin
  active       BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url        TEXT NOT NULL,
  events     TEXT[] NOT NULL,           -- payment.confirmed | order.created | booking.created
  secret     TEXT NOT NULL,             -- HMAC-SHA256 signing secret
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event         TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending|success|failed
  response_code INTEGER,
  attempts      INTEGER NOT NULL DEFAULT 0,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- CYBERCAFÉ WAITLIST
-- ============================================

CREATE TABLE IF NOT EXISTS cybercafe_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id  UUID REFERENCES cybercafe_stations(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_user    ON cybercafe_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_station ON cybercafe_waitlist(station_id);

-- ============================================
-- RESTAURANT RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS restaurant_reservations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date           DATE NOT NULL,
  time           TEXT NOT NULL,
  guests         INTEGER NOT NULL DEFAULT 2,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resto_res_user ON restaurant_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_resto_res_date ON restaurant_reservations(date);
