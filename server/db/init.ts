/**
 * ARENAH – Initialisation du schéma PostgreSQL
 * Usage : npm run db:init
 *
 * Applique les fichiers SQL dans l'ordre. Chacun est idempotent
 * (CREATE TABLE IF NOT EXISTS), donc la commande est rejouable sans risque
 * sur une base déjà peuplée.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { db, describeDb } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;
const pool = new Pool(db);

const FILES = ['schema.pg.sql', 'patch_v2.sql', 'schema_v3.sql', 'patch_v4.sql', 'schema_ai.sql'];

async function init() {
  console.log('🔧 Initialisation du schéma ARENAH (PostgreSQL)');
  console.log(`   Cible : ${describeDb()}\n`);

  for (const file of FILES) {
    const full = path.join(__dirname, file);
    if (!fs.existsSync(full)) {
      console.warn(`⚠️  ${file} introuvable — ignoré`);
      continue;
    }
    const sql = fs.readFileSync(full, 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅  ${file}`);
    } catch (err) {
      console.error(`❌  ${file} : ${(err as Error).message}`);
      throw err;
    }
  }

  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*) as n FROM pg_tables WHERE schemaname = 'public'`
  );
  console.log(`\n📊  ${rows[0].n} tables dans la base.`);
  console.log('👉  Étape suivante : npm run db:seed\n');

  await pool.end();
}

init().catch(err => {
  console.error('❌ Initialisation échouée :', err.message);
  process.exit(1);
});
