// Seed the restaurant menu with all ARENAH dishes
// Run once to populate localStorage with the complete menu
import { generateId } from './utils/generateId';

const ARENAH_MENU: { name: string; price: number; category: string; ingredients: string }[] = [
  // SNACK
  { name: 'NEM Viande 6p', price: 10000, category: 'Snack', ingredients: 'Nem, viande' },
  { name: 'NEM Fruits de mer 6p', price: 12000, category: 'Snack', ingredients: 'Nem, fruits de mer' },
  { name: 'Sambos Viande 8p', price: 10000, category: 'Snack', ingredients: 'Sambos, viande' },

  // BURGER
  { name: 'Beef Burger', price: 20000, category: 'Burger', ingredients: '' },
  { name: 'Crispy Chicken Burger', price: 20000, category: 'Burger', ingredients: '' },
  { name: 'Cheese Burger', price: 20000, category: 'Burger', ingredients: '' },
  { name: 'Double Cheese Burger', price: 25000, category: 'Burger', ingredients: '' },

  // PANINI
  { name: 'Panini Poulet', price: 12000, category: 'Panini', ingredients: '' },
  { name: 'Panini Jambon & Fromage', price: 15000, category: 'Panini', ingredients: '' },
  { name: 'Panini Spécial Arena', price: 20000, category: 'Panini', ingredients: '' },

  // HOTDOG & TACOS
  { name: 'Hotdog', price: 20000, category: 'Hotdog & Tacos', ingredients: '' },
  { name: 'Tacos Spécial Arena', price: 25000, category: 'Hotdog & Tacos', ingredients: '' },

  // FRITTE
  { name: 'Fritte Nature', price: 5000, category: 'Fritte', ingredients: '' },
  { name: 'Fritte Fromage', price: 8000, category: 'Fritte', ingredients: '' },

  // PANNÉ & FRITURE
  { name: 'Nuggets de Poulet 6p', price: 15000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Crispy Tender 8p', price: 20000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Croquette de Poulet 4p', price: 20000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Beignet/Panné de Calmar 10p', price: 20000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Beignet/Panné de Crevette 10p', price: 20000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Poulet Fritte Coréenne 8p', price: 20000, category: 'Panné & Friture', ingredients: '' },
  { name: 'Poulet Fritte Japonaise (Karaage) 8p', price: 20000, category: 'Panné & Friture', ingredients: '' },

  // POUTINE
  { name: 'Poutine (pommes frites, sauce fromage, viande, mayo)', price: 20000, category: 'Poutine', ingredients: 'Pommes frites, sauce fromage, viande, mayonnaise' },
  { name: 'Fritte Coréenne Bœuf Mayo-Sriracha Cornichon', price: 28000, category: 'Poutine', ingredients: '' },
  { name: 'Fritte Gourmande Bistro Bœuf Fromage Coulant Œuf', price: 30000, category: 'Poutine', ingredients: '' },

  // VIANDE DE BŒUF
  { name: 'Bœuf sauté au gingembre et sésame', price: 20000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Bœuf sauté à l\'oignon et sauce soja', price: 20000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Bœuf sauté au brocoli et carotte', price: 24000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Bœuf Loc Lac', price: 24000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Steak Fritte avec pomme fritte ou salade', price: 24000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Entrecôte de bœuf au beurre bleu', price: 24000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Escalope de bœuf savoyarde sauce reblochon lardons', price: 24000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Pavé de zébu aux crevettes sauce champignon', price: 28000, category: 'Viande de Bœuf', ingredients: '' },
  { name: 'Tournedos de zébu au foie gras', price: 30000, category: 'Viande de Bœuf', ingredients: '' },

  // VIANDE DE PORC
  { name: 'Émincé de porc au curry doux', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Côte de porc panée', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Côte de porc grillée à la provinciale', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Sauté de porc à l\'ananas sauce aigre-doux', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Travers de porc caramélisé et sésame', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Travers de porc à l\'américaine BBQ', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Crayson sauté aux émincés de porc', price: 25000, category: 'Viande de Porc', ingredients: '' },
  { name: 'Rôti de porc aux ananas sauce dijonnaise', price: 25000, category: 'Viande de Porc', ingredients: '' },

  // VIANDE DE POULET
  { name: 'Sauté de poulet à l\'orange', price: 25000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Sauté de poulet au miel Sriracha', price: 25000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Poulet Général Tao', price: 25000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Cuisse de poulet BBQ caramélisée', price: 25000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Ailes de poulet au miel et balsamique', price: 25000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Poulet sauté aux noix de cajou', price: 28000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Escalope de poulet cordon bleu', price: 28000, category: 'Viande de Poulet', ingredients: '' },
  { name: 'Roulade de poulet farcie champignons fromage', price: 30000, category: 'Viande de Poulet', ingredients: '' },

  // VIANDE DE CANARD
  { name: 'Cuisse de canard confite 4 épices pommes de terre', price: 28000, category: 'Viande de Canard', ingredients: '' },
  { name: 'Parmentier de canard au thym ail confit', price: 30000, category: 'Viande de Canard', ingredients: '' },
  { name: 'Magret de canard caramélisé à l\'orange', price: 35000, category: 'Viande de Canard', ingredients: '' },

  // VIANDE DE MOUTON
  { name: 'Côtelette d\'agneau grillée au romarin', price: 25000, category: 'Viande de Mouton', ingredients: '' },
  { name: 'Souris d\'agneau confite bière brune épices fruits secs', price: 28000, category: 'Viande de Mouton', ingredients: '' },
  { name: 'Carré d\'agneau pané fromage herbes', price: 28000, category: 'Viande de Mouton', ingredients: '' },

  // FRUITS DE MER
  { name: 'Crabe farci', price: 25000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Gambas poêlées sauce crème curry coriandre combava', price: 25000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Crevettes sautées ail persil', price: 25000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Crevettes à la sauce huître', price: 27000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Calmars sautés aux légumes', price: 27000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Crevettes au curcuma lait de coco', price: 28000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Calmars sautés sauce piquante', price: 28000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Portefeuille de capitaine crème ail', price: 28000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Filet de sole meunière', price: 28000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Poulpe grillé au beurre citronné', price: 28000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Crevettes aux œufs', price: 30000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Poisson vapeur au gingembre', price: 30000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Cuisse de nymphe à la provençale', price: 30000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Sauté de fruits de mer tofu légumes', price: 35000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Duo de fruits de mer sauce vanille', price: 35000, category: 'Fruits de Mer', ingredients: '' },
  { name: 'Langouste grillée herbes citron', price: 35000, category: 'Fruits de Mer', ingredients: '' },

  // BROCHETTES
  { name: 'Brochette Zébu', price: 20000, category: 'Brochettes', ingredients: '' },
  { name: 'Brochette Poulet', price: 20000, category: 'Brochettes', ingredients: '' },
  { name: 'Brochette Crevettes', price: 25000, category: 'Brochettes', ingredients: '' },
  { name: 'Brochette Fruits de mer', price: 30000, category: 'Brochettes', ingredients: '' },

  // TEPPANYAKI
  { name: 'Teppanyaki Poulet', price: 8000, category: 'Teppanyaki', ingredients: '' },
  { name: 'Teppanyaki Zébu', price: 8000, category: 'Teppanyaki', ingredients: '' },
  { name: 'Teppanyaki Porc', price: 20000, category: 'Teppanyaki', ingredients: '' },
  { name: 'Teppanyaki Fruits de mer', price: 25000, category: 'Teppanyaki', ingredients: '' },

  // BRÈDES & LÉGUMES
  { name: 'Bok choy sauté à l\'ail', price: 10000, category: 'Brèdes & Légumes', ingredients: '' },
  { name: 'Haricots verts sautés ail pimenté', price: 10000, category: 'Brèdes & Légumes', ingredients: '' },
  { name: 'Brocoli chinois sauce huître ail', price: 5000, category: 'Brèdes & Légumes', ingredients: '' },
  { name: 'Tofu végétarien', price: 8000, category: 'Brèdes & Légumes', ingredients: '' },
  { name: 'Tofu Tévigaku', price: 8000, category: 'Brèdes & Légumes', ingredients: '' },
  { name: 'Chou chinois sauté au tofu', price: 8000, category: 'Brèdes & Légumes', ingredients: '' },

  // MINE SAO
  { name: 'Mine sao au poulet', price: 8000, category: 'Mine Sao', ingredients: '' },
  { name: 'Mine sao Tsa-Tsiou', price: 8000, category: 'Mine Sao', ingredients: '' },
  { name: 'Nouilles sautées poulet caramélisé', price: 8000, category: 'Mine Sao', ingredients: '' },
  { name: 'Mine sao fruits de mer', price: 25000, category: 'Mine Sao', ingredients: '' },
  { name: 'Mine sao spécial Arena', price: 30000, category: 'Mine Sao', ingredients: '' },

  // PÂTES
  { name: 'Spaghetti Bolognaise', price: 5000, category: 'Pâtes', ingredients: '' },
  { name: 'Spaghetti Carbonara', price: 8000, category: 'Pâtes', ingredients: '' },
  { name: 'Penne poulet champignons fromage', price: 20000, category: 'Pâtes', ingredients: '' },
  { name: 'Penne aux 4 fromages', price: 20000, category: 'Pâtes', ingredients: '' },
  { name: 'Tagliatelles fruits de mer', price: 25000, category: 'Pâtes', ingredients: '' },

  // SOUPES
  { name: 'Crème de légumes au fromage', price: 10000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe Van-Tan', price: 5000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe Van-Tan Mine', price: 7000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe à l\'oignon gratinée', price: 7000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe de poisson', price: 7000, category: 'Soupes', ingredients: '' },
  { name: 'Thock spécial', price: 20000, category: 'Soupes', ingredients: '' },
  { name: 'Bisque aux fruits de mer', price: 20000, category: 'Soupes', ingredients: '' },
  { name: 'Ramen poulet et porc', price: 25000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe aux fruits de mer', price: 25000, category: 'Soupes', ingredients: '' },
  { name: 'Soupe spéciale Arena', price: 25000, category: 'Soupes', ingredients: '' },

  // RIZ
  { name: 'Riz cantonais au poulet', price: 8000, category: 'Riz', ingredients: '' },
  { name: 'Riz cantonais Tsa-Tsiou', price: 8000, category: 'Riz', ingredients: '' },
  { name: 'Risotto aux champignons de Paris', price: 20000, category: 'Riz', ingredients: '' },
  { name: 'Riz cantonais fruits de mer', price: 25000, category: 'Riz', ingredients: '' },
  { name: 'Riz cantonais spécial Arena', price: 25000, category: 'Riz', ingredients: '' },
  { name: 'Bol renversé spécial Arena', price: 25000, category: 'Riz', ingredients: '' },
  { name: 'Paella fruits de mer et poulet', price: 30000, category: 'Riz', ingredients: '' },

  // PLATS MALAGASY
  { name: 'Hen\'omby sy patsamena', price: 6000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Rambon\'omby sy tsaramaso rony', price: 6000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Soupe Silamangany', price: 7000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Hen\'omby ritra de l\'Imerina', price: 8000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Lelan\'omby sy petits pois', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Tripes sy henakisoa', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Tongon-kisoa + Tongo gasy', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Henakisoa sy ravitoto au coco', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Akoho gasy rony', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Tilapia (sauce ou frit)', price: 20000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Romazava Royale', price: 22000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Tilapia sy voanjobory', price: 25000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Akoho gasy ritra ou sauce', price: 25000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Duo de varanga', price: 25000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Amalona sy henakisoa', price: 25000, category: 'Plats Malagasy', ingredients: '' },
  { name: 'Manaramolotra', price: 25000, category: 'Plats Malagasy', ingredients: '' },

  // DESSERTS
  { name: 'Coupe de fruits à la cannelle', price: 8000, category: 'Desserts', ingredients: '' },
  { name: 'Cœur coulant chocolat boule de glace coulis', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Panna cotta coulis de fruits de saison', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Crème renversée caramélisée coco', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Crème brûlée à la vanille', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Brownie banane boule de glace', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Pancake pommes caramélisées', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Verrine 3 mousses chocolat', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Tiramisu façon du chef', price: 10000, category: 'Desserts', ingredients: '' },
  { name: 'Coupe de glace spéciale Arena', price: 10000, category: 'Desserts', ingredients: '' },

  // PIZZAS
  { name: 'Pizza Margherita', price: 20000, category: 'Pizzas', ingredients: 'Sauce tomate, fromage, origan, basilic, olive' },
  { name: 'Pizza Bolognaise', price: 20000, category: 'Pizzas', ingredients: 'Sauce tomate, viande hachée, oignon, fromage, origan, basilic, olive, poivron' },
  { name: 'Pizza Hawaïenne', price: 25000, category: 'Pizzas', ingredients: 'Poulet, ananas, origan, fromage, olive, oignon' },
  { name: 'Pizza 4 Fromages', price: 30000, category: 'Pizzas', ingredients: 'Crème fraîche, cheddar, fromage local, mozzarella, gouda, origan' },
  { name: 'Pizza Royale', price: 30000, category: 'Pizzas', ingredients: 'Coulis tomate, jambon, poulet, champignon, oignon, fromage, crevette, origan, roquette, olive' },
  { name: 'Pizza Carbonara', price: 30000, category: 'Pizzas', ingredients: 'Crème fraîche, jambon, lardons, œufs, fromage, origan, olive' },
  { name: 'Pizza Poulet Massala', price: 30000, category: 'Pizzas', ingredients: 'Sauce tomate, poulet massala, champignon, oignon, origan, olive, fromage' },
  { name: 'Pizza Catalane', price: 30000, category: 'Pizzas', ingredients: 'Sauce tomate, merguez, poivron, fromage, olive, origan' },
  { name: 'Pizza Poulet Sauce BBQ', price: 35000, category: 'Pizzas', ingredients: 'Sauce BBQ, poulet, fromage, origan, olive, oignon' },
  { name: 'Pizza Spécial Arena', price: 35000, category: 'Pizzas', ingredients: 'Crème fraîche, jambon, poulet, saucisse, crevette, champignon, origan, olive, œuf, poivron, fromage' },

  // PLATS INDIENS - PAINS
  { name: 'Naan au fromage', price: 5000, category: 'Plats Indiens - Pains', ingredients: '' },
  { name: 'Paratha', price: 6000, category: 'Plats Indiens - Pains', ingredients: '' },
  { name: 'Chapatis', price: 5000, category: 'Plats Indiens - Pains', ingredients: '' },

  // PLATS INDIENS - POULET
  { name: 'Beignets d\'aubergine à l\'indienne', price: 10000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Beignets aux oignons (Onion Bhaji)', price: 5000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Croquettes de poisson à l\'indienne', price: 20000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Omelette indienne', price: 20000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Pakoras d\'épinards', price: 10000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Khimo (avec Naan) ou riz basmati', price: 20000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Caviar d\'aubergine pâte de curry', price: 5000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Butter Chicken (poulet au beurre)', price: 25000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Poulet Tikka Massala', price: 25000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Poulet Tandoori Massala', price: 25000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Poulet Korma', price: 25000, category: 'Plats Indiens - Poulet', ingredients: '' },
  { name: 'Poulet indien au curry lait de coco', price: 28000, category: 'Plats Indiens - Poulet', ingredients: '' },

  // PLATS INDIENS - BŒUF
  { name: 'Bœuf épicé à l\'indienne', price: 28000, category: 'Plats Indiens - Bœuf', ingredients: '' },
  { name: 'Bœuf Bengali', price: 28000, category: 'Plats Indiens - Bœuf', ingredients: '' },
  { name: 'Joue de bœuf fondante panais crème de coco', price: 28000, category: 'Plats Indiens - Bœuf', ingredients: '' },

  // PLATS INDIENS - VÉGÉTARIEN
  { name: 'Haricots blancs à l\'indienne', price: 5000, category: 'Plats Indiens - Végétarien', ingredients: '' },
  { name: 'Rajma (haricot rouge indien)', price: 5000, category: 'Plats Indiens - Végétarien', ingredients: '' },
  { name: 'Le Daal (Pankaj Sharma)', price: 8000, category: 'Plats Indiens - Végétarien', ingredients: '' },
  { name: 'Curry de pois chiche lait de coco', price: 8000, category: 'Plats Indiens - Végétarien', ingredients: '' },
  { name: 'Rogan Josh végétarien', price: 8000, category: 'Plats Indiens - Végétarien', ingredients: '' },

  // PLATS INDIENS - AGNEAU
  { name: 'Côtelettes d\'agneau à l\'indienne', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },
  { name: 'Côtelettes d\'agneau Garam Massala', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },
  { name: 'Kalia d\'agneau curry épices yaourt', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },
  { name: 'Agneau Rogan Josh', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },
  { name: 'Agneau Bhuna', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },
  { name: 'Agneau Vindaloo', price: 28000, category: 'Plats Indiens - Agneau', ingredients: '' },

  // PLATS INDIENS - FRUITS DE MER
  { name: 'Curry de crabe à l\'indienne', price: 30000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },
  { name: 'Filet de poisson à l\'indienne', price: 28000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },
  { name: 'Crevettes Massala', price: 30000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },
  { name: 'Curry de crevettes Goa', price: 30000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },
  { name: 'Brochette de fruits de mer à l\'indienne', price: 35000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },
  { name: 'Curry de gambas noix de coco', price: 35000, category: 'Plats Indiens - Fruits de Mer', ingredients: '' },

  // PLATS INDIENS - RIZ
  { name: 'Riz parfumé à l\'indienne', price: 20000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Riz indien aux fruits secs', price: 20000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Riz au safran', price: 20000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Biryani à l\'agneau', price: 30000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Biryani au poulet', price: 30000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Biryani aux fruits de mer', price: 35000, category: 'Plats Indiens - Riz', ingredients: '' },
  { name: 'Biryani aux bœufs', price: 30000, category: 'Plats Indiens - Riz', ingredients: '' },
];

export function seedRestaurantMenu() {
  const SEED_KEY = 'resto_menu_seeded_v2';
  if (localStorage.getItem(SEED_KEY)) return; // Already seeded

  const existing = JSON.parse(localStorage.getItem('mod_dishes') || '[]');
  const existingNames = new Set(existing.map((d: any) => d.name.toLowerCase()));

  const newDishes = ARENAH_MENU
    .filter(d => !existingNames.has(d.name.toLowerCase()))
    .map(d => ({
      id: generateId(),
      name: d.name,
      price: d.price,
      category: d.category,
      ingredients: d.ingredients,
      available: true,
    }));

  const all = [...existing, ...newDishes];
  localStorage.setItem('mod_dishes', JSON.stringify(all));
  localStorage.setItem(SEED_KEY, 'true');
  console.log(`[ARENAH] Menu seeded: ${newDishes.length} new dishes added (${all.length} total)`);
}
