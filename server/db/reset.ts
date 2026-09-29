/**
 * ARENAH – Remise à zéro complète de la base PostgreSQL
 * Usage : npm run db:reset -- --confirm
 *
 * Supprime le schéma public (donc TOUTES les données : commandes, paiements,
 * réservations, comptes) puis rejoue le schéma et le seed.
 *
 * Le drapeau --confirm est obligatoire : sans lui la commande n'écrit rien.
 * Refusé également si NODE_ENV=production.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { db, describeDb } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET = describeDb();

const { Pool } = pg;
const pool = new Pool(db);

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ db:reset est interdit avec NODE_ENV=production.');
    process.exit(1);
  }

  if (!process.argv.includes('--confirm')) {
    console.error(`
⚠️  db:reset supprime TOUTES les données de la base « ${TARGET} »
    (commandes, paiements, réservations, comptes clients).

    Pour confirmer :   npm run db:reset -- --confirm
`);
    process.exit(1);
  }

  console.log(`🗑️  Suppression du schéma public de « ${TARGET} »…`);
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.end();
  console.log('✅  Schéma vidé.\n');

  // init puis seed, dans des processus séparés : chacun gère son propre pool
  for (const script of ['init.ts', 'seed.ts']) {
    const r = spawnSync(
      process.execPath,
      ['--import', 'tsx/esm', path.join(__dirname, script)],
      { stdio: 'inherit', env: process.env }
    );
    if (r.status !== 0) {
      console.error(`❌ ${script} a échoué.`);
      process.exit(r.status ?? 1);
    }
  }
}

reset().catch(err => {
  console.error('❌ Reset échoué :', err.message);
  process.exit(1);
});
