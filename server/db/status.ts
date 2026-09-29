/**
 * ARENAH – État de la base PostgreSQL
 * Usage : npm run db:status
 */
import pg from 'pg';
import { db, describeDb } from '../config/env.js';

const { Pool } = pg;
const pool = new Pool(db);

const COUNTS: [string, string][] = [
  ['Utilisateurs',   'users'],
  ['Produits',       'products'],
  ['Commandes',      'orders'],
  ['Paiements',      'payments'],
  ['Résa hôtel',     'hotel_bookings'],
  ['Résa salon',     'salon_bookings'],
  ['Résa terrain',   'field_bookings'],
  ['Résa événement', 'event_bookings'],
  ['Notifications',  'notifications'],
  ['Journal audit',  'audit_logs'],
];

async function status() {
  console.log(`\n📊  Base ${describeDb()}\n`);

  const { rows: [{ n: tables }] } = await pool.query<{ n: string }>(
    `SELECT COUNT(*) as n FROM pg_tables WHERE schemaname = 'public'`
  );
  console.log(`    Tables : ${tables}`);

  if (Number(tables) === 0) {
    console.log('\n⚠️  Base vide — lancez : npm run db:init && npm run db:seed\n');
    await pool.end();
    return;
  }

  const summary: Record<string, number> = {};
  for (const [label, table] of COUNTS) {
    try {
      const { rows } = await pool.query<{ n: string }>(`SELECT COUNT(*) as n FROM ${table}`);
      summary[label] = Number(rows[0].n);
    } catch {
      summary[label] = -1; // table absente
    }
  }
  console.table(summary);

  const missing = Object.entries(summary).filter(([, v]) => v === -1).map(([k]) => k);
  if (missing.length) {
    console.log(`⚠️  Tables manquantes (-1) : ${missing.join(', ')} — lancez npm run db:init\n`);
  }

  await pool.end();
}

status().catch(err => {
  console.error(`\n❌ Connexion impossible à ${describeDb()} : ${err.message}`);
  console.error('   Vérifiez que PostgreSQL tourne et que .env.local est correct.\n');
  process.exit(1);
});
