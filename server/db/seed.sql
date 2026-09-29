-- ============================================================
-- ARENAH — SEED DATA (données de démonstration)
-- Exécuter APRÈS schema.pg.sql
-- Mot de passe de tous les comptes démo : arenah2025
-- ============================================================

-- ── 1. UTILISATEURS DÉMO (pour reviews / témoignages) ────────

INSERT INTO users (id, email, fullname, phone, password_hash, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'miora.rakoto@demo.mg',  'Miora Rakoto',    '+261 34 12 345 67', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('a1000000-0000-0000-0000-000000000002', 'hery.randria@demo.mg',  'Hery Randria',    '+261 33 87 654 32', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('a1000000-0000-0000-0000-000000000003', 'vola.rasolo@demo.mg',   'Vola Rasolo',     '+261 32 56 789 01', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('a1000000-0000-0000-0000-000000000004', 'tojo.rabe@demo.mg',     'Tojo Rabe',       '+261 34 99 888 77', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('a1000000-0000-0000-0000-000000000005', 'nina.andry@demo.mg',    'Nina Andriamamy', '+261 33 11 222 33', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('a1000000-0000-0000-0000-000000000006', 'jo.andria@demo.mg',     'Jo Andriamasinoro','+261 32 44 555 66','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client')
ON CONFLICT (email) DO NOTHING;

-- ── 2. PRODUITS BOUTIQUE ──────────────────────────────────────

INSERT INTO products (id, module, name, description, price, category, image_url, stock, active) VALUES

  -- Équipements
  ('b1000000-0000-0000-0000-000000000001', 'boutique',
   'Ballon de football Pro', 'Ballon FIFA Quality Pro taille 5, coutures renforcées, compatible gazon synthétique et naturel',
   45000, 'Équipements', 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=80&auto=format&fit=crop', 15, true),

  ('b1000000-0000-0000-0000-000000000002', 'boutique',
   'Raquette de tennis Wilson', 'Cadre aluminium léger 270g, cordée polyester, grip taille L2, idéale débutant-intermédiaire',
   120000, 'Équipements', 'https://images.unsplash.com/photo-1617083934555-ac9d92e85f13?w=600&q=80&auto=format&fit=crop', 8, true),

  ('b1000000-0000-0000-0000-000000000003', 'boutique',
   'Tapis de yoga premium', 'Tapis 6mm antidérapant 183×61cm, matière TPE écologique, double face, livré avec sangle de transport',
   55000, 'Équipements', 'https://images.unsplash.com/photo-1601925228961-bf043a0d7a26?w=600&q=80&auto=format&fit=crop', 20, true),

  ('b1000000-0000-0000-0000-000000000004', 'boutique',
   'Haltères 2×5 kg', 'Paire d''haltères caoutchoutés, poignée ergonomique chromée, surface antirouille garantie 3 ans',
   80000, 'Équipements', 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80&auto=format&fit=crop', 10, true),

  -- Accessoires
  ('b1000000-0000-0000-0000-000000000005', 'boutique',
   'Gants de boxe 12oz', 'Gants entraînement simili-cuir, rembourrage gel multi-couches, fermeture velcro réglable',
   65000, 'Accessoires', 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&q=80&auto=format&fit=crop', 12, true),

  ('b1000000-0000-0000-0000-000000000006', 'boutique',
   'Lunettes de natation Speedo', 'Verres anti-buée UV400, joint silicone ergonomique, réglage rapide, 6 coloris disponibles',
   25000, 'Accessoires', 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80&auto=format&fit=crop', 30, true),

  ('b1000000-0000-0000-0000-000000000007', 'boutique',
   'Sac de sport 35L', 'Polyester 600D imperméable, compartiment chaussures ventilé, sangle épaule réglable, 5 poches',
   70000, 'Accessoires', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&auto=format&fit=crop', 18, true),

  ('b1000000-0000-0000-0000-000000000008', 'boutique',
   'Montre fitness Mi Band', 'Suivi fréquence cardiaque + SpO2, GPS, 5ATM waterproof, autonomie 14 jours, écran AMOLED',
   180000, 'Accessoires', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80&auto=format&fit=crop', 5, true),

  -- Vêtements
  ('b1000000-0000-0000-0000-000000000009', 'boutique',
   'Short de bain homme', 'Tissu stretch séchage rapide, doublure filet, poches latérales, taille élastique avec cordon',
   22000, 'Vêtements', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600&q=80&auto=format&fit=crop', 25, true),

  ('b1000000-0000-0000-0000-000000000010', 'boutique',
   'T-shirt compression sport', 'Manches longues, tissu respirant 4 voies, technologie anti-odeur, protection UPF 30, tailles S–XXL',
   38000, 'Vêtements', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80&auto=format&fit=crop', 20, true),

  -- Nutrition
  ('b1000000-0000-0000-0000-000000000011', 'boutique',
   'Protéine Whey chocolat 1kg', 'Whey isolate 90%, 24g protéines par dose, sans gluten ni sucres ajoutés, saveur chocolat intense',
   95000, 'Nutrition', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80&auto=format&fit=crop', 15, true),

  ('b1000000-0000-0000-0000-000000000012', 'boutique',
   'Gourde isotherme 750ml', 'Inox double paroi sans BPA, garde froid 24h / chaud 12h, bouchon sport anti-fuite, lavable lave-vaisselle',
   30000, 'Nutrition', 'https://images.unsplash.com/photo-1569237741340-26dc45609e60?w=600&q=80&auto=format&fit=crop', 40, true)

ON CONFLICT (id) DO NOTHING;

-- ── 3. PRODUITS RESTAURANT (menu) ────────────────────────────

INSERT INTO products (id, module, name, description, price, category, image_url, stock, active) VALUES

  -- Entrées
  ('c1000000-0000-0000-0000-000000000001', 'restaurant',
   'Salade composée fraîche', 'Salade verte, tomates cerises, avocat, maïs, vinaigrette citron-miel, croûtons maison',
   12000, 'Entrées', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&auto=format&fit=crop', 50, true),

  ('c1000000-0000-0000-0000-000000000002', 'restaurant',
   'Soupe ravitoto', 'Bouillon traditionnel malgache aux feuilles de manioc pilées, gingembre frais, oignon, crevettes séchées',
   10000, 'Entrées', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80&auto=format&fit=crop', 30, true),

  -- Plats
  ('c1000000-0000-0000-0000-000000000003', 'restaurant',
   'Romazava au bœuf', 'Plat national malgache : bouillon de bœuf aux brèdes morelles et mafana, riz blanc parfumé, accompagné de rougail tomates',
   28000, 'Plats', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop', 40, true),

  ('c1000000-0000-0000-0000-000000000004', 'restaurant',
   'Poulet citron & thym', 'Cuisse de poulet fermier rôtie, sauce citronnée aux herbes fraîches, légumes de saison grillés, riz pilaf',
   25000, 'Plats', 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80&auto=format&fit=crop', 35, true),

  ('c1000000-0000-0000-0000-000000000005', 'restaurant',
   'Pizza Margherita ARENAH', 'Pâte fine levée 24h, sauce tomates San Marzano, mozzarella fior di latte, basilic frais, filet d''huile d''olive',
   22000, 'Plats', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80&auto=format&fit=crop', 20, true),

  ('c1000000-0000-0000-0000-000000000006', 'restaurant',
   'Burger Classic ARENAH', 'Steak haché bœuf 180g, pain brioché toasté, cheddar fondu, salade, tomate, cornichons, sauce maison',
   30000, 'Plats', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop', 25, true),

  ('c1000000-0000-0000-0000-000000000007', 'restaurant',
   'Poisson grillé du jour', 'Poisson frais de Madagascar grillé au charbon, sauce coco-citron, riz blanc, légumes vapeur',
   32000, 'Plats', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80&auto=format&fit=crop', 15, true),

  -- Desserts
  ('c1000000-0000-0000-0000-000000000008', 'restaurant',
   'Mofo gasy au miel', 'Galettes de riz malgaches cuites à la vapeur, sirop de coco artisanal, miel de fleurs de Madagascar',
   8000, 'Desserts', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80&auto=format&fit=crop', 60, true),

  ('c1000000-0000-0000-0000-000000000009', 'restaurant',
   'Glace vanille Bourbon', 'Glace artisanale à la vraie vanille de Madagascar, coulis caramel beurre salé, éclats de noix de coco grillée',
   12000, 'Desserts', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80&auto=format&fit=crop', 50, true),

  -- Boissons
  ('c1000000-0000-0000-0000-000000000010', 'restaurant',
   'Jus frais pressé', 'Jus pressé minute selon disponibilité du jour : mangue, maracuja, corossol, papaye ou grenadelle',
   8000, 'Boissons', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80&auto=format&fit=crop', 100, true),

  ('c1000000-0000-0000-0000-000000000011', 'restaurant',
   'THB (Three Horses Beer)', 'Bière blonde locale malgache 5°, 330ml bien fraîche, icône incontournable de Madagascar',
   6000, 'Boissons', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80&auto=format&fit=crop', 80, true),

  ('c1000000-0000-0000-0000-000000000012', 'restaurant',
   'Café malgache Kianjasoa', 'Café arabica de Kianjasoa torréfié artisanalement, servi en cafetière filtre ou espresso, accompagné d''un biscuit',
   5000, 'Boissons', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80&auto=format&fit=crop', 200, true)

ON CONFLICT (id) DO NOTHING;

-- ── 4. CODES PROMO ───────────────────────────────────────────

INSERT INTO promo_codes (id, code, type, value, min_amount, max_uses, valid_from, valid_until, module, active) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'BIENVENUE15',  'percent', 15, 20000,  200, NOW(), NOW() + INTERVAL '90 days',  NULL,         true),
  ('p1000000-0000-0000-0000-000000000002', 'HOTEL50K',     'fixed',   50000, 300000, 50, NOW(), NOW() + INTERVAL '60 days',  'hotel',      true),
  ('p1000000-0000-0000-0000-000000000003', 'GYM20',        'percent', 20, 30000,  300, NOW(), NOW() + INTERVAL '30 days',  'gym',        true),
  ('p1000000-0000-0000-0000-000000000004', 'RESTO10',      'percent', 10, 15000,  500, NOW(), NOW() + INTERVAL '120 days', 'restaurant', true)
ON CONFLICT (code) DO NOTHING;

-- ── 5. AVIS CLIENTS APPROUVÉS (témoignages home page) ────────

INSERT INTO reviews (id, user_id, module, rating, comment, approved, created_at) VALUES
  ('r1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'hotel',      5,
   'Suite magnifique ! Vue splendide depuis la terrasse et service aux petits soins. Je reviendrai sans hésiter.',
   true, NOW() - INTERVAL '3 days'),

  ('r1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'restaurant', 5,
   'Le Romazava est exceptionnel — goût vraiment authentique, portions généreuses et service rapide. Parfait !',
   true, NOW() - INTERVAL '5 days'),

  ('r1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'gym',        4,
   'Coachs très professionnels et à l''écoute. En 2 mois j''ai perdu 4 kg et je me sens en pleine forme.',
   true, NOW() - INTERVAL '7 days'),

  ('r1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'salon',      5,
   'Marie Rakoto est une artiste ! Coloration parfaitement réalisée et ambiance très agréable. Superbe expérience.',
   true, NOW() - INTERVAL '2 days'),

  ('r1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'show',       5,
   'Concert mémorable ! Son cristallin, lumières magnifiques, salle bien organisée. Une soirée inoubliable.',
   true, NOW() - INTERVAL '10 days'),

  ('r1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'pool',       4,
   'Cours de natation parfaitement encadrés par Razafy. Enfants ravis, eau propre et installations top !',
   true, NOW() - INTERVAL '1 day')

ON CONFLICT (id) DO NOTHING;

-- ── 6. HÔTEL — amenities + images ────────────────────────────

UPDATE hotel_rooms SET
  description  = 'Chambre lumineuse avec lit double queen size, salle de bain privative avec douche italienne et vue sur le jardin paysager.',
  amenities    = '["Wifi 100Mbps","TV HD 42\"","Climatisation","Petit-déjeuner inclus","Coffre-fort","Bureau de travail"]'::jsonb,
  image_url    = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80&auto=format&fit=crop'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE hotel_rooms SET
  description  = 'Chambre spacieuse avec coin salon, décoration contemporaine soignée et vue directe sur la piscine.',
  amenities    = '["Wifi 100Mbps","TV HD 50\"","Climatisation","Minibar garni","Baignoire","Coffre-fort","Petit-déjeuner inclus","Room service"]'::jsonb,
  image_url    = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80&auto=format&fit=crop'
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE hotel_rooms SET
  description  = 'Idéale pour les familles : deux espaces séparés, lits king + lits superposés pour les enfants, grande salle de bain.',
  amenities    = '["Wifi 100Mbps","TV HD 50\"","Climatisation","Coffre-fort","Baignoire","Parking gratuit","Lit bébé sur demande","Petit-déjeuner inclus"]'::jsonb,
  image_url    = 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80&auto=format&fit=crop'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE hotel_rooms SET
  description  = 'Notre suite signature : jacuzzi privatif, terrasse panoramique, service conciergerie dédié et champagne de bienvenue.',
  amenities    = '["Wifi 100Mbps","TV OLED 65\"","Climatisation","Jacuzzi privatif","Minibar premium","Terrasse panoramique","Service en chambre 24h","Coffre-fort","Parking VIP","Petit-déjeuner inclus","Champagne offert"]'::jsonb,
  image_url    = 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80&auto=format&fit=crop'
WHERE id = '00000000-0000-0000-0000-000000000004';

-- ── 7. SPECTACLES — images + catégories ──────────────────────

UPDATE shows SET
  image_url = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop',
  category  = 'Musique'
WHERE id = '40000000-0000-0000-0000-000000000001';

UPDATE shows SET
  image_url = 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80&auto=format&fit=crop',
  category  = 'Danse'
WHERE id = '40000000-0000-0000-0000-000000000002';

UPDATE shows SET
  image_url = 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80&auto=format&fit=crop',
  category  = 'Humour'
WHERE id = '40000000-0000-0000-0000-000000000003';

UPDATE shows SET
  image_url = 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80&auto=format&fit=crop',
  category  = 'Théâtre'
WHERE id = '40000000-0000-0000-0000-000000000004';

-- Ajouter un 5e spectacle pour la variété
INSERT INTO shows (id, title, artist, date, time, venue, category, base_price, image_url, active) VALUES
  ('40000000-0000-0000-0000-000000000005',
   'Soirée Jazz & Soul', 'Ny Feo Quartet',
   (CURRENT_DATE + INTERVAL '45 days')::date,
   '19:30', 'Grande Salle', 'Musique', 30000,
   'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80&auto=format&fit=crop',
   true)
ON CONFLICT DO NOTHING;
