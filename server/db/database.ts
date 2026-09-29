import pg from 'pg';
import { db, describeDb } from '../config/env.js';

const { Pool } = pg;

// La configuration vient de server/config/env.ts : soit DATABASE_URL (PostgreSQL
// managé), soit les variables séparées. Aucun mot de passe par défaut.
const pool = new Pool(db);

pool.on('error', (err) => {
  console.error('[DB] Erreur connexion PostgreSQL :', err.message);
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const res = await pool.query(sql, params);
  return res.rows[0] as T | undefined;
}

export async function execute(sql: string, params: unknown[] = []): Promise<pg.QueryResult> {
  return pool.query(sql, params);
}

export async function testConnection(): Promise<void> {
  const res = await pool.query('SELECT NOW() as ts, current_database() as db');
  console.log(`✅ PostgreSQL connecté — ${describeDb()} — ${res.rows[0].ts}`);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export default pool;
