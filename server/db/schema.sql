-- ARENAH – Schéma SQLite complet (dev local)
-- Production : même schéma sur Supabase PostgreSQL

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================
-- ROLES & UTILISATEURS
-- ============================================

CREATE TABLE IF NOT EXISTS app_roles (
  id   INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

INSERT OR IGNORE INTO app_roles (id, name, description) VALUES
  (1, 'super_admin',  'Administrateur système'),
  (2, 'admin_module', 'Administrateur de module'),
  (3, 'caissier',     'Caissier'),
  (4, 'client',       'Client');

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email        TEXT UNIQUE NOT NULL,
  fullname     TEXT,
  phone        TEXT,
  password_hash TEXT NOT NULL,
  avatar_url   TEXT,
  role            TEXT NOT NULL DEFAULT 'client' REFERENCES app_roles(name),
  module_assigned TEXT,              -- pour admin_module: boutique|restaurant|hotel|gym|salon|field|pool|event|spectacles|cybercafe
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS client_profiles (
  id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio       TEXT,
  address   TEXT,
  city      TEXT,
  zipcode   TEXT,
  country   TEXT DEFAULT 'Madagascar',
  verified  INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PRODUITS & CATALOGUE
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  module      TEXT NOT NULL,        -- 'restaurant', 'boutique', etc.
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL DEFAULT 0,  -- en Ariary
  category    TEXT,
  image_url   TEXT,
  stock       INTEGER DEFAULT 0,
  active      INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_module ON products(module);

-- ============================================
-- PANIER & COMMANDES (Boutique + Restaurant)
-- ============================================

CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  note       TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL REFERENCES users(id),
  module      TEXT NOT NULL DEFAULT 'boutique',
  type        TEXT NOT NULL DEFAULT 'boutique',  -- 'boutique' | 'restaurant'
  mode        TEXT NOT NULL DEFAULT 'retrait',   -- 'livraison' | 'retrait' | 'sur_place'
  total       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'en_attente',
  address     TEXT,
  notes       TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  paid        INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
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
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  price_per_night INTEGER NOT NULL,
  capacity     INTEGER NOT NULL DEFAULT 2,
  description  TEXT,
  amenities    TEXT,  -- JSON array
  image_url    TEXT,
  active       INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO hotel_rooms (id, name, type, price_per_night, capacity) VALUES
  ('r-std', 'Chambre Standard',   'standard',   180000, 2),
  ('r-sup', 'Chambre Supérieure', 'superieure', 260000, 2),
  ('r-fam', 'Chambre Familiale',  'familiale',  340000, 4),
  ('r-ste', 'Suite Vue Mer',      'suite',      480000, 2);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id),
  room_id         TEXT NOT NULL REFERENCES hotel_rooms(id),
  check_in        TEXT NOT NULL,
  check_out       TEXT NOT NULL,
  nights          INTEGER NOT NULL,
  guests          INTEGER NOT NULL DEFAULT 1,
  total           INTEGER NOT NULL,
  deposit         INTEGER NOT NULL DEFAULT 0,
  customer_name   TEXT,
  customer_phone  TEXT,
  paid            INTEGER DEFAULT 0,
  checked_in      INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'confirme',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user ON hotel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_room ON hotel_bookings(room_id);

-- ============================================
-- SALLE DE SPORT (GYM)
-- ============================================

CREATE TABLE IF NOT EXISTS gym_plans (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  price    INTEGER NOT NULL,
  days     INTEGER NOT NULL
);

INSERT OR IGNORE INTO gym_plans (id, label, price, days) VALUES
  ('journalier',   'Pass journalier',            8000,   1),
  ('mensuel',      'Abonnement mensuel',         80000,  30),
  ('trimestriel',  'Abonnement trimestriel',    210000,  90);

CREATE TABLE IF NOT EXISTS gym_coaches (
  id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name      TEXT NOT NULL,
  specialty TEXT,
  hour_price INTEGER NOT NULL,
  active    INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO gym_coaches (id, name, specialty, hour_price) VALUES
  ('c1', 'Hery Andrianasolo', 'Musculation & cross-training', 30000),
  ('c2', 'Vola Rakoto',       'Cardio & perte de poids',      25000),
  ('c3', 'Tojo Rabe',         'Préparation physique',         35000);

CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  plan_id        TEXT NOT NULL REFERENCES gym_plans(id),
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  auto_renew     INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gym_subs_user ON gym_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS gym_coach_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  coach_id       TEXT NOT NULL REFERENCES gym_coaches(id),
  date           TEXT NOT NULL,
  hours          INTEGER NOT NULL DEFAULT 1,
  total          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gym_checkins (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id),
  sub_id     TEXT REFERENCES gym_subscriptions(id),
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- PISCINE
-- ============================================

CREATE TABLE IF NOT EXISTS pool_pass_types (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  entries  INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  price    INTEGER NOT NULL
);

INSERT OR IGNORE INTO pool_pass_types (id, label, entries, validity_days, price) VALUES
  ('journalier', 'Pass journalier',   1,  1,  10000),
  ('semaine',    'Pass semaine',      7,  7,  60000),
  ('mensuel',    'Pass mensuel',     30, 30, 200000);

CREATE TABLE IF NOT EXISTS pool_passes (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  pass_type_id   TEXT NOT NULL REFERENCES pool_pass_types(id),
  entries_left   INTEGER NOT NULL,
  expires_at     TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pool_course_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  course_name    TEXT NOT NULL,
  instructor     TEXT,
  date           TEXT NOT NULL,
  slot           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pool_entries (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id),
  pass_id    TEXT REFERENCES pool_passes(id),
  entered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- SALON DE COIFFURE
-- ============================================

CREATE TABLE IF NOT EXISTS salon_services (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  price    INTEGER NOT NULL,
  duration INTEGER NOT NULL  -- minutes
);

INSERT OR IGNORE INTO salon_services (id, label, price, duration) VALUES
  ('s1',  'Coupe homme',              15000,  30),
  ('s2',  'Coupe femme',              25000,  45),
  ('s3',  'Coloration',               60000,  90),
  ('s4',  'Brushing',                 20000,  45),
  ('s5',  'Lissage',                  80000, 120),
  ('s8',  'Soin capillaire',          35000,  60),
  ('s9',  'Coupe + brushing',         40000,  75),
  ('s10', 'Tresse africaine',         50000, 120),
  -- Barbier
  ('b1',  'Coupe + Taille de barbe',  22000,  45),
  ('b2',  'Taille de barbe seule',    10000,  20),
  ('b3',  'Rasage à l''ancienne',     18000,  30),
  ('b4',  'Coupe homme + Rasage',     30000,  60),
  ('b5',  'Coloration barbe',         12000,  25),
  ('b6',  'Soin barbe (huile+masque)', 8000,  20),
  -- Ongles & Beauté
  ('n1',  'Manucure classique',       15000,  45),
  ('n2',  'Pédicure classique',       20000,  60),
  ('n3',  'Vernis semi-permanent',    25000,  60),
  ('n4',  'Pose gel (ongles naturels)',35000,  75),
  ('n5',  'Nail art (par ongle)',      3000,  10),
  ('n6',  'Dépose gel / extension',   15000,  30),
  ('n7',  'Soin des mains complet',   28000,  60),
  ('n8',  'Soin des pieds complet',   35000,  75);

CREATE TABLE IF NOT EXISTS salon_hairdressers (
  id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name     TEXT NOT NULL,
  specialty TEXT,
  active   INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO salon_hairdressers (id, name, specialty) VALUES
  ('h1', 'Marie Rakoto',    'Colorations & soins'),
  ('h2', 'Jean Rabe',       'Coupes hommes & tendance'),
  ('h3', 'Sophie Rasolo',   'Tresses & coiffures africaines'),
  ('h4', 'Karim Razafi',    'Barbier & coupes hommes'),
  ('h5', 'Lova Andrianony', 'Manucure & Nail Art');

CREATE TABLE IF NOT EXISTS salon_bookings (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id          TEXT NOT NULL REFERENCES users(id),
  service_id       TEXT NOT NULL REFERENCES salon_services(id),
  hairdresser_id   TEXT REFERENCES salon_hairdressers(id),
  date             TEXT NOT NULL,
  slot             TEXT NOT NULL,
  price            INTEGER NOT NULL,
  paid             INTEGER DEFAULT 0,
  rating           INTEGER,
  comment          TEXT,
  customer_name    TEXT,
  customer_phone   TEXT,
  status           TEXT NOT NULL DEFAULT 'confirme',
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
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

INSERT OR IGNORE INTO field_slots (id, label, price, sport_type, equipment) VALUES
  ('foot-08:00', '08h00 – 09h30', 30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-10:00', '10h00 – 11h30', 30000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-14:00', '14h00 – 15h30', 35000, 'foot',      'Ballons fournis · Filets inclus · Vestiaires'),
  ('foot-18:00', '18h00 – 19h30', 40000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  ('foot-20:00', '20h00 – 21h30', 45000, 'foot',      'Ballons fournis · Filets inclus · Éclairage inclus'),
  ('basket-07:30','07h30 – 09h00',25000, 'basket',    'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-09:30','09h30 – 11h00',25000, 'basket',    'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-13:00','13h00 – 14h30',30000, 'basket',    'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-15:30','15h30 – 17h00',30000, 'basket',    'Ballons fournis · Paniers réglables · Vestiaires'),
  ('basket-17:30','17h30 – 19h00',35000, 'basket',    'Ballons fournis · Paniers réglables · Éclairage inclus'),
  ('tennis-09:00','09h00 – 10h30',25000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('tennis-11:00','11h00 – 12h30',25000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('tennis-16:00','16h00 – 17h30',30000, 'tennis',    'Raquettes disponibles · Balles incluses'),
  ('multi-19:30', '19h30 – 21h00',40000, 'multisport','Équipement complet · Éclairage inclus');

CREATE TABLE IF NOT EXISTS field_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  date           TEXT NOT NULL,
  slot           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'confirme',
  created_at     TEXT DEFAULT (datetime('now')),
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

INSERT OR IGNORE INTO event_halls (id, name, capacity, base_price) VALUES
  ('h-petite',  'Petite salle',  50,  400000),
  ('h-moyenne', 'Salle moyenne', 150, 900000),
  ('h-grande',  'Grande salle',  400, 1800000);

CREATE TABLE IF NOT EXISTS event_options (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price INTEGER NOT NULL
);

INSERT OR IGNORE INTO event_options (id, label, price) VALUES
  ('opt-catering',    'Catering',              150000),
  ('opt-deco',        'Décoration florale',     80000),
  ('opt-dj',          'DJ & Sonorisation',     120000),
  ('opt-secu',        'Sécurité',               50000),
  ('opt-photo',       'Photographe',           200000),
  ('opt-video',       'Vidéo & projection',    100000);

CREATE TABLE IF NOT EXISTS event_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  hall_id        TEXT NOT NULL REFERENCES event_halls(id),
  event_date     TEXT NOT NULL,
  guests         INTEGER NOT NULL,
  options        TEXT DEFAULT '[]',  -- JSON array of option ids
  total          INTEGER NOT NULL,
  deposit        INTEGER NOT NULL,
  deposit_paid   INTEGER DEFAULT 0,
  signature_data TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'devis',
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_bookings_user ON event_bookings(user_id);

-- ============================================
-- CYBERCAFÉ
-- ============================================

CREATE TABLE IF NOT EXISTS cybercafe_stations (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  number      INTEGER NOT NULL UNIQUE,
  specs       TEXT,
  active      INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO cybercafe_stations (id, number, specs) VALUES
  ('st-1', 1, 'Intel i5, 16GB RAM, SSD 512GB'),
  ('st-2', 2, 'Intel i5, 16GB RAM, SSD 512GB'),
  ('st-3', 3, 'Intel i7, 32GB RAM, SSD 1TB'),
  ('st-4', 4, 'Intel i7, 32GB RAM, SSD 1TB'),
  ('st-5', 5, 'Intel i5, 8GB RAM, HDD 1TB'),
  ('st-6', 6, 'Intel i5, 8GB RAM, HDD 1TB'),
  ('st-7', 7, 'AMD Ryzen 5, 16GB RAM, SSD 256GB'),
  ('st-8', 8, 'AMD Ryzen 5, 16GB RAM, SSD 256GB');

CREATE TABLE IF NOT EXISTS cybercafe_durations (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  minutes        INTEGER NOT NULL,
  price          INTEGER NOT NULL
);

INSERT OR IGNORE INTO cybercafe_durations (id, label, minutes, price) VALUES
  ('30min',  '30 minutes',  30,   5000),
  ('1h',     '1 heure',     60,   8000),
  ('2h',     '2 heures',   120,  14000),
  ('3h',     '3 heures',   180,  19000),
  ('5h',     '5 heures',   300,  28000),
  ('8h',     '8 heures',   480,  40000);

CREATE TABLE IF NOT EXISTS cybercafe_services (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price INTEGER NOT NULL
);

INSERT OR IGNORE INTO cybercafe_services (id, label, price) VALUES
  ('print-bw',    'Impression N&B (par page)',      200),
  ('print-color', 'Impression couleur (par page)',   500),
  ('scan',        'Scan (par page)',                 300),
  ('usb',         'Copie USB',                      1000),
  ('cd',          'Gravure CD',                     2000);

CREATE TABLE IF NOT EXISTS cybercafe_bookings (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id          TEXT NOT NULL REFERENCES users(id),
  station_id       TEXT NOT NULL REFERENCES cybercafe_stations(id),
  duration_id      TEXT NOT NULL REFERENCES cybercafe_durations(id),
  services         TEXT DEFAULT '[]',  -- JSON array
  duration_price   INTEGER NOT NULL,
  services_total   INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  start_time       TEXT NOT NULL,
  end_time         TEXT NOT NULL,
  paid             INTEGER DEFAULT 0,
  customer_name    TEXT,
  customer_phone   TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cybercafe_bookings_user    ON cybercafe_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_cybercafe_bookings_station ON cybercafe_bookings(station_id);

-- ============================================
-- SPECTACLES
-- ============================================

CREATE TABLE IF NOT EXISTS shows (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title      TEXT NOT NULL,
  artist     TEXT,
  date       TEXT NOT NULL,
  time       TEXT NOT NULL,
  venue      TEXT NOT NULL,
  category   TEXT,
  base_price INTEGER NOT NULL,
  image_url  TEXT,
  active     INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO shows (id, title, artist, date, time, venue, category, base_price) VALUES
  ('sh-1', 'Concert Jazz Night',      'Rakotozafy Trio',   '2026-07-15', '20:00', 'Grande Salle', 'Musique',  25000),
  ('sh-2', 'Gala de Danse Malgache',  'Troupe Hira Gasy',  '2026-07-22', '19:00', 'Scène Principale', 'Danse', 20000),
  ('sh-3', 'Stand-up Comedy',         'Dago & Friends',    '2026-08-05', '21:00', 'Espace Événement', 'Humour', 15000),
  ('sh-4', 'Théâtre – Ny Lalana',     'Compagnie Lasa',    '2026-08-12', '18:00', 'Grande Salle', 'Théâtre', 18000);

CREATE TABLE IF NOT EXISTS show_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT NOT NULL REFERENCES users(id),
  show_id        TEXT NOT NULL REFERENCES shows(id),
  seats          TEXT NOT NULL DEFAULT '[]',  -- JSON array [{row, number, type, price}]
  total          INTEGER NOT NULL,
  paid           INTEGER DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_show_bookings_user ON show_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_show_bookings_show ON show_bookings(show_id);

-- ============================================
-- FAVORIS & AVIS
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  item_name  TEXT,
  item_price INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, module, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  item_id    TEXT,
  rating     INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  read       INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT REFERENCES users(id),
  user_email TEXT,
  action     TEXT NOT NULL,
  module     TEXT,
  details    TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================
-- PAIEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT REFERENCES users(id),
  reference      TEXT UNIQUE,
  amount         INTEGER NOT NULL,
  method         TEXT NOT NULL DEFAULT 'especes',  -- 'especes'|'mvola'|'orange_money'|'carte'
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'success'|'failed'
  booking_type   TEXT,
  booking_id     TEXT,
  notes          TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- ESPACE ENFANTS
-- ============================================

CREATE TABLE IF NOT EXISTS kids_bookings (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT REFERENCES users(id),
  booking_type   TEXT NOT NULL DEFAULT 'entry',   -- 'entry' | 'birthday'
  visit_date     TEXT NOT NULL,
  num_children   INTEGER NOT NULL DEFAULT 1,
  num_adults     INTEGER NOT NULL DEFAULT 0,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  package_label  TEXT,
  total_price    INTEGER NOT NULL,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kids_user ON kids_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_kids_date ON kids_bookings(visit_date);
