import Database from 'better-sqlite3';
import path from 'path';

// Path to local SQLite database
const dbPath = path.join(process.cwd(), 'arenah.local.db');

// Initialize database connection
let db: Database.Database | null = null;

/**
 * Initialize local SQLite database
 */
export function initializeLocalDatabase() {
  try {
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(process.cwd(), 'database.local.sql'), 'utf8');
    db.exec(schema);
    
    console.log('✅ Local database initialized at:', dbPath);
    return db;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeLocalDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Insert demo user (for testing)
 */
export function insertDemoUsers() {
  if (!db) throw new Error('Database not initialized');
  
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, fullname, phone, role, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  
  const demoUsers = [
    {
      id: 'demo-client-001',
      email: 'demo.client@arenah.local',
      fullname: 'Démo Client',
      phone: '+229 91 23 45 67',
      role: 'client'
    },
    {
      id: 'demo-vip-001',
      email: 'demo.vip@arenah.local',
      fullname: 'Démo VIP',
      phone: '+229 92 34 56 78',
      role: 'client'
    },
    {
      id: 'demo-admin-001',
      email: 'demo.admin@arenah.local',
      fullname: 'Démo Admin',
      phone: '+229 93 45 67 89',
      role: 'admin_module'
    }
  ];
  
  for (const user of demoUsers) {
    insertUser.run(user.id, user.email, user.fullname, user.phone, user.role);
  }
  
  console.log('✅ Demo users created');
}

/**
 * Get user by email (local auth)
 */
export function getUserByEmail(email: string) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

/**
 * Get all pending syncs
 */
export function getPendingChanges() {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    SELECT table_name, pending_changes, last_synced
    FROM sync_status
    WHERE pending_changes > 0
  `);
  
  return stmt.all();
}

/**
 * Mark changes as synced
 */
export function markTableSynced(tableName: string) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    UPDATE sync_status
    SET last_synced = CURRENT_TIMESTAMP, pending_changes = 0, status = 'synced'
    WHERE table_name = ?
  `);
  
  stmt.run(tableName);
}

export default {
  initializeLocalDatabase,
  getDatabase,
  closeDatabase,
  insertDemoUsers,
  getUserByEmail,
  getPendingChanges,
  markTableSynced
};
