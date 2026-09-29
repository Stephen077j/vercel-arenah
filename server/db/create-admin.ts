/**
 * ARENAH – Création (ou réinitialisation) d'un compte administrateur
 *
 * En production, aucun compte n'existe au départ : c'est la seule façon
 * sûre de créer le premier super administrateur.
 *
 *   npm run admin:create
 *
 * Docker (production) :
 *   docker compose -f docker-compose.prod.yml --env-file .env.production \
 *     exec api node --import tsx/esm server/db/create-admin.ts
 *
 * Le script demande l'e-mail, le nom, le rôle et le mot de passe. On peut
 * aussi les passer par variables : ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE,
 * ADMIN_MODULE (pour admin_module), ADMIN_PASSWORD.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import readline from 'readline/promises';
import { db } from '../config/env.js';

const ROLES = ['super_admin', 'admin_module', 'proprietaire', 'caissier'];
const MODULES = ['boutique', 'restaurant', 'hotel', 'gym', 'salon', 'field', 'pool', 'event', 'spectacles', 'cybercafe', 'kids'];

function passwordProblem(p: string): string | null {
  if (p.length < 12) return 'au moins 12 caractères';
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) return 'des minuscules ET des majuscules';
  if (!/\d/.test(p)) return 'au moins un chiffre';
  if (/admin@2024|client@2024|password|motdepasse|arenah/i.test(p)) return 'pas de mot de passe connu ni le nom ARENAH';
  return null;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label: string, env: string, fallback = '') =>
    process.env[env]?.trim() || (await rl.question(label)).trim() || fallback;

  const email = (await ask('E-mail : ', 'ADMIN_EMAIL')).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail invalide');

  const fullname = await ask('Nom complet : ', 'ADMIN_NAME', 'Administrateur');
  const role = await ask(`Rôle (${ROLES.join(', ')}) [super_admin] : `, 'ADMIN_ROLE', 'super_admin');
  if (!ROLES.includes(role)) throw new Error(`Rôle inconnu : ${role}`);

  let module: string | null = null;
  if (role === 'admin_module') {
    module = await ask(`Module (${MODULES.join(', ')}) : `, 'ADMIN_MODULE');
    if (!MODULES.includes(module)) throw new Error(`Module inconnu : ${module}`);
  }

  const password = await ask('Mot de passe : ', 'ADMIN_PASSWORD');
  rl.close();
  const problem = passwordProblem(password);
  if (problem) throw new Error(`Mot de passe trop faible : il faut ${problem}`);

  const pool = new pg.Pool(db);
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(`
    INSERT INTO users (email, fullname, password_hash, role, module_assigned, active)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (email) DO UPDATE
      SET fullname = $2, password_hash = $3, role = $4, module_assigned = $5, active = true, updated_at = NOW()
    RETURNING (xmax = 0) AS created`, [email, fullname, hash, role, module]);
  await pool.end();

  console.log(`\n✅ Compte ${rows[0].created ? 'créé' : 'mis à jour'} : ${email} (${role}${module ? ` · ${module}` : ''})`);
  console.log('   Conservez le mot de passe dans un gestionnaire de mots de passe.\n');
}

main().catch(err => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
