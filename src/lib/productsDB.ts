// Centralized product management across all modules
import { generateId } from './utils/generateId';

function getStore<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}
function setStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export interface CentralProduct {
  id: string;
  barcode?: string;
  name: string;
  price: number;
  moduleType: string;
  stock: number;
  category: string;
  createdAt: string;
}

export const productsDB = {
  getAll: (): CentralProduct[] => getStore('central_products', []),
  
  getByModule: (moduleType: string): CentralProduct[] => {
    return productsDB.getAll().filter(p => p.moduleType === moduleType);
  },

  search: (query: string): CentralProduct[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return productsDB.getAll().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  },

  findByBarcode: (barcode: string): CentralProduct | null => {
    if (!barcode.trim()) return null;
    return productsDB.getAll().find(p => p.barcode === barcode.trim()) || null;
  },

  create: (p: Omit<CentralProduct, 'id' | 'createdAt'>): CentralProduct => {
    const all = productsDB.getAll();
    const n: CentralProduct = { ...p, id: generateId(), createdAt: new Date().toISOString() };
    all.push(n);
    setStore('central_products', all);
    return n;
  },

  update: (id: string, u: Partial<CentralProduct>) => {
    const all = productsDB.getAll();
    const i = all.findIndex(p => p.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('central_products', all); }
  },

  delete: (id: string) => {
    setStore('central_products', productsDB.getAll().filter(p => p.id !== id));
  },

  decrementStock: (id: string, qty: number): boolean => {
    const all = productsDB.getAll();
    const p = all.find(x => x.id === id);
    if (!p || p.stock < qty) return false;
    p.stock -= qty;
    setStore('central_products', all);
    return true;
  },

  incrementStock: (id: string, qty: number) => {
    const all = productsDB.getAll();
    const p = all.find(x => x.id === id);
    if (p) { p.stock += qty; setStore('central_products', all); }
  },

  // Seed restaurant menu data (only once)
  seedRestaurantMenu: () => {
    const existing = productsDB.getByModule('restaurant');
    if (existing.length > 0) return;

    const menuItems: { name: string; price: number; category: string }[] = [
      // PETIT DEJEUNER
      { name: 'Petit déjeuner simple (Gasy)', price: 10000, category: 'Petit Déjeuner' },
      { name: 'Vary @ Anana + Kitoza ou Saucisse', price: 10000, category: 'Petit Déjeuner' },
      { name: 'Vary Sosoa + Kitoza ou Saucisse', price: 10000, category: 'Petit Déjeuner' },
      { name: 'Mokary au Coco', price: 1000, category: 'Petit Déjeuner' },
      { name: 'Pain Choco', price: 4000, category: 'Petit Déjeuner' },
      { name: 'Pain au Raisin', price: 5000, category: 'Petit Déjeuner' },
      { name: 'Croissant', price: 3000, category: 'Petit Déjeuner' },
      { name: 'Petit Déjeuner Continental', price: 25000, category: 'Petit Déjeuner' },
      { name: 'Petit Déjeuner Américain', price: 35000, category: 'Petit Déjeuner' },
      { name: 'Petit Déjeuner Anglais', price: 40000, category: 'Petit Déjeuner' },
      { name: 'Omelette Nature', price: 5000, category: 'Petit Déjeuner' },
      { name: 'Omelette aux Fines Herbes', price: 6000, category: 'Petit Déjeuner' },
      { name: 'Omelette au Fromage', price: 7000, category: 'Petit Déjeuner' },
      { name: 'Omelette au Jambon Fromage', price: 8000, category: 'Petit Déjeuner' },
      { name: 'Œuf sur Plat Nature', price: 5000, category: 'Petit Déjeuner' },
      { name: 'Œuf sur Plat au Fromage', price: 7000, category: 'Petit Déjeuner' },
      { name: 'Œuf sur Plat au Jambon Fromage', price: 7000, category: 'Petit Déjeuner' },
      { name: 'Œuf Brouillé', price: 7000, category: 'Petit Déjeuner' },
      // SALADES & ENTRÉES
      { name: 'Salade Verte', price: 8000, category: 'Entrées' },
      { name: 'Salade Tomate', price: 8000, category: 'Entrées' },
      { name: 'Crudité Saison', price: 15000, category: 'Entrées' },
      { name: 'Salade César', price: 18000, category: 'Entrées' },
      { name: 'Salade Parisienne', price: 18000, category: 'Entrées' },
      { name: 'Ceviche de Poisson', price: 18000, category: 'Entrées' },
      { name: 'Carpaccio de Zébu', price: 18000, category: 'Entrées' },
      { name: 'Assiette Océane', price: 20000, category: 'Entrées' },
      { name: 'Salade du Chef', price: 20000, category: 'Entrées' },
      { name: 'Terrine de Foie Gras', price: 20000, category: 'Entrées' },
      { name: 'Lasagne Bolognaise', price: 20000, category: 'Entrées' },
      { name: 'Vol au Vent Poulet Champignon', price: 25000, category: 'Entrées' },
      { name: 'Gratin de Fruits de Mer', price: 28000, category: 'Entrées' },
      // ROULEAUX DE PRINTEMPS
      { name: 'Rouleaux de Printemps Viande', price: 15000, category: 'Entrées' },
      { name: 'Rouleaux de Printemps Poulet', price: 15000, category: 'Entrées' },
      { name: 'Rouleaux de Printemps Crevette', price: 18000, category: 'Entrées' },
      { name: 'Rouleaux de Printemps Fruits de Mer', price: 20000, category: 'Entrées' },
      // BOISSONS CHAUDES
      { name: 'Café Noir', price: 4000, category: 'Boissons' },
      { name: 'Thé Nature', price: 4000, category: 'Boissons' },
      { name: 'Café au Lait', price: 5000, category: 'Boissons' },
      { name: 'Thé au Lait', price: 5000, category: 'Boissons' },
      { name: 'Expresso', price: 6000, category: 'Boissons' },
      { name: 'Chocolat Chaud', price: 8000, category: 'Boissons' },
      { name: 'Cappuccino', price: 8000, category: 'Boissons' },
      // SNACK
      { name: 'Nem Viande 6P', price: 10000, category: 'Snack' },
      { name: 'Nem Fruits de Mer 6P', price: 12000, category: 'Snack' },
      { name: 'Sambos Viande 8P', price: 10000, category: 'Snack' },
      { name: 'Hot Dog', price: 20000, category: 'Snack' },
      { name: 'Tacos Spécial Arena', price: 25000, category: 'Snack' },
      { name: 'Poutine', price: 20000, category: 'Snack' },
      { name: 'Frites Coréenne au Bœuf', price: 28000, category: 'Snack' },
      { name: 'Frites Gourmande Façon Bistro', price: 30000, category: 'Snack' },
      // BURGER
      { name: 'Beef Burger', price: 20000, category: 'Burger' },
      { name: 'Crispy Chicken Burger', price: 20000, category: 'Burger' },
      { name: 'Cheeseburger', price: 20000, category: 'Burger' },
      { name: 'Double Cheeseburger', price: 25000, category: 'Burger' },
      // PANINI
      { name: 'Panini Poulet', price: 12000, category: 'Panini' },
      { name: 'Panini Jambon et Fromage', price: 15000, category: 'Panini' },
      { name: 'Panini Spécial Arena', price: 20000, category: 'Panini' },
      // FRITES & FRITURE
      { name: 'Frites Nature', price: 5000, category: 'Fritte' },
      { name: 'Frites Fromage', price: 8000, category: 'Fritte' },
      { name: 'Nuggets de Poulet 6P', price: 15000, category: 'Panné & Friture' },
      { name: 'Crispy Tender 8P', price: 20000, category: 'Panné & Friture' },
      { name: 'Croquette de Poulet 4P', price: 20000, category: 'Panné & Friture' },
      { name: 'Beignet de Calmar 10P', price: 20000, category: 'Panné & Friture' },
      { name: 'Beignet de Crevette 10P', price: 20000, category: 'Panné & Friture' },
      { name: 'Poulet Frit Coréen 8P', price: 20000, category: 'Panné & Friture' },
      { name: 'Poulet Frit Japonais (Karaage) 8P', price: 20000, category: 'Panné & Friture' },
      // VIANDE DE BŒUF
      { name: 'Bœuf Sauté au Gingembre', price: 20000, category: 'Viande de Bœuf' },
      { name: 'Bœuf Sauté à l\'Oignon', price: 20000, category: 'Viande de Bœuf' },
      { name: 'Bœuf Sauté au Brocoli', price: 24000, category: 'Viande de Bœuf' },
      { name: 'Bœuf Loc Lac', price: 24000, category: 'Viande de Bœuf' },
      { name: 'Steak Frites', price: 24000, category: 'Viande de Bœuf' },
      { name: 'Entrecôte de Bœuf au Beurre Bleu', price: 24000, category: 'Viande de Bœuf' },
      { name: 'Escalope de Bœuf Savoyarde', price: 24000, category: 'Viande de Bœuf' },
      { name: 'Pavé de Zébu aux Crevettes', price: 28000, category: 'Viande de Bœuf' },
      { name: 'Tournedos de Zébu au Foie Gras', price: 30000, category: 'Viande de Bœuf' },
      // VIANDE DE PORC
      { name: 'Émincé de Porc au Curry', price: 25000, category: 'Viande de Porc' },
      { name: 'Côte de Porc Panée', price: 25000, category: 'Viande de Porc' },
      { name: 'Côte de Porc Grillée', price: 25000, category: 'Viande de Porc' },
      { name: 'Sauté de Porc à l\'Ananas', price: 25000, category: 'Viande de Porc' },
      { name: 'Travers de Porc Caramélisé', price: 25000, category: 'Viande de Porc' },
      { name: 'Travers de Porc BBQ', price: 25000, category: 'Viande de Porc' },
      { name: 'Rôti de Porc aux Ananas', price: 25000, category: 'Viande de Porc' },
      // VIANDE DE POULET
      { name: 'Sauté de Poulet à l\'Orange', price: 25000, category: 'Viande de Poulet' },
      { name: 'Sauté de Poulet au Miel Sriracha', price: 25000, category: 'Viande de Poulet' },
      { name: 'Poulet Général Tao', price: 25000, category: 'Viande de Poulet' },
      { name: 'Cuisse de Poulet BBQ Caramélisée', price: 25000, category: 'Viande de Poulet' },
      { name: 'Ailes de Poulet au Miel', price: 25000, category: 'Viande de Poulet' },
      { name: 'Poulet Sauté aux Noix de Cajou', price: 28000, category: 'Viande de Poulet' },
      { name: 'Escalope de Poulet Cordon Bleu', price: 28000, category: 'Viande de Poulet' },
      { name: 'Roulade de Poulet Farcie', price: 30000, category: 'Viande de Poulet' },
      // VIANDE DE CANARD
      { name: 'Cuisse de Canard Confite', price: 28000, category: 'Viande de Canard' },
      { name: 'Parmentier de Canard', price: 30000, category: 'Viande de Canard' },
      { name: 'Magret de Canard Caramélisé', price: 35000, category: 'Viande de Canard' },
      // VIANDE DE MOUTON
      { name: 'Côtelette d\'Agneau Grillée', price: 25000, category: 'Viande de Mouton' },
      { name: 'Souris d\'Agneau Confite', price: 28000, category: 'Viande de Mouton' },
      { name: 'Carré d\'Agneau Pané', price: 28000, category: 'Viande de Mouton' },
      // FRUITS DE MER
      { name: 'Crabe Farci', price: 25000, category: 'Fruits de Mer' },
      { name: 'Gambas Poêlées au Curry', price: 25000, category: 'Fruits de Mer' },
      { name: 'Crevettes Sautées à l\'Ail', price: 25000, category: 'Fruits de Mer' },
      { name: 'Crevettes Sauce Huître', price: 27000, category: 'Fruits de Mer' },
      { name: 'Calmars Sautés aux Légumes', price: 27000, category: 'Fruits de Mer' },
      { name: 'Crevettes au Curcuma', price: 28000, category: 'Fruits de Mer' },
      { name: 'Calmars Sauce Piquante', price: 28000, category: 'Fruits de Mer' },
      { name: 'Filet de Sole Meunière', price: 28000, category: 'Fruits de Mer' },
      { name: 'Poulpe Grillé au Beurre Citronné', price: 28000, category: 'Fruits de Mer' },
      { name: 'Crevettes aux Œufs', price: 30000, category: 'Fruits de Mer' },
      { name: 'Poisson Vapeur au Gingembre', price: 30000, category: 'Fruits de Mer' },
      { name: 'Sauté de Fruits de Mer au Tofu', price: 35000, category: 'Fruits de Mer' },
      { name: 'Langouste Grillée', price: 35000, category: 'Fruits de Mer' },
      // BROCHETTES
      { name: 'Brochette Zébu', price: 20000, category: 'Brochettes' },
      { name: 'Brochette Poulet', price: 20000, category: 'Brochettes' },
      { name: 'Brochette Crevettes', price: 25000, category: 'Brochettes' },
      { name: 'Brochette Fruits de Mer', price: 30000, category: 'Brochettes' },
      // TEPPANYAKI
      { name: 'Teppanyaki Poulet', price: 8000, category: 'Teppanyaki' },
      { name: 'Teppanyaki Zébu', price: 8000, category: 'Teppanyaki' },
      { name: 'Teppanyaki Porc', price: 20000, category: 'Teppanyaki' },
      { name: 'Teppanyaki Fruits de Mer', price: 25000, category: 'Teppanyaki' },
      // BRÈDES & LÉGUMES
      { name: 'Bok Choy Sauté à l\'Ail', price: 10000, category: 'Brèdes & Légumes' },
      { name: 'Haricots Verts Sautés', price: 10000, category: 'Brèdes & Légumes' },
      { name: 'Brocoli Sauce Huître', price: 5000, category: 'Brèdes & Légumes' },
      { name: 'Tofu Végétarien', price: 8000, category: 'Brèdes & Légumes' },
      { name: 'Chou Chinois Sauté au Tofu', price: 8000, category: 'Brèdes & Légumes' },
      // MINE SAO
      { name: 'Mine Sao au Poulet', price: 8000, category: 'Mine Sao' },
      { name: 'Mine Sao Tsa-Tsiou', price: 8000, category: 'Mine Sao' },
      { name: 'Nouilles Sautées au Poulet Caramélisé', price: 8000, category: 'Mine Sao' },
      { name: 'Mine Sao aux Fruits de Mer', price: 25000, category: 'Mine Sao' },
      { name: 'Mine Sao Spécial Arena', price: 30000, category: 'Mine Sao' },
      // PÂTES
      { name: 'Spaghetti Bolognaise', price: 5000, category: 'Pâtes' },
      { name: 'Spaghetti Carbonara', price: 8000, category: 'Pâtes' },
      { name: 'Penne Poulet Champignons Fromage', price: 20000, category: 'Pâtes' },
      { name: 'Penne aux 4 Fromages', price: 20000, category: 'Pâtes' },
      { name: 'Tagliatelles aux Fruits de Mer', price: 25000, category: 'Pâtes' },
      // SOUPES
      { name: 'Crème de Légumes au Fromage', price: 10000, category: 'Soupes' },
      { name: 'Soupe Van-Tan', price: 5000, category: 'Soupes' },
      { name: 'Soupe Van-Tan Mine', price: 7000, category: 'Soupes' },
      { name: 'Soupe à l\'Oignon Gratinée', price: 7000, category: 'Soupes' },
      { name: 'Soupe de Poisson', price: 7000, category: 'Soupes' },
      { name: 'Thock Spécial', price: 20000, category: 'Soupes' },
      { name: 'Bisque aux Fruits de Mer', price: 20000, category: 'Soupes' },
      { name: 'Ramen Poulet et Porc', price: 25000, category: 'Soupes' },
      { name: 'Soupe aux Fruits de Mer', price: 25000, category: 'Soupes' },
      { name: 'Soupe Spéciale Arena', price: 25000, category: 'Soupes' },
      // RIZ
      { name: 'Riz Cantonais au Poulet', price: 8000, category: 'Riz' },
      { name: 'Riz Cantonais Tsa-Tsiou', price: 8000, category: 'Riz' },
      { name: 'Risotto aux Champignons', price: 20000, category: 'Riz' },
      { name: 'Riz Cantonais Fruits de Mer', price: 25000, category: 'Riz' },
      { name: 'Riz Cantonais Spécial Arena', price: 25000, category: 'Riz' },
      { name: 'Bol Renversé Spécial Arena', price: 25000, category: 'Riz' },
      { name: 'Paella Fruits de Mer et Poulet', price: 30000, category: 'Riz' },
      // PLATS MALAGASY
      { name: 'Hen\'omby sy Patsamena', price: 6000, category: 'Plats Malagasy' },
      { name: 'Rambon\'omby sy Tsaramaso Rony', price: 6000, category: 'Plats Malagasy' },
      { name: 'Soupe Silamangany', price: 7000, category: 'Plats Malagasy' },
      { name: 'Hen\'omby Ritra de l\'Imerina', price: 8000, category: 'Plats Malagasy' },
      { name: 'Lelan\'omby sy Petits Pois', price: 20000, category: 'Plats Malagasy' },
      { name: 'Tripes sy Henakisoa', price: 20000, category: 'Plats Malagasy' },
      { name: 'Tongon-Kisoa + Tongo Gasy', price: 20000, category: 'Plats Malagasy' },
      { name: 'Henakisoa sy Ravitoto au Coco', price: 20000, category: 'Plats Malagasy' },
      { name: 'Akoho Gasy Rony', price: 20000, category: 'Plats Malagasy' },
      { name: 'Tilapia (Sauce ou Frit)', price: 20000, category: 'Plats Malagasy' },
      { name: 'Romazava Royale', price: 22000, category: 'Plats Malagasy' },
      { name: 'Tilapia sy Voanjobory', price: 25000, category: 'Plats Malagasy' },
      { name: 'Akoho Gasy Ritra ou Sauce', price: 25000, category: 'Plats Malagasy' },
      { name: 'Duo de Varanga', price: 25000, category: 'Plats Malagasy' },
      { name: 'Amalona sy Henakisoa', price: 25000, category: 'Plats Malagasy' },
      { name: 'Manaramolotra', price: 25000, category: 'Plats Malagasy' },
      // DESSERTS
      { name: 'Coupe de Fruits à la Cannelle', price: 8000, category: 'Desserts' },
      { name: 'Cœur Coulant au Chocolat', price: 10000, category: 'Desserts' },
      { name: 'Panna Cotta au Coulis', price: 10000, category: 'Desserts' },
      { name: 'Crème Brûlée à la Vanille', price: 10000, category: 'Desserts' },
      { name: 'Brownie à la Banane', price: 10000, category: 'Desserts' },
      { name: 'Tiramisu du Chef', price: 10000, category: 'Desserts' },
      { name: 'Coupe de Glace Arena', price: 10000, category: 'Desserts' },
      // PIZZAS
      { name: 'Pizza Margherita', price: 20000, category: 'Pizzas' },
      { name: 'Pizza Bolognaise', price: 20000, category: 'Pizzas' },
      { name: 'Pizza Hawaïenne', price: 25000, category: 'Pizzas' },
      { name: 'Pizza 4 Fromages', price: 30000, category: 'Pizzas' },
      { name: 'Pizza Royale', price: 30000, category: 'Pizzas' },
      { name: 'Pizza Carbonara', price: 30000, category: 'Pizzas' },
      { name: 'Pizza Poulet Massala', price: 30000, category: 'Pizzas' },
      { name: 'Pizza Catalane', price: 30000, category: 'Pizzas' },
      { name: 'Pizza Poulet BBQ', price: 35000, category: 'Pizzas' },
      { name: 'Pizza Spécial Arena', price: 35000, category: 'Pizzas' },
      // PLATS INDIENS - PAINS
      { name: 'Naan au Fromage', price: 5000, category: 'Plats Indiens - Pains' },
      { name: 'Paratha', price: 6000, category: 'Plats Indiens - Pains' },
      { name: 'Chapatis', price: 5000, category: 'Plats Indiens - Pains' },
      // PLATS INDIENS - POULET
      { name: 'Butter Chicken', price: 25000, category: 'Plats Indiens - Poulet' },
      { name: 'Poulet Tikka Massala', price: 25000, category: 'Plats Indiens - Poulet' },
      { name: 'Poulet Tandoori Massala', price: 25000, category: 'Plats Indiens - Poulet' },
      { name: 'Poulet Korma', price: 25000, category: 'Plats Indiens - Poulet' },
      { name: 'Poulet Indien au Curry et Lait de Coco', price: 28000, category: 'Plats Indiens - Poulet' },
      // PLATS INDIENS - BŒUF
      { name: 'Bœuf Épicé à l\'Indienne', price: 28000, category: 'Plats Indiens - Bœuf' },
      { name: 'Bœuf Bengali', price: 28000, category: 'Plats Indiens - Bœuf' },
      { name: 'Joue de Bœuf Fondante', price: 28000, category: 'Plats Indiens - Bœuf' },
      { name: 'Khimo avec Naan ou Riz', price: 20000, category: 'Plats Indiens - Bœuf' },
      // PLATS INDIENS - VÉGÉTARIEN
      { name: 'Haricots Blancs à l\'Indienne', price: 5000, category: 'Plats Indiens - Végétarien' },
      { name: 'Rajma (Haricot Rouge Indien)', price: 5000, category: 'Plats Indiens - Végétarien' },
      { name: 'Le Daal', price: 8000, category: 'Plats Indiens - Végétarien' },
      { name: 'Curry de Pois Chiche', price: 8000, category: 'Plats Indiens - Végétarien' },
      { name: 'Rogan Josh Végétarien', price: 8000, category: 'Plats Indiens - Végétarien' },
      // PLATS INDIENS - AGNEAU
      { name: 'Côtelettes d\'Agneau à l\'Indienne', price: 28000, category: 'Plats Indiens - Agneau' },
      { name: 'Côtelettes d\'Agneau Garam Massala', price: 28000, category: 'Plats Indiens - Agneau' },
      { name: 'Kalia d\'Agneau au Curry', price: 28000, category: 'Plats Indiens - Agneau' },
      { name: 'Agneau Rogan Josh', price: 28000, category: 'Plats Indiens - Agneau' },
      { name: 'Agneau Bhuna', price: 28000, category: 'Plats Indiens - Agneau' },
      { name: 'Agneau Vindaloo', price: 28000, category: 'Plats Indiens - Agneau' },
      // PLATS INDIENS - FRUITS DE MER
      { name: 'Curry de Crabe à l\'Indienne', price: 30000, category: 'Plats Indiens - Fruits de Mer' },
      { name: 'Filet de Poisson à l\'Indienne', price: 28000, category: 'Plats Indiens - Fruits de Mer' },
      { name: 'Crevettes Massala', price: 30000, category: 'Plats Indiens - Fruits de Mer' },
      { name: 'Curry de Crevettes Goa', price: 30000, category: 'Plats Indiens - Fruits de Mer' },
      { name: 'Brochette de Fruits de Mer Indienne', price: 35000, category: 'Plats Indiens - Fruits de Mer' },
      { name: 'Curry de Gambas à la Noix de Coco', price: 35000, category: 'Plats Indiens - Fruits de Mer' },
      // PLATS INDIENS - RIZ
      { name: 'Riz Parfumé à l\'Indienne', price: 20000, category: 'Plats Indiens - Riz' },
      { name: 'Riz Indien aux Fruits Secs', price: 20000, category: 'Plats Indiens - Riz' },
      { name: 'Riz au Safran', price: 20000, category: 'Plats Indiens - Riz' },
      { name: 'Biryani à l\'Agneau', price: 30000, category: 'Plats Indiens - Riz' },
      { name: 'Biryani au Poulet', price: 30000, category: 'Plats Indiens - Riz' },
      { name: 'Biryani aux Fruits de Mer', price: 35000, category: 'Plats Indiens - Riz' },
      { name: 'Biryani aux Bœufs', price: 30000, category: 'Plats Indiens - Riz' },
    ];

    menuItems.forEach(item => {
      productsDB.create({
        name: item.name,
        price: item.price,
        moduleType: 'restaurant',
        stock: 999,
        category: item.category,
      });
    });
  },
};

// Auto-seed on first load
productsDB.seedRestaurantMenu();
