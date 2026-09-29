/**
 * Formes des réponses de l'API Express.
 *
 * Ces types décrivent ce que renvoient réellement les routes de `server/routes`.
 * Ils sont posés sur les méthodes des clients API (`src/api/*.ts`) pour que les
 * pages reçoivent des données typées au lieu de `unknown`.
 */

/* ─── Panier — GET /api/cart ──────────────────────────────────────────────── */
export interface ApiCartItem {
  id: string;
  quantity: number;
  note: string | null;
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  module: string;
  stock: number;
}

/* ─── Commandes — /api/orders ─────────────────────────────────────────────── */
export interface ApiOrder {
  id: string;
  user_id: string | null;
  module: string;
  type: string;
  mode: string;
  status: string;
  total: number;
  address: string | null;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  items?: ApiOrderItem[];
}

export interface ApiOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  note: string | null;
}

/* ─── Produits — /api/products ────────────────────────────────────────────── */
export interface ApiProduct {
  id: string;
  module: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  stock: number;
  active: boolean;
}

/* ─── Notifications — /api/notifications ──────────────────────────────────── */
export interface ApiNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

/* ─── Terrain — GET /api/bookings/field/availability ───────────────────────── */
export interface ApiFieldSlot {
  id: string;
  label: string;
  slot: string;
  price: number;
  available: boolean;
  [key: string]: unknown;
}

/* ─── Spectacles — GET /api/bookings/show/shows/:id/seats ──────────────────
 * Grille calculée à la volée par le serveur (rangées A→…, 12 sièges),
 * et non le contenu de la table show_seats — qui est exposée séparément
 * par /api/bookings/shows/:showId/seats. */
export interface ApiShowSeat {
  row: string;
  number: number;
  type: string;
  price: number;
  taken: boolean;
}

/* ─── Événementiel — /api/bookings/event ──────────────────────────────────── */
export interface ApiEventBooking {
  id: string;
  user_id: string | null;
  hall_id: string;
  /** Ajouté par la jointure sur event_halls. */
  hall_name: string;
  capacity?: number;
  event_date: string;
  guests: number;
  options: string[];
  total: number;
  deposit: number;
  deposit_paid: boolean;
  signature_data: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
}

/* ─── Réponses génériques ─────────────────────────────────────────────────── */
export interface ApiSuccess {
  success: boolean;
}
