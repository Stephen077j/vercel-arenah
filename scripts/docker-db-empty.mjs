// Gestion du seed automatique pour docker/api-entrypoint.sh.
//   node scripts/docker-db-empty.mjs          → code 0 si le seed n'a jamais réussi
//   node scripts/docker-db-empty.mjs --done   → mémorise que le seed a réussi
// Le marqueur est posé seulement après un seed complet : un seed interrompu
// est donc rejoué au démarrage suivant (il est idempotent).
import pg from 'pg';

const MARKER = 'docker_seed_done';
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  if (process.argv.includes('--done')) {
    await pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ($1, 'true')
       ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`, [MARKER]);
  } else {
    const { rows } = await pool.query('SELECT 1 FROM platform_settings WHERE key = $1', [MARKER]);
    process.exitCode = rows.length ? 1 : 0;
  }
} catch (err) {
  console.error('docker-db-empty :', err.message);
  process.exitCode = process.argv.includes('--done') ? 1 : 0;
} finally {
  await pool.end();
}
