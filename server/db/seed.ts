/**
 * ARENAH – Seed complet PostgreSQL
 * Usage : node --import tsx/esm server/db/seed.ts
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, describeDb } from '../config/env.js';

const { Pool } = pg;
const pool = new Pool(db);

const q  = (sql: string, p: unknown[] = []) => pool.query(sql, p);
const id = () => crypto.randomUUID();

/**
 * Mots de passe des comptes de démonstration.
 *
 * Ce dépôt étant public, des valeurs écrites en dur ici donneraient à
 * n'importe quel lecteur l'accès à une instance déployée. En développement on
 * garde donc des valeurs commodes, mais en production le seed refuse de
 * s'exécuter tant qu'elles ne sont pas fournies explicitement.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function seedPassword(envVar: string, devDefault: string): string {
  const provided = process.env[envVar]?.trim();
  if (provided) return provided;
  if (IS_PRODUCTION) {
    console.error(
      `\n❌ ${envVar} est obligatoire quand NODE_ENV=production.\n` +
      `   Les mots de passe de démonstration sont publics : les réutiliser en\n` +
      `   production ouvrirait la plateforme à tout lecteur du dépôt.\n\n` +
      `   Exemple :\n` +
      `     SEED_ADMIN_PASSWORD='...' SEED_CLIENT_PASSWORD='...' npm run db:seed\n`
    );
    process.exit(1);
  }
  return devDefault;
}

const ADMIN_PASSWORD  = seedPassword('SEED_ADMIN_PASSWORD',  'Admin@2024!');
const CLIENT_PASSWORD = seedPassword('SEED_CLIENT_PASSWORD', 'Client@2024!');

// ─── helpers ───────────────────────────────────────────────────────────────
async function upsertUser(email: string, fullname: string, phone: string, role: string, password: string, moduleAssigned?: string) {
  const hash = await bcrypt.hash(password, 10);
  await q(`
    INSERT INTO users (id, email, fullname, phone, password_hash, role, module_assigned, active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,true)
    ON CONFLICT (email) DO UPDATE SET fullname=$3, phone=$4, password_hash=$5, role=$6, module_assigned=$7, active=true
  `, [id(), email, fullname, phone, hash, role, moduleAssigned ?? null]);
}

async function insertProducts(rows: { module: string; name: string; description: string; price: number; category: string; stock: number }[]) {
  for (const r of rows) {
    // Idempotent sur (module, name) : re-lancer le seed met à jour le catalogue
    // au lieu de le dupliquer. Le stock n'est pas écrasé — il vit en production.
    await q(`
      INSERT INTO products (id, module, name, description, price, category, stock, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true)
      ON CONFLICT (module, name) DO UPDATE
        SET description = EXCLUDED.description,
            price       = EXCLUDED.price,
            category    = EXCLUDED.category,
            updated_at  = NOW()
    `, [id(), r.module, r.name, r.description, r.price, r.category, r.stock]);
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Démarrage du seed ARENAH');
  console.log(`   Cible : ${describeDb()}\n`);

  // ── 1. COLONNE desc sur event_halls (si absente) ────────────────────────
  await q(`ALTER TABLE event_halls ADD COLUMN IF NOT EXISTS "desc" TEXT`);
  console.log('✅  event_halls."desc" ajouté');

  // ── 2. UTILISATEURS ADMIN ───────────────────────────────────────────────
  // Super admin — voit tout
  await upsertUser('superadmin@arenah.mg',       'Super Admin Arenah',      '+261 34 00 00 01', 'super_admin',  ADMIN_PASSWORD);
  // Admin par module — chacun ne voit que son module
  await upsertUser('admin.boutique@arenah.mg',   'Admin Boutique',          '+261 34 00 00 10', 'admin_module', ADMIN_PASSWORD, 'boutique');
  await upsertUser('admin.restaurant@arenah.mg', 'Admin Restaurant',        '+261 34 00 00 11', 'admin_module', ADMIN_PASSWORD, 'restaurant');
  await upsertUser('admin.hotel@arenah.mg',      'Admin Hôtel',             '+261 34 00 00 12', 'admin_module', ADMIN_PASSWORD, 'hotel');
  await upsertUser('admin.gym@arenah.mg',        'Admin Gym & Sport',       '+261 34 00 00 13', 'admin_module', ADMIN_PASSWORD, 'gym');
  await upsertUser('admin.salon@arenah.mg',      'Admin Salon Beauté',      '+261 34 00 00 14', 'admin_module', ADMIN_PASSWORD, 'salon');
  await upsertUser('admin.field@arenah.mg',      'Admin Terrains',          '+261 34 00 00 15', 'admin_module', ADMIN_PASSWORD, 'field');
  await upsertUser('admin.pool@arenah.mg',       'Admin Piscine',           '+261 34 00 00 16', 'admin_module', ADMIN_PASSWORD, 'pool');
  await upsertUser('admin.event@arenah.mg',      'Admin Événements',        '+261 34 00 00 17', 'admin_module', ADMIN_PASSWORD, 'event');
  await upsertUser('admin.spectacles@arenah.mg', 'Admin Spectacles',        '+261 34 00 00 18', 'admin_module', ADMIN_PASSWORD, 'spectacles');
  await upsertUser('admin.cybercafe@arenah.mg',  'Admin Cybercafé',         '+261 34 00 00 19', 'admin_module', ADMIN_PASSWORD, 'cybercafe');
  await upsertUser('admin.kids@arenah.mg',       'Admin Espace Kids',       '+261 34 00 00 20', 'admin_module', ADMIN_PASSWORD, 'kids');
  // Propriétaire, caissier & client démo
  await upsertUser('proprietaire@arenah.mg',     'Propriétaire Arenah',     '+261 34 00 00 02', 'proprietaire', ADMIN_PASSWORD);
  await upsertUser('caissier@arenah.mg',         'Caissier Principal',      '+261 34 00 00 03', 'caissier',     ADMIN_PASSWORD);
  await upsertUser('client@arenah.mg',           'Client Démo',             '+261 34 00 00 04', 'client',       CLIENT_PASSWORD);
  console.log('✅  Utilisateurs créés (superadmin / propriétaire / 11 admins-module / caissier / client)');

  // ── 3. HÔTEL – descriptions & équipements ───────────────────────────────
  const rooms = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      description: 'Chambre confortable avec lit double, salle de bain privée, climatisation et accès Wi-Fi. Idéale pour un séjour simple et reposant.',
      amenities: ['Wi-Fi', 'Climatisation', 'TV écran plat', 'Salle de bain privée', 'Coffre-fort'],
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      description: 'Chambre spacieuse avec lit king-size, balcon avec vue sur le jardin, mini-bar et service de chambre 24h/24.',
      amenities: ['Wi-Fi', 'Climatisation', 'TV écran plat', 'Balcon', 'Mini-bar', 'Service de chambre', 'Coffre-fort', 'Peignoir & chaussons'],
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      description: 'Grande chambre avec deux lits queen-size, espace salon séparé et baignoire. Parfaite pour les familles avec enfants.',
      amenities: ['Wi-Fi', 'Climatisation', '2 TV écran plat', 'Espace salon', 'Baignoire', 'Lit bébé disponible', 'Mini-bar', 'Coffre-fort'],
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      description: 'Suite de luxe avec vue panoramique sur la mer, jacuzzi privé, salon séparé et service butler personnalisé. L\'expérience ultime.',
      amenities: ['Wi-Fi haut débit', 'Climatisation', 'TV 4K', 'Jacuzzi privé', 'Vue mer panoramique', 'Butler privé', 'Mini-bar premium', 'Terrasse privée', 'Service de chambre 24h', 'Salle de bain en marbre'],
    },
  ];
  for (const r of rooms) {
    await q(
      `UPDATE hotel_rooms SET description=$1, amenities=$2 WHERE id=$3`,
      [r.description, JSON.stringify(r.amenities), r.id]
    );
  }
  console.log('✅  Hôtel – descriptions & équipements mis à jour');

  // ── 4. SALLES ÉVÉNEMENTIELLES – desc ────────────────────────────────────
  await q(`UPDATE event_halls SET "desc"='Salle intime pour réunions, anniversaires ou événements privés jusqu''à 50 personnes. Équipée d''un vidéoprojecteur et d''une sonorisation.' WHERE id='h-petite'`);
  await q(`UPDATE event_halls SET "desc"='Espace polyvalent idéal pour conférences, galas et mariages de taille moyenne. Scène intégrée, écrans rétractables et système son professionnel.' WHERE id='h-moyenne'`);
  await q(`UPDATE event_halls SET "desc"='Notre plus grande salle pour les grands événements et concerts. Scène de 150m², régie son & lumière professionnelle, balcon et loges artistes.' WHERE id='h-grande'`);
  console.log('✅  Salles événementielles – descriptions mises à jour');

  // ── 5. SPECTACLES – descriptions ────────────────────────────────────────
  // Ajouter colonne description si absente
  await q(`ALTER TABLE shows ADD COLUMN IF NOT EXISTS description TEXT`);
  const showUpdates = [
    { id: '40000000-0000-0000-0000-000000000001', desc: 'Une soirée jazz exceptionnelle avec le célèbre Rakotozafy Trio. Trois heures de musique live mêlant jazz malgache et improvisations world. Tenues élégantes recommandées.' },
    { id: '40000000-0000-0000-0000-000000000002', desc: 'La Troupe Hira Gasy vous invite à un voyage à travers la danse et la musique traditionnelle malgache. Costumes traditionnels, chants et percussions ancestrales.' },
    { id: '40000000-0000-0000-0000-000000000003', desc: 'Rires garantis avec Dago & Friends ! Une soirée stand-up avec 4 comédiens malgaches qui décortiquent le quotidien avec humour et finesse. Déconseillé aux moins de 16 ans.' },
    { id: '40000000-0000-0000-0000-000000000004', desc: 'La Compagnie Lasa présente "Ny Lalana" (Le Chemin), une pièce de théâtre contemporaine sur l\'identité et l\'exil. Durée : 1h45 avec entracte.' },
  ];
  for (const s of showUpdates) {
    await q(`UPDATE shows SET description=$1 WHERE id=$2`, [s.desc, s.id]);
  }
  console.log('✅  Spectacles – descriptions mises à jour');

  // ── 6. PRODUITS BOUTIQUE ─────────────────────────────────────────────────
  const boutique = [
    // Sports & Fitness
    { module: 'boutique', name: 'Gants de boxe cuir',         description: 'Gants de boxe professionnels en cuir véritable, rembourrage triple densité.', price: 85000,  category: 'Sport', stock: 15 },
    { module: 'boutique', name: 'Corde à sauter pro',          description: 'Corde à sauter à roulements à billes, câble acier, poignées ergonomiques.', price: 18000,  category: 'Sport', stock: 30 },
    { module: 'boutique', name: 'Tapis de yoga 6mm',           description: 'Tapis antidérapant haute densité, lavable, avec sangle de transport incluse.', price: 35000,  category: 'Sport', stock: 20 },
    { module: 'boutique', name: 'Bouteille isotherme 750ml',   description: 'Acier inoxydable, garde chaud 12h et froid 24h. Gravure personnalisée disponible.', price: 22000,  category: 'Sport', stock: 50 },
    { module: 'boutique', name: 'Serviette microfibre sport',  description: 'Serviette ultra-absorbante séchage rapide, idéale pour gym et piscine.', price: 12000,  category: 'Sport', stock: 40 },
    { module: 'boutique', name: 'Bande de résistance kit 5',   description: 'Set de 5 bandes latex différentes résistances, avec ancrage porte et guide.', price: 28000,  category: 'Sport', stock: 25 },
    { module: 'boutique', name: 'Rouleau de massage foam',     description: 'Foam roller haute densité EVA pour récupération musculaire et étirements.', price: 24000,  category: 'Sport', stock: 18 },
    { module: 'boutique', name: 'Protège-tibias football',     description: 'Protège-tibias anatomiques avec chaussette intégrée, homologués FIFA.', price: 15000,  category: 'Sport', stock: 22 },
    { module: 'boutique', name: 'Ballon de foot taille 5',     description: 'Ballon officiel cousu main, 32 panneaux PU, résistant à l\'eau.', price: 45000,  category: 'Sport', stock: 10 },
    { module: 'boutique', name: 'Lunettes de natation pro',    description: 'Anti-UV, anti-buée, joint silicone, réglage facile. Idéales pour la compétition.', price: 20000,  category: 'Natation', stock: 30 },
    { module: 'boutique', name: 'Bonnet de bain silicone',     description: 'Bonnet imperméable haute résistance, protège les cheveux du chlore.', price: 8000,   category: 'Natation', stock: 45 },
    { module: 'boutique', name: 'Palmes entraînement piscine', description: 'Palmes courtes pour améliorer technique et force de propulsion.', price: 32000,  category: 'Natation', stock: 12 },
    // Bien-être & Beauté
    { module: 'boutique', name: 'Shampoing kératine 500ml',    description: 'Shampoing professionnel à la kératine, restructurant, sans sulfates.', price: 25000,  category: 'Beauté', stock: 35 },
    { module: 'boutique', name: 'Masque capillaire argan',     description: 'Masque nourrissant à l\'huile d\'argan, 300ml, brillance et douceur garanties.', price: 18000,  category: 'Beauté', stock: 28 },
    { module: 'boutique', name: 'Kit manucure professionnel',  description: '10 pièces inox stérilisables, coffret cadeau, idéal pour soins à domicile.', price: 30000,  category: 'Beauté', stock: 20 },
    // Accessoires & Lifestyle
    { module: 'boutique', name: 'Casquette Arenah brodée',     description: 'Casquette snapback premium, broderie Arenah, réglable, taille unique.', price: 15000,  category: 'Mode', stock: 60 },
    { module: 'boutique', name: 'T-shirt Arenah sport',        description: 'T-shirt technique évacuation de l\'humidité, coupe athletic, logo Arenah.', price: 22000,  category: 'Mode', stock: 50 },
    { module: 'boutique', name: 'Sac de sport 40L',            description: 'Sac de sport spacieux, compartiment chaussures séparé, tissu imperméable.', price: 55000,  category: 'Mode', stock: 15 },
    { module: 'boutique', name: 'Bracelet silicone sport',     description: 'Bracelet connecté waterproof, podomètre, compteur calories, notification smartphone.', price: 120000, category: 'Technologie', stock: 8 },
    { module: 'boutique', name: 'Écouteurs sport bluetooth',   description: 'Écouteurs sans fil IP67, autonomie 8h, crochets oreilles, son immersif.', price: 95000,  category: 'Technologie', stock: 10 },
    // Compléments alimentaires
    { module: 'boutique', name: 'Protéines whey chocolat 1kg', description: 'Protéines de lactosérum isolées, 25g de protéines par dose, sans gluten.', price: 80000,  category: 'Nutrition', stock: 20 },
    { module: 'boutique', name: 'BCAA en poudre fraise 300g',  description: 'Acides aminés ramifiés 2:1:1, récupération musculaire optimale, sans sucre.', price: 45000,  category: 'Nutrition', stock: 18 },
    { module: 'boutique', name: 'Barre énergétique x12',       description: 'Pack 12 barres céréales-fruits secs, 200 kcal/barre, sans additifs.', price: 30000,  category: 'Nutrition', stock: 25 },
  ];

  // ── 7. PRODUITS RESTAURANT ───────────────────────────────────────────────
  const restaurant = [
    // Entrées
    { module: 'restaurant', name: 'Salade Arenah',              description: 'Roquette, tomates cerises, avocat, crevettes grillées, vinaigrette citron-basilic.', price: 18000,  category: 'Entrées', stock: 999 },
    { module: 'restaurant', name: 'Soupe de poisson malgache',  description: 'Bouillon aromatique au gingembre et citronnelle, poisson blanc et légumes du jardin.', price: 12000,  category: 'Entrées', stock: 999 },
    { module: 'restaurant', name: 'Plateau de crudités',        description: 'Assortiment de légumes frais de saison avec sauce trempette maison.', price: 10000,  category: 'Entrées', stock: 999 },
    { module: 'restaurant', name: 'Nems aux légumes x4',        description: 'Quatre nems croustillants garnis de légumes sautés, sauce aigre-douce maison.', price: 14000,  category: 'Entrées', stock: 999 },
    // Plats viandes
    { module: 'restaurant', name: 'Zébu grillé sauce vanille',  description: 'Entrecôte de zébu malgache 250g, grillée à la perfection, sauce vanille-poivre vert, frites maison.', price: 42000,  category: 'Plats', stock: 999 },
    { module: 'restaurant', name: 'Poulet rôti romarin',        description: 'Demi-poulet fermier rôti au romarin et citron, pommes de terre fondantes, jus de cuisson.', price: 28000,  category: 'Plats', stock: 999 },
    { module: 'restaurant', name: 'Burger Arenah signature',    description: 'Pain brioché maison, steak haché 180g, cheddar fondu, bacon, oignons confits, sauce secrète.', price: 25000,  category: 'Plats', stock: 999 },
    { module: 'restaurant', name: 'Côtes de porc caramélisées', description: 'Travers de porc marinés 24h, laqués au miel et sauce soja, purée de patate douce.', price: 32000,  category: 'Plats', stock: 999 },
    // Plats poisson & fruits de mer
    { module: 'restaurant', name: 'Crevettes sautées à l\'ail', description: 'Grosses crevettes tigrées de Madagascar sautées à l\'huile d\'olive, ail et persil, riz blanc.', price: 38000,  category: 'Plats', stock: 999 },
    { module: 'restaurant', name: 'Filet de capitaine grillé',  description: 'Filet de capitaine de l\'océan Indien grillé, sauce tomate-coriandre, légumes vapeur.', price: 35000,  category: 'Plats', stock: 999 },
    { module: 'restaurant', name: 'Plateau fruits de mer',      description: 'Langoustines, crevettes, poulpe grillé, sauce mayonnaise citronnée. Pour 2 personnes.', price: 75000,  category: 'Plats', stock: 999 },
    // Plats végétariens
    { module: 'restaurant', name: 'Curry légumes coco',         description: 'Légumes de saison mijotés au lait de coco et curry doux, riz basmati au jasmin.', price: 18000,  category: 'Végétarien', stock: 999 },
    { module: 'restaurant', name: 'Pasta primavera',            description: 'Penne aux légumes printaniers, sauce tomate-basilic, parmesan râpé, huile d\'olive.', price: 20000,  category: 'Végétarien', stock: 999 },
    // Desserts
    { module: 'restaurant', name: 'Fondant chocolat coulant',   description: 'Fondant au chocolat noir 70% cœur coulant, boule de glace vanille bourbon.', price: 12000,  category: 'Desserts', stock: 999 },
    { module: 'restaurant', name: 'Salade de fruits tropicaux', description: 'Mangue, ananas, papaye, litchi, coulis de passion, menthe fraîche.', price: 9000,   category: 'Desserts', stock: 999 },
    { module: 'restaurant', name: 'Crème brûlée vanille',       description: 'Crème brûlée à la vanille de Madagascar, caramel craquant façon traditionnel.', price: 10000,  category: 'Desserts', stock: 999 },
    { module: 'restaurant', name: 'Tiramisu café',              description: 'Tiramisu classique au café arabica, mascarpone crémeux, cacao en poudre.', price: 11000,  category: 'Desserts', stock: 999 },
    // Boissons
    { module: 'restaurant', name: 'Jus de fruits frais',        description: 'Jus pressé minute au choix : mangue, ananas, maracuja, pastèque ou mélange tropical.', price: 6000,   category: 'Boissons', stock: 999 },
    { module: 'restaurant', name: 'Eau minérale 50cl',          description: 'Eau minérale naturelle ou gazeuse.', price: 2000,   category: 'Boissons', stock: 999 },
    { module: 'restaurant', name: 'Café espresso',              description: 'Espresso arabica de Madagascar, torréfaction artisanale, servi avec sucre de canne.', price: 4000,   category: 'Boissons', stock: 999 },
    { module: 'restaurant', name: 'Thé & infusions',            description: 'Sélection de thés et infusions de Madagascar : vanille, gingembre, citronnelle.', price: 4500,   category: 'Boissons', stock: 999 },
    { module: 'restaurant', name: 'Smoothie énergétique',       description: 'Banane, épinards, lait de coco, miel, graines de chia — boost naturel post-sport.', price: 8000,   category: 'Boissons', stock: 999 },
    // Menu enfant
    { module: 'restaurant', name: 'Menu enfant complet',        description: 'Chicken nuggets ou pâtes beurre, frites, jus de fruit, dessert surprise. Pour -12 ans.', price: 15000,  category: 'Menu Enfant', stock: 999 },
  ];

  await insertProducts(boutique);
  console.log(`✅  Boutique – ${boutique.length} produits insérés`);

  await insertProducts(restaurant);
  console.log(`✅  Restaurant – ${restaurant.length} produits insérés`);

  // ── 8. VÉRIFICATION FINALE ──────────────────────────────────────────────
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)               as users,
      (SELECT COUNT(*) FROM products WHERE module='boutique')   as boutique,
      (SELECT COUNT(*) FROM products WHERE module='restaurant') as restaurant,
      (SELECT COUNT(*) FROM hotel_rooms)         as hotel_rooms,
      (SELECT COUNT(*) FROM shows)               as shows,
      (SELECT COUNT(*) FROM event_halls)         as event_halls,
      (SELECT COUNT(*) FROM gym_plans)           as gym_plans,
      (SELECT COUNT(*) FROM gym_coaches)         as gym_coaches,
      (SELECT COUNT(*) FROM pool_pass_types)     as pool_pass_types,
      (SELECT COUNT(*) FROM salon_services)      as salon_services,
      (SELECT COUNT(*) FROM field_slots)         as field_slots,
      (SELECT COUNT(*) FROM cybercafe_stations)  as cybercafe_stations,
      (SELECT COUNT(*) FROM cybercafe_durations) as cybercafe_durations
  `);

  console.log('\n📊  État final de la base :');
  const r = counts.rows[0];
  console.table({
    'Utilisateurs':          r.users,
    'Produits Boutique':     r.boutique,
    'Produits Restaurant':   r.restaurant,
    'Chambres Hôtel':        r.hotel_rooms,
    'Spectacles':            r.shows,
    'Salles Événement':      r.event_halls,
    'Plans Gym':             r.gym_plans,
    'Coachs Gym':            r.gym_coaches,
    'Forfaits Piscine':      r.pool_pass_types,
    'Services Salon':        r.salon_services,
    'Créneaux Terrain':      r.field_slots,
    'Postes Cybercafé':      r.cybercafe_stations,
    'Durées Cybercafé':      r.cybercafe_durations,
  });

  console.log('\n🔑  Comptes de connexion :');
  console.log(`   superadmin@arenah.mg       →  ${ADMIN_PASSWORD}  (super_admin)`);
  console.log(`   proprietaire@arenah.mg     →  ${ADMIN_PASSWORD}  (proprietaire)`);
  console.log(`   admin.<module>@arenah.mg   →  ${ADMIN_PASSWORD}  (admin_module)`);
  console.log('     modules : boutique, restaurant, hotel, gym, salon, field,');
  console.log('               pool, event, spectacles, cybercafe, kids');
  console.log(`   caissier@arenah.mg         →  ${ADMIN_PASSWORD}  (caissier)`);
  console.log(`   client@arenah.mg           →  ${CLIENT_PASSWORD} (client)`);
  console.log('\n✅  Seed terminé avec succès !\n');

  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed échoué :', err.message);
  process.exit(1);
});
