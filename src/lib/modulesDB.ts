// Module-specific data types and storage
import { db } from './database';
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

// ========== RESTAURANT ==========
export interface Dish {
  id: string; name: string; price: number; category: string; ingredients: string; available: boolean;
}
export interface RestaurantOrder {
  id: string; table: number; items: { dishId: string; dishName: string; qty: number; price: number }[];
  total: number; status: 'en_cours' | 'servie' | 'payee' | 'annulee'; date: string; userId: string;
}

export const restaurantDB = {
  getDishes: (): Dish[] => getStore('mod_dishes', []),
  saveDish: (d: Omit<Dish, 'id'>): Dish => {
    const all = restaurantDB.getDishes();
    const n = { ...d, id: generateId() };
    all.push(n); setStore('mod_dishes', all); return n;
  },
  updateDish: (id: string, u: Partial<Dish>) => {
    const all = restaurantDB.getDishes();
    const i = all.findIndex(d => d.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_dishes', all); }
  },
  deleteDish: (id: string) => { setStore('mod_dishes', restaurantDB.getDishes().filter(d => d.id !== id)); },
  getOrders: (): RestaurantOrder[] => getStore('mod_resto_orders', []),
  createOrder: (o: Omit<RestaurantOrder, 'id' | 'date' | 'status'>): RestaurantOrder => {
    const all = restaurantDB.getOrders();
    const n: RestaurantOrder = { ...o, id: generateId(), date: new Date().toISOString(), status: 'en_cours' };
    all.push(n); setStore('mod_resto_orders', all); return n;
  },
  updateOrderStatus: (id: string, status: RestaurantOrder['status']) => {
    const all = restaurantDB.getOrders();
    const o = all.find(x => x.id === id);
    if (o) { o.status = status; setStore('mod_resto_orders', all); }
  },
};

// ========== BOUTIQUE ==========
export interface Product {
  id: string; name: string; buyPrice: number; sellPrice: number; stock: number; category: string;
}

export const boutiqueDB = {
  getProducts: (): Product[] => getStore('mod_products', []),
  saveProduct: (p: Omit<Product, 'id'>): Product => {
    const all = boutiqueDB.getProducts();
    const n = { ...p, id: generateId() };
    all.push(n); setStore('mod_products', all); return n;
  },
  updateProduct: (id: string, u: Partial<Product>) => {
    const all = boutiqueDB.getProducts();
    const i = all.findIndex(p => p.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_products', all); }
  },
  deleteProduct: (id: string) => { setStore('mod_products', boutiqueDB.getProducts().filter(p => p.id !== id)); },
  sellProduct: (id: string, qty: number) => {
    const all = boutiqueDB.getProducts();
    const p = all.find(x => x.id === id);
    if (p && p.stock >= qty) { p.stock -= qty; setStore('mod_products', all); return true; }
    return false;
  },
};

// ========== SALLE DE SPORT ==========
export interface GymMember {
  id: string; name: string; phone: string; subscriptionType: '1h' | '2h' | 'mensuel' | 'trimestriel';
  startDate: string; endDate: string; active: boolean;
}
export interface GymCheckIn {
  id: string; memberId: string; memberName: string; date: string;
}

export const gymDB = {
  getMembers: (): GymMember[] => getStore('mod_gym_members', []),
  saveMember: (m: Omit<GymMember, 'id'>): GymMember => {
    const all = gymDB.getMembers();
    const n = { ...m, id: generateId() };
    all.push(n); setStore('mod_gym_members', all); return n;
  },
  updateMember: (id: string, u: Partial<GymMember>) => {
    const all = gymDB.getMembers();
    const i = all.findIndex(m => m.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_gym_members', all); }
  },
  deleteMember: (id: string) => { setStore('mod_gym_members', gymDB.getMembers().filter(m => m.id !== id)); },
  getCheckIns: (): GymCheckIn[] => getStore('mod_gym_checkins', []),
  checkIn: (memberId: string, memberName: string): GymCheckIn => {
    const all = gymDB.getCheckIns();
    const n: GymCheckIn = { id: generateId(), memberId, memberName, date: new Date().toISOString() };
    all.push(n); setStore('mod_gym_checkins', all); return n;
  },
};

// ========== HOTEL ==========
export interface Room {
  id: string; number: string; type: string; pricePerNight: number; status: 'libre' | 'occupee' | 'maintenance';
}
export interface Reservation {
  id: string; roomId: string; roomNumber: string; clientName: string; clientPhone: string;
  checkIn: string; checkOut: string; total: number; status: 'reservee' | 'en_cours' | 'terminee' | 'annulee'; date: string;
}

export const hotelDB = {
  getRooms: (): Room[] => getStore('mod_rooms', []),
  saveRoom: (r: Omit<Room, 'id'>): Room => {
    const all = hotelDB.getRooms();
    const n = { ...r, id: generateId() };
    all.push(n); setStore('mod_rooms', all); return n;
  },
  updateRoom: (id: string, u: Partial<Room>) => {
    const all = hotelDB.getRooms();
    const i = all.findIndex(r => r.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_rooms', all); }
  },
  deleteRoom: (id: string) => { setStore('mod_rooms', hotelDB.getRooms().filter(r => r.id !== id)); },
  getReservations: (): Reservation[] => getStore('mod_reservations', []),
  createReservation: (r: Omit<Reservation, 'id' | 'date' | 'status'>): Reservation => {
    const all = hotelDB.getReservations();
    const n: Reservation = { ...r, id: generateId(), date: new Date().toISOString(), status: 'reservee' };
    all.push(n); setStore('mod_reservations', all); return n;
  },
  updateReservation: (id: string, u: Partial<Reservation>) => {
    const all = hotelDB.getReservations();
    const i = all.findIndex(r => r.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_reservations', all); }
  },
};

// ========== TERRAIN DE FOOT ==========
export interface FieldBooking {
  id: string; date: string; timeSlot: string; clientName: string; clientPhone: string;
  amount: number; paid: boolean; createdAt: string;
}

export const fieldDB = {
  getBookings: (): FieldBooking[] => getStore('mod_field_bookings', []),
  createBooking: (b: Omit<FieldBooking, 'id' | 'createdAt'>): FieldBooking => {
    const all = fieldDB.getBookings();
    const n: FieldBooking = { ...b, id: generateId(), createdAt: new Date().toISOString() };
    all.push(n); setStore('mod_field_bookings', all); return n;
  },
  updateBooking: (id: string, u: Partial<FieldBooking>) => {
    const all = fieldDB.getBookings();
    const i = all.findIndex(b => b.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_field_bookings', all); }
  },
  deleteBooking: (id: string) => { setStore('mod_field_bookings', fieldDB.getBookings().filter(b => b.id !== id)); },
};

// ========== PISCINE ==========
export interface PoolEntry {
  id: string; type: 'journalier' | 'abonnement'; clientName: string; amount: number; date: string;
}
export interface PoolSubscription {
  id: string; clientName: string; clientPhone: string; startDate: string; endDate: string; amount: number; active: boolean;
}

export const poolDB = {
  getEntries: (): PoolEntry[] => getStore('mod_pool_entries', []),
  addEntry: (e: Omit<PoolEntry, 'id' | 'date'>): PoolEntry => {
    const all = poolDB.getEntries();
    const n: PoolEntry = { ...e, id: generateId(), date: new Date().toISOString() };
    all.push(n); setStore('mod_pool_entries', all); return n;
  },
  getSubscriptions: (): PoolSubscription[] => getStore('mod_pool_subs', []),
  addSubscription: (s: Omit<PoolSubscription, 'id'>): PoolSubscription => {
    const all = poolDB.getSubscriptions();
    const n = { ...s, id: generateId() };
    all.push(n); setStore('mod_pool_subs', all); return n;
  },
  toggleSubscription: (id: string) => {
    const all = poolDB.getSubscriptions();
    const s = all.find(x => x.id === id);
    if (s) { s.active = !s.active; setStore('mod_pool_subs', all); }
  },
  deleteEntry: (id: string) => { setStore('mod_pool_entries', poolDB.getEntries().filter(e => e.id !== id)); },
  deleteSubscription: (id: string) => { setStore('mod_pool_subs', poolDB.getSubscriptions().filter(s => s.id !== id)); },
};

// ========== SALON DE COIFFURE ==========
export interface SalonService {
  id: string; name: string; price: number; category: string;
}
export interface SalonSale {
  id: string; services: { name: string; price: number }[]; total: number; clientName: string; date: string;
}

export const salonDB = {
  getServices: (): SalonService[] => getStore('mod_salon_services', []),
  saveService: (s: Omit<SalonService, 'id'>): SalonService => {
    const all = salonDB.getServices();
    const n = { ...s, id: generateId() };
    all.push(n); setStore('mod_salon_services', all); return n;
  },
  deleteService: (id: string) => { setStore('mod_salon_services', salonDB.getServices().filter(s => s.id !== id)); },
  getSales: (): SalonSale[] => getStore('mod_salon_sales', []),
  createSale: (s: Omit<SalonSale, 'id' | 'date'>): SalonSale => {
    const all = salonDB.getSales();
    const n: SalonSale = { ...s, id: generateId(), date: new Date().toISOString() };
    all.push(n); setStore('mod_salon_sales', all); return n;
  },
};

// ========== ESPACE ÉVÉNEMENTIEL ==========
export interface EventBooking {
  id: string; eventName: string; clientName: string; clientPhone: string;
  date: string; options: string[]; total: number; status: 'reservee' | 'confirmee' | 'terminee' | 'annulee'; createdAt: string;
}

export const eventDB = {
  getBookings: (): EventBooking[] => getStore('mod_event_bookings', []),
  createBooking: (b: Omit<EventBooking, 'id' | 'createdAt' | 'status'>): EventBooking => {
    const all = eventDB.getBookings();
    const n: EventBooking = { ...b, id: generateId(), createdAt: new Date().toISOString(), status: 'reservee' };
    all.push(n); setStore('mod_event_bookings', all); return n;
  },
  updateBooking: (id: string, u: Partial<EventBooking>) => {
    const all = eventDB.getBookings();
    const i = all.findIndex(b => b.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_event_bookings', all); }
  },
  deleteBooking: (id: string) => { setStore('mod_event_bookings', eventDB.getBookings().filter(b => b.id !== id)); },
};

// ========== ESPACE NUMÉRIQUE ==========
export interface CyberSession {
  id: string; type: 'photocopie' | 'impression' | 'connexion' | 'jeux';
  description: string; amount: number; duration?: number; date: string;
}

export const cyberDB = {
  getSessions: (): CyberSession[] => getStore('mod_cyber_sessions', []),
  addSession: (s: Omit<CyberSession, 'id' | 'date'>): CyberSession => {
    const all = cyberDB.getSessions();
    const n: CyberSession = { ...s, id: generateId(), date: new Date().toISOString() };
    all.push(n); setStore('mod_cyber_sessions', all); return n;
  },
  deleteSession: (id: string) => { setStore('mod_cyber_sessions', cyberDB.getSessions().filter(s => s.id !== id)); },
};

// ========== SPECTACLES ==========
export interface Show {
  id: string; name: string; date: string; venue: string; ticketPrice: number; totalTickets: number; soldTickets: number;
}
export interface TicketSale {
  id: string; showId: string; showName: string; quantity: number; total: number; clientName: string; date: string;
}

export const showDB = {
  getShows: (): Show[] => getStore('mod_shows', []),
  saveShow: (s: Omit<Show, 'id'>): Show => {
    const all = showDB.getShows();
    const n = { ...s, id: generateId() };
    all.push(n); setStore('mod_shows', all); return n;
  },
  updateShow: (id: string, u: Partial<Show>) => {
    const all = showDB.getShows();
    const i = all.findIndex(s => s.id === id);
    if (i >= 0) { Object.assign(all[i], u); setStore('mod_shows', all); }
  },
  deleteShow: (id: string) => { setStore('mod_shows', showDB.getShows().filter(s => s.id !== id)); },
  getTicketSales: (): TicketSale[] => getStore('mod_ticket_sales', []),
  sellTickets: (s: Omit<TicketSale, 'id' | 'date'>): TicketSale | null => {
    const shows = showDB.getShows();
    const show = shows.find(x => x.id === s.showId);
    if (!show || show.soldTickets + s.quantity > show.totalTickets) return null;
    show.soldTickets += s.quantity;
    setStore('mod_shows', shows);
    const all = showDB.getTicketSales();
    const n: TicketSale = { ...s, id: generateId(), date: new Date().toISOString() };
    all.push(n); setStore('mod_ticket_sales', all); return n;
  },
};
