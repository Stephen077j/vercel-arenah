-- Local SQLite Database Schema
-- ARENAH Application - Local Development Database

-- ============================================
-- 1. AUTHENTICATION & ROLES
-- ============================================

-- App roles
CREATE TABLE IF NOT EXISTS app_roles (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

INSERT OR IGNORE INTO app_roles (id, name, description) VALUES
  (1, 'super_admin', 'Administrateur système'),
  (2, 'admin_module', 'Administrateur de module'),
  (3, 'caissier', 'Caissier'),
  (4, 'client', 'Client');

-- Users (local authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  fullname TEXT,
  phone TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client' REFERENCES app_roles(name),
  active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_to_supabase BOOLEAN DEFAULT 0,
  supabase_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 2. CLIENT DATA
-- ============================================

-- Client profiles
CREATE TABLE IF NOT EXISTS client_profiles (
  id TEXT PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  address TEXT,
  city TEXT,
  zipcode TEXT,
  country TEXT,
  verified BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client reviews
CREATE TABLE IF NOT EXISTS client_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  service TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_user ON client_reviews(user_id);

-- Client invoices
CREATE TABLE IF NOT EXISTS client_invoices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  invoice_number TEXT UNIQUE,
  amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON client_invoices(user_id);

-- ============================================
-- 3. SHOP DATA
-- ============================================

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  total DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- ============================================
-- 4. EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS event_bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  hall_id TEXT NOT NULL,
  event_date DATE,
  guests INTEGER,
  total DECIMAL(10, 2),
  deposit DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  signature_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON event_bookings(user_id);

-- ============================================
-- 5. NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================
-- 6. SYNC METADATA
-- ============================================

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY,
  table_name TEXT UNIQUE NOT NULL,
  last_synced TIMESTAMP,
  pending_changes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'idle'
);

INSERT OR IGNORE INTO sync_status (table_name, status) VALUES
  ('users', 'idle'),
  ('client_reviews', 'idle'),
  ('client_invoices', 'idle'),
  ('orders', 'idle'),
  ('event_bookings', 'idle');
