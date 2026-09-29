/**
 * ARENAH – Données de démonstration pour l'IA
 * Usage : npm run db:seed:ai   (après npm run db:seed)
 *
 * Crée 40 clients fictifs (demo.clientN@arenah.mg) avec des goûts cohérents
 * (familles, sportifs, couples…) et des avis rédigés. Ces avis alimentent :
 *   - l'analyse des avis (page admin "Intelligence IA")
 *   - le moteur de recommandation (les goûts communs créent des voisins)
 * Les spectacles de démo déjà passés sont aussi décalés dans le futur, pour
 * que le chatbot ait un programme à proposer.
 *
 * Rejouable : les avis des clients de démo sont effacés puis recréés.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, describeDb } from '../config/env.js';

const pool = new pg.Pool(db);
const q = (sql: string, p: unknown[] = []) => pool.query(sql, p);

// Générateur pseudo-aléatoire déterministe : mêmes données à chaque exécution
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const PROFILES: Record<string, string[]> = {
  famille:  ['kids', 'pool', 'restaurant', 'boutique'],
  sportif:  ['gym', 'field', 'pool', 'boutique'],
  couple:   ['hotel', 'restaurant', 'show', 'salon'],
  affaires: ['hotel', 'event', 'restaurant', 'cybercafe'],
  jeune:    ['cybercafe', 'field', 'show', 'boutique'],
};

const FIRST = ['Hery', 'Rindra', 'Fanja', 'Tiana', 'Mialy', 'Andry', 'Lova', 'Nomena', 'Faly', 'Soa',
  'Tahina', 'Voahangy', 'Mamy', 'Haja', 'Noro', 'Fitia', 'Toky', 'Onja', 'Ravo', 'Kanto'];
const LAST = ['Rakoto', 'Rasoa', 'Randria', 'Rabe', 'Razafy', 'Andriana', 'Rakotomalala', 'Ravelo'];

const POSITIVE: Record<string, string[]> = {
  hotel:      ['Chambre propre et très confortable, personnel aux petits soins.', 'Vue magnifique depuis la suite, séjour parfait.', 'Accueil chaleureux à la réception, je reviendrai.'],
  restaurant: ['Le romazava était délicieux, service rapide.', 'Plats copieux et savoureux, très bon rapport qualité prix.', 'Tsara be ny sakafo, misaotra !'],
  gym:        ['Coachs motivants et équipements neufs.', 'Salle propre et bien équipée, super ambiance.'],
  salon:      ['Coupe réussie, la coiffeuse est une artiste.', 'Massage très relaxant, personnel adorable.'],
  pool:       ['Piscine propre et eau à bonne température.', 'Les cours de natation sont excellents, mon fils adore.'],
  field:      ['Terrain en excellent état, éclairage parfait le soir.', 'Super match entre amis, vestiaires propres.'],
  show:       ['Concert inoubliable, son cristallin.', 'Spectacle magnifique, les danseurs sont talentueux.'],
  event:      ['Organisation impeccable pour notre séminaire.', 'Salle superbe, mariage parfait, merci à l\'équipe.'],
  cybercafe:  ['Connexion rapide et postes performants.', 'Super soirée PS4 entre amis, pas cher.'],
  kids:       ['Les enfants ont adoré, animateurs sympas.', 'Espace bien sécurisé et très propre.'],
  boutique:   ['Livraison rapide, produit conforme.', 'Articles de bonne qualité, je recommande.'],
};
const NEGATIVE: Record<string, string[]> = {
  hotel:      ['Chambre sale et bruit toute la nuit, très déçu.', 'Climatisation en panne, personne n\'est venu réparer.'],
  restaurant: ['Attente beaucoup trop longue, plat arrivé froid.', 'Serveur impoli et erreur dans l\'addition.'],
  gym:        ['Machines en panne et vestiaires sales.'],
  salon:      ['Coupe ratée, la coiffeuse n\'a pas écouté ma demande.'],
  pool:       ['Eau trouble et trop de monde, décevant.'],
  field:      ['Pelouse abîmée et réservation perdue.'],
  show:       ['Le son était mauvais et on ne voyait rien.'],
  event:      ['Désorganisation totale, retard d\'une heure.'],
  cybercafe:  ['Connexion très lente, impossible de jouer.'],
  kids:       ['Espace mal surveillé, dangereux pour les petits.'],
  boutique:   ['Produit abîmé à la livraison, trop cher.'],
};
const NEUTRAL = ['Correct dans l\'ensemble, sans plus.', 'Prestation moyenne pour le prix.', 'Rien de spécial à signaler.', 'Ça peut aller, quelques points à améliorer.'];

async function main() {
  // Ces avis sont FICTIFS : les charger sur la vraie plateforme reviendrait à
  // publier de faux avis clients. Refus catégorique en production.
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ seed-ai crée de faux clients et de faux avis : interdit quand NODE_ENV=production.');
    process.exit(1);
  }
  console.log(`🤖 Données de démo IA → ${describeDb()}\n`);

  const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10); // comptes non connectables
  const profileNames = Object.keys(PROFILES);
  let reviewCount = 0;

  await q(`DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'demo.client%@arenah.mg')`);

  for (let i = 1; i <= 40; i++) {
    const email = `demo.client${i}@arenah.mg`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const { rows } = await q(`
      INSERT INTO users (email, fullname, phone, password_hash, role, active)
      VALUES ($1, $2, $3, $4, 'client', true)
      ON CONFLICT (email) DO UPDATE SET fullname = $2
      RETURNING id`, [email, name, `+261 34 10 ${String(i).padStart(2, '0')} 00`, hash]);
    const userId = rows[0].id;

    // 2 à 4 services du profil + parfois un service "hors profil"
    const profile = PROFILES[profileNames[i % profileNames.length]];
    const modules = [...profile].sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 3));
    if (rand() < 0.2) {
      const other = pick(Object.keys(POSITIVE).filter(m => !modules.includes(m)));
      modules.push(other);
    }

    for (const module of modules) {
      const r = rand();
      let rating: number, comment: string;
      if (r < 0.62)      { rating = rand() < 0.6 ? 5 : 4; comment = pick(POSITIVE[module]); }
      else if (r < 0.82) { rating = rand() < 0.5 ? 1 : 2; comment = pick(NEGATIVE[module]); }
      else if (r < 0.95) { rating = 3;                    comment = pick(NEUTRAL); }
      else               { rating = 5;                    comment = pick(NEGATIVE[module]); } // note incohérente, détectée par l'IA

      const daysAgo = Math.floor(rand() * 56);
      await q(`
        INSERT INTO reviews (user_id, module, rating, comment, approved, created_at)
        VALUES ($1, $2, $3, $4, true, NOW() - ($5 || ' days')::interval)`,
        [userId, module, rating, comment, String(daysAgo)]);
      reviewCount++;
    }
  }
  console.log(`✅  40 clients de démo, ${reviewCount} avis`);

  // Spectacles de démo passés → reprogrammés sur les semaines à venir
  const { rowCount } = await q(`
    UPDATE shows s SET date = CURRENT_DATE + (x.n * 7 + 2)::int
    FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY date) AS n FROM shows
          WHERE id::text LIKE '40000000-0000-0000-0000-%' AND date < CURRENT_DATE) x
    WHERE s.id = x.id`);
  if (rowCount) console.log(`✅  ${rowCount} spectacles reprogrammés dans le futur`);

  console.log('\n👉  Ouvrez Admin → Intelligence IA pour voir l\'analyse.\n');
  await pool.end();
}

main().catch(async err => {
  console.error('❌ Seed IA échoué :', err.message);
  await pool.end();
  process.exit(1);
});
