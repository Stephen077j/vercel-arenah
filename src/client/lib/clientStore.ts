// Front-office client store — localStorage backed, no backend.
import { useSyncExternalStore } from 'react';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
}));

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };

// Memoization cache to prevent infinite re-renders in useSyncExternalStore
const cache = new Map<string, { value: any; raw: string }>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Cache miss for non-existent data
      const cached = cache.get(key);
      if (cached && cached.raw === null) return cached.value as T;
      cache.set(key, { value: fallback, raw: null as any });
      return fallback;
    }
    
    // Return cached value if the raw string hasn't changed
    const cached = cache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    
    // Parse and cache the new value
    const value = JSON.parse(raw) as T;
    cache.set(key, { value, raw });
    return value;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  const jsonValue = JSON.stringify(value);
  localStorage.setItem(key, jsonValue);
  // Update cache with new value immediately so subscribers get consistent snapshots
  cache.set(key, { value, raw: jsonValue });
  emit();
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  module: string;
  note?: string;
}

export type OrderType = 'boutique' | 'restaurant';
export type DeliveryMode = 'livraison' | 'retrait' | 'sur_place';
export type OrderStatus = 'en_attente' | 'preparation' | 'expediee' | 'livree' | 'annulee';

export interface ClientOrder {
  id: string;
  type: OrderType;
  items: CartItem[];
  total: number;
  mode: DeliveryMode;
  address?: string;
  notes?: string;
  status: OrderStatus;
  paid: boolean;
  createdAt: string;
  customer: { name: string; phone: string };
}

export interface TableReservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  createdAt: string;
  status: 'confirmee' | 'annulee';
}

export interface HotelBooking {
  id: string;
  roomId: string;
  roomName: string;
  pricePerNight: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  deposit: number;
  guests: number;
  customer: { name: string; phone: string; email?: string };
  paid: boolean;
  checkedIn: boolean;
  createdAt: string;
}

const K_CART = 'client_cart';
const K_FAV = 'client_favoris';
const K_FAV_TYPED = 'client_favoris_typed';
const K_ORDERS = 'client_orders';
const K_TABLE = 'client_table_reservations';
const K_HOTEL = 'client_hotel_bookings';
const K_GYM_SUBS = 'client_gym_subs';
const K_GYM_CHECK = 'client_gym_checkins';
const K_GYM_COACH = 'client_gym_coach_bookings';
const K_POOL_PASS = 'client_pool_passes';
const K_POOL_COURSE = 'client_pool_course_bookings';
const K_POOL_ENTRY = 'client_pool_entries';
const K_SALON = 'client_salon_bookings';
const K_FIELD = 'client_field_bookings';
const K_EVENT = 'client_event_bookings';
const K_CYBER = 'client_cybercafe_bookings';
const K_SHOW = 'client_show_bookings';
const K_NOTIF = 'client_notifications';

export const cartStore = {
  get: (): CartItem[] => read(K_CART, [] as CartItem[]),
  add: (item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    const cart = cartStore.get();
    const existing = cart.find(c => c.productId === item.productId);
    if (existing) existing.qty += item.qty ?? 1;
    else cart.push({ ...item, qty: item.qty ?? 1 });
    write(K_CART, cart);
  },
  setQty: (productId: string, qty: number) => {
    const cart = cartStore.get();
    const it = cart.find(c => c.productId === productId);
    if (!it) return;
    if (qty <= 0) write(K_CART, cart.filter(c => c.productId !== productId));
    else { it.qty = qty; write(K_CART, cart); }
  },
  remove: (productId: string) => write(K_CART, cartStore.get().filter(c => c.productId !== productId)),
  clear: () => write(K_CART, [] as CartItem[]),
  count: () => cartStore.get().reduce((s, c) => s + c.qty, 0),
  total: () => cartStore.get().reduce((s, c) => s + c.qty * c.price, 0),
};

export const favStore = {
  get: (): string[] => read(K_FAV, [] as string[]),
  toggle: (productId: string) => {
    const f = favStore.get();
    write(K_FAV, f.includes(productId) ? f.filter(id => id !== productId) : [...f, productId]);
  },
  has: (productId: string) => favStore.get().includes(productId),
};

export interface TypedFav {
  type: string; // 'boutique' | 'hotel' | 'show' | 'salon' | 'gym' | 'restaurant' | ...
  id: string;
  label: string;
  sub?: string;
  img?: string;
  path: string;
}

export const typedFavStore = {
  get: (): TypedFav[] => read(K_FAV_TYPED, [] as TypedFav[]),
  toggle: (fav: TypedFav) => {
    const list = typedFavStore.get();
    const exists = list.some(f => f.type === fav.type && f.id === fav.id);
    write(K_FAV_TYPED, exists ? list.filter(f => !(f.type === fav.type && f.id === fav.id)) : [...list, fav]);
  },
  has: (type: string, id: string) => typedFavStore.get().some(f => f.type === type && f.id === id),
  remove: (type: string, id: string) => {
    write(K_FAV_TYPED, typedFavStore.get().filter(f => !(f.type === type && f.id === id)));
  },
};

export const orderStore = {
  get: (): ClientOrder[] => read(K_ORDERS, [] as ClientOrder[]),
  create: (data: Omit<ClientOrder, 'id' | 'createdAt' | 'status' | 'paid'> & { paid?: boolean }): ClientOrder => {
    const order: ClientOrder = {
      ...data,
      id: uid(),
      status: 'en_attente',
      paid: data.paid ?? false,
      createdAt: new Date().toISOString(),
    };
    write(K_ORDERS, [order, ...orderStore.get()]);
    return order;
  },
  advance: (id: string) => {
    const flow: OrderStatus[] = ['en_attente', 'preparation', 'expediee', 'livree'];
    const orders = orderStore.get();
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const i = flow.indexOf(o.status);
    if (i < flow.length - 1) o.status = flow[i + 1];
    write(K_ORDERS, orders);
  },
  cancel: (id: string) => {
    const orders = orderStore.get();
    const o = orders.find(x => x.id === id);
    if (o) o.status = 'annulee';
    write(K_ORDERS, orders);
  },
};

export const tableStore = {
  get: (): TableReservation[] => read(K_TABLE, [] as TableReservation[]),
  create: (data: Omit<TableReservation, 'id' | 'createdAt' | 'status'>): TableReservation => {
    const r: TableReservation = { ...data, id: uid(), createdAt: new Date().toISOString(), status: 'confirmee' };
    write(K_TABLE, [r, ...tableStore.get()]);
    return r;
  },
  cancel: (id: string) => {
    const all = tableStore.get();
    const r = all.find(x => x.id === id);
    if (r) r.status = 'annulee';
    write(K_TABLE, all);
  },
};

export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
}

export const ROOMS: Room[] = [
  { id: 'r-std', name: 'Chambre Standard', description: 'Lit double, salle de bain privée, vue ville.', capacity: 2, pricePerNight: 180000, amenities: ['Wi-Fi', 'TV', 'Petit-déj'] },
  { id: 'r-sup', name: 'Chambre Supérieure', description: 'Spacieuse, balcon, mini-bar.', capacity: 2, pricePerNight: 260000, amenities: ['Wi-Fi', 'TV', 'Mini-bar', 'Balcon'] },
  { id: 'r-fam', name: 'Chambre Familiale', description: '2 lits doubles, idéale pour les familles.', capacity: 4, pricePerNight: 340000, amenities: ['Wi-Fi', 'TV', 'Petit-déj', 'Espace salon'] },
  { id: 'r-ste', name: 'Suite Vue Mer', description: 'Salon séparé, vue mer panoramique.', capacity: 2, pricePerNight: 480000, amenities: ['Wi-Fi', 'TV', 'Mini-bar', 'Jacuzzi', 'Vue mer'] },
];

export const hotelStore = {
  get: (): HotelBooking[] => read(K_HOTEL, [] as HotelBooking[]),
  isAvailable: (roomId: string, checkIn: string, checkOut: string): boolean => {
    const bookings = hotelStore.get().filter(b => b.roomId === roomId);
    const a1 = new Date(checkIn).getTime();
    const a2 = new Date(checkOut).getTime();
    return !bookings.some(b => {
      const b1 = new Date(b.checkIn).getTime();
      const b2 = new Date(b.checkOut).getTime();
      return a1 < b2 && a2 > b1;
    });
  },
  create: (data: Omit<HotelBooking, 'id' | 'createdAt' | 'checkedIn'>): HotelBooking => {
    const b: HotelBooking = { ...data, id: uid(), createdAt: new Date().toISOString(), checkedIn: false };
    write(K_HOTEL, [b, ...hotelStore.get()]);
    return b;
  },
  checkIn: (id: string) => {
    const all = hotelStore.get();
    const b = all.find(x => x.id === id);
    if (b) b.checkedIn = true;
    write(K_HOTEL, all);
  },
};

function useStore<T>(getter: () => T): T {
  return useSyncExternalStore(subscribe, getter, getter);
}

export const useCart = () => useStore(cartStore.get);
export const useCartCount = () => useStore(cartStore.count);
export const useFavoris = () => useStore(favStore.get);
export const useOrders = () => useStore(orderStore.get);
export const useTableReservations = () => useStore(tableStore.get);
export const useHotelBookings = () => useStore(hotelStore.get);

export const formatPrice = (n: number) => n.toLocaleString('fr-FR') + ' Ar';

/* ==================== NOTIFICATIONS IN-APP ==================== */
export interface Notif {
  id: string;
  title: string;
  body: string;
  module: string;
  createdAt: string;
  read: boolean;
}
export const notifStore = {
  get: (): Notif[] => read(K_NOTIF, [] as Notif[]),
  push: (n: Omit<Notif, 'id' | 'createdAt' | 'read'>) => {
    const all = notifStore.get();
    all.unshift({ ...n, id: uid(), createdAt: new Date().toISOString(), read: false });
    write(K_NOTIF, all.slice(0, 50));
  },
  markAllRead: () => write(K_NOTIF, notifStore.get().map(n => ({ ...n, read: true }))),
  clear: () => write(K_NOTIF, [] as Notif[]),
  unread: () => notifStore.get().filter(n => !n.read).length,
};
export const useNotifs = () => useStore(notifStore.get);
export const useUnreadNotifs = () => useStore(notifStore.unread);

/* ==================== SALLE DE SPORT ==================== */
export type GymPlan = 'journalier' | 'mensuel' | 'trimestriel';
export const GYM_PLANS: { id: GymPlan; label: string; price: number; days: number; desc: string }[] = [
  { id: 'journalier', label: 'Pass journalier', price: 8000, days: 1, desc: 'Accès libre pour 1 journée' },
  { id: 'mensuel', label: 'Abonnement mensuel', price: 80000, days: 30, desc: 'Accès illimité pendant 30 jours' },
  { id: 'trimestriel', label: 'Abonnement trimestriel', price: 210000, days: 90, desc: 'Économisez 30 000 Ar sur 3 mois' },
];
export const COACHES = [
  { id: 'c1', name: 'Hery Andrianasolo', specialty: 'Musculation & cross-training', hourPrice: 30000 },
  { id: 'c2', name: 'Vola Rakoto', specialty: 'Cardio & perte de poids', hourPrice: 25000 },
  { id: 'c3', name: 'Tojo Rabe', specialty: 'Préparation physique', hourPrice: 35000 },
];

export interface GymSub {
  id: string;
  customer: { name: string; phone: string };
  plan: GymPlan;
  startDate: string;
  endDate: string;
  price: number;
  paid: boolean;
  autoRenew: boolean;
  createdAt: string;
}
export interface GymCheckIn { id: string; subId: string; phone: string; date: string; }
export interface GymCoachBooking {
  id: string; coachId: string; coachName: string;
  customer: { name: string; phone: string };
  date: string; time: string; price: number; paid: boolean; createdAt: string;
  status: 'confirme' | 'annule';
}

export const gymStore = {
  subs: (): GymSub[] => read(K_GYM_SUBS, [] as GymSub[]),
  subscribe: (data: { customer: { name: string; phone: string }; plan: GymPlan; autoRenew: boolean }) => {
    const def = GYM_PLANS.find(p => p.id === data.plan)!;
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + def.days);
    const sub: GymSub = {
      id: uid(), customer: data.customer, plan: data.plan,
      startDate: start.toISOString(), endDate: end.toISOString(),
      price: def.price, paid: false, autoRenew: data.autoRenew,
      createdAt: new Date().toISOString(),
    };
    write(K_GYM_SUBS, [sub, ...gymStore.subs()]);
    notifStore.push({ title: 'Abonnement créé', body: `${def.label} valide jusqu'au ${end.toLocaleDateString('fr-FR')}. Paiement sur place.`, module: 'salle_sport' });
    return sub;
  },
  renew: (id: string) => {
    const all = gymStore.subs();
    const s = all.find(x => x.id === id);
    if (!s) return;
    const def = GYM_PLANS.find(p => p.id === s.plan)!;
    const end = new Date(s.endDate);
    end.setDate(end.getDate() + def.days);
    s.endDate = end.toISOString();
    s.paid = false;
    write(K_GYM_SUBS, all);
    notifStore.push({ title: 'Abonnement renouvelé', body: `Nouvelle échéance : ${end.toLocaleDateString('fr-FR')}`, module: 'salle_sport' });
  },
  toggleAuto: (id: string) => {
    const all = gymStore.subs();
    const s = all.find(x => x.id === id);
    if (s) { s.autoRenew = !s.autoRenew; write(K_GYM_SUBS, all); }
  },
  cancel: (id: string) => write(K_GYM_SUBS, gymStore.subs().filter(s => s.id !== id)),
  checkins: (): GymCheckIn[] => read(K_GYM_CHECK, [] as GymCheckIn[]),
  checkIn: (phone: string) => {
    const sub = gymStore.subs().find(s => s.customer.phone === phone && new Date(s.endDate) >= new Date());
    if (!sub) return null;
    const c: GymCheckIn = { id: uid(), subId: sub.id, phone, date: new Date().toISOString() };
    write(K_GYM_CHECK, [c, ...gymStore.checkins()]);
    return c;
  },
  coachBookings: (): GymCoachBooking[] => read(K_GYM_COACH, [] as GymCoachBooking[]),
  bookCoach: (data: Omit<GymCoachBooking, 'id' | 'createdAt' | 'status' | 'paid'>) => {
    const b: GymCoachBooking = { ...data, id: uid(), createdAt: new Date().toISOString(), status: 'confirme', paid: false };
    write(K_GYM_COACH, [b, ...gymStore.coachBookings()]);
    notifStore.push({ title: 'Coach réservé', body: `${data.coachName} — ${data.date} à ${data.time}`, module: 'salle_sport' });
    return b;
  },
  cancelCoach: (id: string) => {
    const all = gymStore.coachBookings();
    const b = all.find(x => x.id === id);
    if (b) { b.status = 'annule'; write(K_GYM_COACH, all); }
  },
};
export const useGymSubs = () => useStore(gymStore.subs);
export const useGymCheckins = () => useStore(gymStore.checkins);
export const useGymCoachBookings = () => useStore(gymStore.coachBookings);

/* ==================== PISCINE ==================== */
export const POOL_PASSES = [
  { id: 'p-day', label: 'Entrée journée', price: 10000, entries: 1, desc: 'Une entrée valable 1 journée' },
  { id: 'p-10', label: 'Forfait 10 entrées', price: 80000, entries: 10, desc: 'Valable 3 mois' },
  { id: 'p-month', label: 'Pass mensuel illimité', price: 120000, entries: 999, desc: 'Accès illimité 30 jours' },
];
export const POOL_COURSES = [
  { id: 'pc1', label: 'Cours débutant', coach: 'Mialy R.', slots: ['Lun 17h', 'Mer 17h', 'Sam 09h'], price: 15000 },
  { id: 'pc2', label: 'Aquagym', coach: 'Niry A.', slots: ['Mar 18h', 'Jeu 18h'], price: 12000 },
  { id: 'pc3', label: 'Perfectionnement', coach: 'Faly T.', slots: ['Ven 17h', 'Sam 11h'], price: 20000 },
];

export interface PoolPass {
  id: string; customer: { name: string; phone: string };
  passId: string; passLabel: string; price: number;
  entriesLeft: number; expiresAt: string; paid: boolean; createdAt: string;
}
export interface PoolCourseBooking {
  id: string; customer: { name: string; phone: string };
  courseId: string; courseLabel: string; coach: string; slot: string;
  price: number; paid: boolean; createdAt: string; status: 'confirme' | 'annule';
}
export interface PoolEntryLog { id: string; passId: string; phone: string; date: string; }

export const poolStore = {
  passes: (): PoolPass[] => read(K_POOL_PASS, [] as PoolPass[]),
  buy: (data: { customer: { name: string; phone: string }; passId: string }) => {
    const def = POOL_PASSES.find(p => p.id === data.passId)!;
    const exp = new Date(); exp.setMonth(exp.getMonth() + (def.entries > 1 ? 3 : 1));
    const p: PoolPass = {
      id: uid(), customer: data.customer, passId: def.id, passLabel: def.label,
      price: def.price, entriesLeft: def.entries, expiresAt: exp.toISOString(),
      paid: false, createdAt: new Date().toISOString(),
    };
    write(K_POOL_PASS, [p, ...poolStore.passes()]);
    notifStore.push({ title: 'Forfait piscine', body: `${def.label} acheté. Paiement à l'accueil.`, module: 'piscine' });
    return p;
  },
  entries: (): PoolEntryLog[] => read(K_POOL_ENTRY, [] as PoolEntryLog[]),
  useEntry: (phone: string) => {
    const all = poolStore.passes();
    const p = all.find(x => x.customer.phone === phone && x.entriesLeft > 0 && new Date(x.expiresAt) >= new Date());
    if (!p) return null;
    p.entriesLeft -= 1;
    write(K_POOL_PASS, all);
    const e: PoolEntryLog = { id: uid(), passId: p.id, phone, date: new Date().toISOString() };
    write(K_POOL_ENTRY, [e, ...poolStore.entries()]);
    if (p.entriesLeft <= 2) notifStore.push({ title: 'Alerte forfait', body: `Il vous reste ${p.entriesLeft} entrée(s) piscine.`, module: 'piscine' });
    return e;
  },
  courses: (): PoolCourseBooking[] => read(K_POOL_COURSE, [] as PoolCourseBooking[]),
  bookCourse: (data: Omit<PoolCourseBooking, 'id' | 'createdAt' | 'status' | 'paid'>) => {
    const b: PoolCourseBooking = { ...data, id: uid(), createdAt: new Date().toISOString(), status: 'confirme', paid: false };
    write(K_POOL_COURSE, [b, ...poolStore.courses()]);
    notifStore.push({ title: 'Cours piscine réservé', body: `${data.courseLabel} — ${data.slot}`, module: 'piscine' });
    return b;
  },
  cancelCourse: (id: string) => {
    const all = poolStore.courses();
    const c = all.find(x => x.id === id);
    if (c) { c.status = 'annule'; write(K_POOL_COURSE, all); }
  },
};
export const usePoolPasses = () => useStore(poolStore.passes);
export const usePoolCourses = () => useStore(poolStore.courses);
export const usePoolEntries = () => useStore(poolStore.entries);

/* ==================== SALON ==================== */
export const SALON_SERVICES = [
  { id: 's1', label: 'Coupe homme', price: 15000, duration: 30 },
  { id: 's2', label: 'Coupe femme', price: 25000, duration: 45 },
  { id: 's3', label: 'Coloration', price: 60000, duration: 90 },
  { id: 's4', label: 'Tresses africaines', price: 80000, duration: 180 },
  { id: 's5', label: 'Barbe & rasage', price: 10000, duration: 20 },
  { id: 's6', label: 'Soin capillaire', price: 35000, duration: 60 },
];
export const HAIRDRESSERS = [
  { id: 'h1', name: 'Lova R.', specialty: 'Coupes femmes & coloration' },
  { id: 'h2', name: 'Naivo A.', specialty: 'Coupes hommes & barbe' },
  { id: 'h3', name: 'Sariaka M.', specialty: 'Tresses & soins' },
];
export const SALON_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

export interface SalonBooking {
  id: string; customer: { name: string; phone: string };
  serviceId: string; serviceLabel: string; price: number;
  hairdresserId: string; hairdresserName: string;
  date: string; slot: string;
  status: 'confirme' | 'annule' | 'termine';
  paid: boolean; rating?: number; comment?: string;
  createdAt: string;
}
export const salonStore = {
  bookings: (): SalonBooking[] => read(K_SALON, [] as SalonBooking[]),
  book: (data: Omit<SalonBooking, 'id' | 'createdAt' | 'status' | 'paid' | 'rating' | 'comment'>) => {
    const b: SalonBooking = { ...data, id: uid(), createdAt: new Date().toISOString(), status: 'confirme', paid: false };
    write(K_SALON, [b, ...salonStore.bookings()]);
    notifStore.push({ title: 'RDV salon confirmé', body: `${data.serviceLabel} avec ${data.hairdresserName} le ${data.date} à ${data.slot}`, module: 'salon_coiffure' });
    setTimeout(() => notifStore.push({ title: 'Rappel RDV salon', body: `N'oubliez pas votre RDV ${data.serviceLabel} le ${data.date} à ${data.slot}`, module: 'salon_coiffure' }), 4000);
    return b;
  },
  cancel: (id: string) => {
    const all = salonStore.bookings();
    const b = all.find(x => x.id === id);
    if (b) { b.status = 'annule'; write(K_SALON, all); }
  },
  rate: (id: string, rating: number, comment: string) => {
    const all = salonStore.bookings();
    const b = all.find(x => x.id === id);
    if (b) { b.rating = rating; b.comment = comment; b.status = 'termine'; write(K_SALON, all); }
  },
  isSlotTaken: (hairdresserId: string, date: string, slot: string) =>
    salonStore.bookings().some(b => b.status === 'confirme' && b.hairdresserId === hairdresserId && b.date === date && b.slot === slot),
};
export const useSalonBookings = () => useStore(salonStore.bookings);

/* ==================== TERRAIN FOOT ==================== */
export const FIELD_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
export const FIELD_PRICE_PER_SLOT = 80000;
export const FIELD_CANCEL_LIMIT_HOURS = 24;

export interface FieldBookingClient {
  id: string; customer: { name: string; phone: string };
  date: string; slot: string; price: number; paid: boolean;
  status: 'confirme' | 'annule'; createdAt: string;
}
export const fieldStore = {
  bookings: (): FieldBookingClient[] => read(K_FIELD, [] as FieldBookingClient[]),
  isTaken: (date: string, slot: string) =>
    fieldStore.bookings().some(b => b.status === 'confirme' && b.date === date && b.slot === slot),
  book: (data: { customer: { name: string; phone: string }; date: string; slot: string }) => {
    const b: FieldBookingClient = {
      ...data, id: uid(), price: FIELD_PRICE_PER_SLOT, paid: false,
      status: 'confirme', createdAt: new Date().toISOString(),
    };
    write(K_FIELD, [b, ...fieldStore.bookings()]);
    notifStore.push({ title: 'Terrain réservé', body: `${data.date} à ${data.slot}. Paiement sur place.`, module: 'terrain_foot' });
    return b;
  },
  reschedule: (id: string, date: string, slot: string): { ok: boolean; reason?: string } => {
    const all = fieldStore.bookings();
    const b = all.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'Réservation introuvable' };
    const hoursLeft = (new Date(`${b.date}T${b.slot}`).getTime() - Date.now()) / 36e5;
    if (hoursLeft < FIELD_CANCEL_LIMIT_HOURS) return { ok: false, reason: `Modification impossible à moins de ${FIELD_CANCEL_LIMIT_HOURS}h du créneau` };
    if (fieldStore.isTaken(date, slot)) return { ok: false, reason: 'Créneau déjà pris' };
    b.date = date; b.slot = slot;
    write(K_FIELD, all);
    notifStore.push({ title: 'Réservation modifiée', body: `Nouveau créneau : ${date} à ${slot}`, module: 'terrain_foot' });
    return { ok: true };
  },
  cancel: (id: string): { ok: boolean; reason?: string } => {
    const all = fieldStore.bookings();
    const b = all.find(x => x.id === id);
    if (!b) return { ok: false, reason: 'Introuvable' };
    const hoursLeft = (new Date(`${b.date}T${b.slot}`).getTime() - Date.now()) / 36e5;
    if (hoursLeft < FIELD_CANCEL_LIMIT_HOURS) return { ok: false, reason: `Annulation impossible à moins de ${FIELD_CANCEL_LIMIT_HOURS}h` };
    b.status = 'annule';
    write(K_FIELD, all);
    notifStore.push({ title: 'Réservation annulée', body: `Créneau ${b.date} ${b.slot}`, module: 'terrain_foot' });
    return { ok: true };
  },
};
export const useFieldBookings = () => useStore(fieldStore.bookings);

/* ==================== ESPACE ÉVÉNEMENTIEL ==================== */
export const EVENT_HALLS = [
  { id: 'h-petite', name: 'Petite salle', capacity: 50, basePrice: 400000, desc: 'Idéale pour anniversaires & réunions' },
  { id: 'h-moyenne', name: 'Salle moyenne', capacity: 150, basePrice: 900000, desc: 'Conférences, fiançailles' },
  { id: 'h-grande', name: 'Grande salle', capacity: 400, basePrice: 1800000, desc: 'Mariages & grands événements' },
];
export const EVENT_OPTIONS = [
  { id: 'opt-cat', label: 'Catering complet (par personne)', perGuest: true, price: 18000 },
  { id: 'opt-deco', label: 'Décoration premium', perGuest: false, price: 350000 },
  { id: 'opt-dj', label: 'DJ & sono', perGuest: false, price: 250000 },
  { id: 'opt-secu', label: 'Sécurité', perGuest: false, price: 120000 },
  { id: 'opt-photo', label: 'Photographe', perGuest: false, price: 180000 },
];
export const EVENT_DEPOSIT_RATE = 0.3;

export interface EventBookingClient {
  id: string; customer: { name: string; phone: string };
  hallId: string; hallName: string; date: string; guests: number;
  options: { id: string; label: string; price: number }[];
  total: number; deposit: number;
  signature: string; depositPaid: boolean;
  status: 'devis' | 'signe' | 'confirme' | 'annule';
  createdAt: string;
}
export const eventStore = {
  bookings: (): EventBookingClient[] => read(K_EVENT, [] as EventBookingClient[]),
  computeQuote: (hallId: string, guests: number, optionIds: string[]) => {
    const hall = EVENT_HALLS.find(h => h.id === hallId);
    if (!hall) return { total: 0, deposit: 0, breakdown: [] as { label: string; amount: number }[] };
    const breakdown: { label: string; amount: number }[] = [{ label: hall.name, amount: hall.basePrice }];
    let total = hall.basePrice;
    optionIds.forEach(oid => {
      const o = EVENT_OPTIONS.find(x => x.id === oid);
      if (!o) return;
      const amount = o.perGuest ? o.price * guests : o.price;
      breakdown.push({ label: o.perGuest ? `${o.label} × ${guests}` : o.label, amount });
      total += amount;
    });
    return { total, deposit: Math.round(total * EVENT_DEPOSIT_RATE), breakdown };
  },
  submit: (data: Omit<EventBookingClient, 'id' | 'createdAt' | 'status' | 'depositPaid'>) => {
    const b: EventBookingClient = {
      ...data, id: uid(), createdAt: new Date().toISOString(),
      status: data.signature ? 'signe' : 'devis', depositPaid: false,
    };
    write(K_EVENT, [b, ...eventStore.bookings()]);
    notifStore.push({
      title: data.signature ? 'Devis signé' : 'Devis généré',
      body: `${data.hallName} — Total ${b.total.toLocaleString('fr-FR')} Ar, acompte ${b.deposit.toLocaleString('fr-FR')} Ar`,
      module: 'espace_evenementiel',
    });
    return b;
  },
  markDepositPaid: (id: string) => {
    const all = eventStore.bookings();
    const b = all.find(x => x.id === id);
    if (b) { b.depositPaid = true; b.status = 'confirme'; write(K_EVENT, all);
      notifStore.push({ title: 'Acompte enregistré', body: `Événement ${b.hallName} confirmé`, module: 'espace_evenementiel' });
    }
  },
  cancel: (id: string) => {
    const all = eventStore.bookings();
    const b = all.find(x => x.id === id);
    if (b) { b.status = 'annule'; write(K_EVENT, all); }
  },
};
export const useEventBookings = () => useStore(eventStore.bookings);

/* ==================== SPECTACLES ==================== */
export type SeatType = 'standard' | 'premium' | 'vip';

export interface Show {
  id: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  description: string;
  category: string;
  basePrice: number;
  duration: string;
  ageRestriction?: number;
}

export interface SeatInfo {
  id: string;
  row: string;
  number: number;
  type: SeatType;
  price: number;
  status: 'available' | 'selected' | 'sold';
}

export interface ShowTicket {
  id: string;
  ticketId: string;
  showId: string;
  showTitle: string;
  date: string;
  time: string;
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  price: number;
  customer: { name: string; phone: string };
  qrCode: string;
  purchasedAt: string;
  status: 'valid' | 'used' | 'cancelled';
}

export interface ShowBooking {
  id: string;
  customer: { name: string; phone: string };
  showId: string;
  showTitle: string;
  date: string;
  time: string;
  seats: { row: string; number: number; type: SeatType; price: number }[];
  total: number;
  paid: boolean;
  tickets: ShowTicket[];
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

const SHOWS: Show[] = [
  {
    id: 'show-1',
    title: 'Riake Live Concert',
    artist: 'Riake',
    date: '2026-05-25',
    time: '20:00',
    venue: 'Palais des Sports',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    description: 'Concert en direct avec le célèbre artiste Riake. Préparez-vous pour une soirée inoubliable!',
    category: 'Musique',
    basePrice: 35000,
    duration: '2h30',
  },
  {
    id: 'show-2',
    title: 'Comedy Night',
    artist: 'Divers humoristes',
    date: '2026-05-26',
    time: '19:00',
    venue: 'Théâtre Municipal',
    image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400',
    description: 'Une soirée d\'humour avec les meilleurs comédiens de la région.',
    category: 'Humour',
    basePrice: 18000,
    duration: '1h45',
    ageRestriction: 16,
  },
  {
    id: 'show-3',
    title: 'Ballet National',
    artist: 'Compagnie Nationale',
    date: '2026-05-27',
    time: '20:00',
    venue: 'Opéra de la ville',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    description: 'Spectacle de danse classique avec la compagnie nationale du ballet.',
    category: 'Danse',
    basePrice: 42000,
    duration: '2h',
  },
  {
    id: 'show-4',
    title: 'Jazz Fusion Sessions',
    artist: 'The Jazz Collective',
    date: '2026-05-28',
    time: '21:00',
    venue: 'Blue Moon Club',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400',
    description: 'Une fusion unique de jazz contemporain et traditionnel.',
    category: 'Musique',
    basePrice: 25000,
    duration: '2h',
  },
];

// Generate seat map for a show
const generateSeats = (showId: string): SeatInfo[] => {
  const seats: SeatInfo[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 12;
  
  rows.forEach(row => {
    for (let i = 1; i <= seatsPerRow; i++) {
      const seatType: SeatType = i <= 3 || i > 9 ? 'standard' : i <= 6 || i > 6 ? 'premium' : 'vip';
      const price =
        seatType === 'vip' ? 45000 : seatType === 'premium' ? 35000 : 25000;
      
      seats.push({
        id: `${showId}-${row}${i}`,
        row,
        number: i,
        type: seatType,
        price,
        status: 'available',
      });
    }
  });
  
  return seats;
};

// Cache seats for shows
const seatCache = new Map<string, { seats: SeatInfo[]; bookings: ShowBooking[] }>();

export const showStore = {
  shows: (): Show[] => SHOWS,
  getShow: (showId: string): Show | null => SHOWS.find(s => s.id === showId) || null,
  
  seats: (showId: string): SeatInfo[] => {
    const bookings = showStore.bookings();
    
    // Get cached seats
    const cached = seatCache.get(showId);
    const baseSeats = cached?.seats || generateSeats(showId);
    
    // Update seat status based on bookings
    return baseSeats.map(seat => {
      const isBooked = bookings.some(
        b => b.showId === showId && b.status !== 'cancelled' &&
        b.seats.some(s => s.row === seat.row && s.number === seat.number)
      );
      return { ...seat, status: isBooked ? 'sold' : 'available' };
    });
  },
  
  bookings: (): ShowBooking[] => read(K_SHOW, [] as ShowBooking[]),
  
  selectSeats: (showId: string, selectedSeats: { row: string; number: number }[]): ShowBooking | null => {
    // This just prepares a booking object for display (not persisted yet)
    const show = showStore.getShow(showId);
    if (!show) return null;
    
    const seats = showStore.seats(showId);
    const bookingSeats = selectedSeats
      .map(sel => seats.find(s => s.row === sel.row && s.number === sel.number))
      .filter((s): s is SeatInfo => s !== undefined);
    
    const total = bookingSeats.reduce((sum, s) => sum + s.price, 0);
    
    return {
      id: uid(),
      customer: { name: '', phone: '' },
      showId,
      showTitle: show.title,
      date: show.date,
      time: show.time,
      seats: bookingSeats.map(s => ({ row: s.row, number: s.number, type: s.type, price: s.price })),
      total,
      paid: false,
      tickets: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  },
  
  checkout: (bookingData: Omit<ShowBooking, 'id' | 'createdAt' | 'tickets'>): ShowBooking => {
    // Generate QR codes and tickets
    const booking: ShowBooking = {
      ...bookingData,
      id: uid(),
      createdAt: new Date().toISOString(),
      tickets: bookingData.seats.map(seat => ({
        id: uid(),
        ticketId: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        showId: bookingData.showId,
        showTitle: bookingData.showTitle,
        date: bookingData.date,
        time: bookingData.time,
        seatRow: seat.row,
        seatNumber: seat.number,
        seatType: seat.type,
        price: seat.price,
        customer: bookingData.customer,
        qrCode: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23fff' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14' fill='%23000'%3E${bookingData.customer.phone}%3C/text%3E%3C/svg%3E`,
        purchasedAt: new Date().toISOString(),
        status: 'valid',
      })),
    };
    
    write(K_SHOW, [booking, ...showStore.bookings()]);
    notifStore.push({
      title: 'Billets confirmés',
      body: `${booking.showTitle} — ${booking.seats.length} billet(s) — ${booking.total.toLocaleString('fr-FR')} Ar`,
      module: 'spectacles',
    });
    
    return booking;
  },
  
  markPaid: (bookingId: string) => {
    const all = showStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (b) {
      b.paid = true;
      b.status = 'confirmed';
      write(K_SHOW, all);
      notifStore.push({ title: 'Paiement confirmé', body: `${b.showTitle} — ${b.total.toLocaleString('fr-FR')} Ar`, module: 'spectacles' });
    }
    return b || null;
  },
  
  cancelBooking: (bookingId: string) => {
    const all = showStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (b) {
      b.status = 'cancelled';
      write(K_SHOW, all);
      notifStore.push({ title: 'Réservation annulée', body: `${b.showTitle}`, module: 'spectacles' });
    }
    return b || null;
  },
  
  useTicket: (ticketId: string) => {
    const all = showStore.bookings();
    for (const booking of all) {
      const ticket = booking.tickets.find(t => t.id === ticketId);
      if (ticket) {
        ticket.status = 'used';
        write(K_SHOW, all);
        return ticket;
      }
    }
    return null;
  },
};

export const useShows = () => useStore(showStore.shows);
export const useShowBookings = () => useStore(showStore.bookings);

/* ==================== CYBERCAFÉ ==================== */
export const CYBERCAFE_DURATIONS = [
  { id: '30min', label: '30 minutes', minutes: 30, price: 5000 },
  { id: '1h', label: '1 heure', minutes: 60, price: 9000 },
  { id: '2h', label: '2 heures', minutes: 120, price: 16000 },
  { id: '4h', label: '4 heures', minutes: 240, price: 28000 },
  { id: 'day', label: 'Journée (8h)', minutes: 480, price: 45000 },
];

export const CYBERCAFE_SERVICES = [
  { id: 'print-bw', label: 'Impression N&B (par page)', perUnit: true, unit: 'page', price: 300 },
  { id: 'print-color', label: 'Impression couleur (par page)', perUnit: true, unit: 'page', price: 800 },
  { id: 'scan', label: 'Scan (par page)', perUnit: true, unit: 'page', price: 500 },
  { id: 'usb-copy', label: 'Copie depuis/vers USB', perUnit: false, unit: 'forfait', price: 2000 },
  { id: 'cd-burn', label: 'Gravure CD/DVD', perUnit: false, unit: 'support', price: 3000 },
];

export interface CybercafeStation {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'maintenance';
  specs: string;
}

export interface CybercafeService {
  id: string;
  label: string;
  quantity: number;
  priceUnit: number;
  total: number;
}

export interface CybercafeBooking {
  id: string;
  customer: { name: string; phone: string };
  stationId: string;
  stationNumber: number;
  durationId: string;
  durationMinutes: number;
  durationPrice: number;
  services: CybercafeService[];
  servicesTotal: number;
  total: number;
  startTime: string;
  endTime: string;
  paid: boolean;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

const CYBERCAFE_STATIONS: CybercafeStation[] = [
  { id: 's1', number: 1, status: 'available', specs: 'Intel i5, 8GB RAM, W10' },
  { id: 's2', number: 2, status: 'available', specs: 'Intel i7, 16GB RAM, W11' },
  { id: 's3', number: 3, status: 'available', specs: 'AMD Ryzen 5, 8GB RAM, W10' },
  { id: 's4', number: 4, status: 'available', specs: 'Intel i5, 8GB RAM, W10' },
  { id: 's5', number: 5, status: 'available', specs: 'Intel i7, 16GB RAM, W11' },
  { id: 's6', number: 6, status: 'available', specs: 'Gaming PC - RTX 3060, 16GB RAM, W11' },
  { id: 's7', number: 7, status: 'available', specs: 'Intel i5, 8GB RAM, W10' },
  { id: 's8', number: 8, status: 'available', specs: 'Workstation - Xeon, 32GB RAM, Ubuntu' },
];

// Cache for computed station availability
let lastBookingsRef: any = null;
let lastStationsResult: CybercafeStation[] | null = null;

export const cyberStore = {
  stations: (): CybercafeStation[] => {
    const bookings = cyberStore.bookings();
    const now = new Date().getTime();
    
    // Return cached result if bookings reference hasn't changed
    if (lastBookingsRef === bookings && lastStationsResult) {
      return lastStationsResult;
    }
    
    const stationsWithStatus = CYBERCAFE_STATIONS.map(station => {
      const active = bookings.find(
        b => b.stationId === station.id && 
        b.status === 'active' && 
        new Date(b.endTime).getTime() > now
      );
      return { ...station, status: active ? 'occupied' : 'available' } as CybercafeStation;
    });
    
    lastBookingsRef = bookings;
    lastStationsResult = stationsWithStatus;
    return stationsWithStatus;
  },
  getStation: (stationId: string): CybercafeStation | null => {
    return cyberStore.stations().find(s => s.id === stationId) || null;
  },
  bookings: (): CybercafeBooking[] => read(K_CYBER, [] as CybercafeBooking[]),
  book: (data: Omit<CybercafeBooking, 'id' | 'createdAt' | 'status' | 'endTime' | 'startTime'> & { endTime?: string; startTime?: string }): CybercafeBooking | null => {
    const station = cyberStore.getStation(data.stationId);
    if (!station) return null;
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60000);
    
    const b: CybercafeBooking = {
      ...data,
      id: uid(),
      createdAt: new Date().toISOString(),
      status: 'active',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
    
    write(K_CYBER, [b, ...cyberStore.bookings()]);
    notifStore.push({
      title: 'Poste réservé',
      body: `Poste ${data.stationNumber} — ${data.durationMinutes}min — Total ${b.total.toLocaleString('fr-FR')} Ar`,
      module: 'cybercafe',
    });
    return b;
  },
  addService: (bookingId: string, serviceId: string, quantity: number) => {
    const all = cyberStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (!b || b.status !== 'active') return null;
    
    const serviceDef = CYBERCAFE_SERVICES.find(s => s.id === serviceId);
    if (!serviceDef) return null;
    
    // Check if service already added
    const existing = b.services.find(s => s.id === serviceId);
    if (existing) {
      existing.quantity += quantity;
      existing.total = existing.quantity * existing.priceUnit;
    } else {
      b.services.push({
        id: serviceId,
        label: serviceDef.label,
        quantity,
        priceUnit: serviceDef.price,
        total: quantity * serviceDef.price,
      });
    }
    
    b.servicesTotal = b.services.reduce((sum, s) => sum + s.total, 0);
    b.total = b.durationPrice + b.servicesTotal;
    
    write(K_CYBER, all);
    return b;
  },
  removeService: (bookingId: string, serviceId: string) => {
    const all = cyberStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (!b || b.status !== 'active') return null;
    
    b.services = b.services.filter(s => s.id !== serviceId);
    b.servicesTotal = b.services.reduce((sum, s) => sum + s.total, 0);
    b.total = b.durationPrice + b.servicesTotal;
    
    write(K_CYBER, all);
    return b;
  },
  endSession: (bookingId: string) => {
    const all = cyberStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (!b) return null;
    
    b.status = 'completed';
    write(K_CYBER, all);
    notifStore.push({
      title: 'Session terminée',
      body: `Poste ${b.stationNumber} — Total ${b.total.toLocaleString('fr-FR')} Ar`,
      module: 'cybercafe',
    });
    return b;
  },
  cancelBooking: (bookingId: string) => {
    const all = cyberStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (!b) return null;
    
    b.status = 'cancelled';
    write(K_CYBER, all);
    return b;
  },
  markPaid: (bookingId: string) => {
    const all = cyberStore.bookings();
    const b = all.find(x => x.id === bookingId);
    if (b) {
      b.paid = true;
      write(K_CYBER, all);
      notifStore.push({ title: 'Paiement confirmé', body: `Poste ${b.stationNumber} — ${b.total.toLocaleString('fr-FR')} Ar`, module: 'cybercafe' });
    }
    return b || null;
  },
};
export const useCyberStations = () => useStore(cyberStore.stations);
export const useCyberBookings = () => useStore(cyberStore.bookings);

// ── API-backed cart count (in-memory, driven by real backend operations) ────
let _apiCartCount = 0;
const _apiCartCountSubs = new Set<Listener>();
export const apiCartCount = {
  get: () => _apiCartCount,
  set: (n: number) => { _apiCartCount = Math.max(0, n); _apiCartCountSubs.forEach(l => l()); },
  inc: (by = 1) => apiCartCount.set(_apiCartCount + by),
  dec: (by = 1) => apiCartCount.set(_apiCartCount - by),
};
export const useApiCartCount = () =>
  useSyncExternalStore(
    (l) => { _apiCartCountSubs.add(l); return () => { _apiCartCountSubs.delete(l); }; },
    apiCartCount.get
  );
