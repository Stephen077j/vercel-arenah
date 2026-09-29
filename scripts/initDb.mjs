#!/usr/bin/env node

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to database
const dbPath = path.join(process.cwd(), 'arenah.local.db');

console.log('🔧 Initializing local database...\n');

try {
  // Check if database already exists
  const dbExists = fs.existsSync(dbPath);
  if (dbExists) {
    console.log('⚠️  Database already exists at:', dbPath);
    console.log('   Use: npm run db:reset  to recreate\n');
  }

  // Create/connect to database
  const db = new Database(dbPath);
  console.log('✅ Connected to database:', dbPath);

  // Read SQL schema
  const schemaPath = path.join(process.cwd(), 'database.local.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Execute schema
  db.exec(schema);
  console.log('✅ Schema created successfully');

  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();

  console.log(`✅ ${tables.length} tables created:\n`);
  tables.forEach(t => console.log(`   • ${t.name}`));

  // Add demo users
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

  console.log('\n✅ Creating demo users:\n');
  for (const user of demoUsers) {
    insertUser.run(user.id, user.email, user.fullname, user.phone, user.role);
    console.log(`   • ${user.email}`);
  }

  // Create sync status
  const syncInsert = db.prepare(`
    INSERT OR IGNORE INTO sync_status (table_name, status)
    VALUES (?, ?)
  `);

  ['users', 'client_reviews', 'client_invoices', 'orders', 'event_bookings'].forEach(table => {
    syncInsert.run(table, 'idle');
  });

  db.close();

  console.log('\n✅ Database initialization complete!');
  console.log('\n📊 Database file:', dbPath);
  console.log('📋 Ready to start development: npm run dev\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Error initializing database:', error.message);
  if (error.message.includes('no such table')) {
    console.log('\n💡 Try: npm run db:reset');
  }
  process.exit(1);
}
