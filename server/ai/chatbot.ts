/**
 * ARENAH IA – Assistant conversationnel (chatbot)
 *
 * Fonctionnement pour chaque message :
 *   1. Compréhension de l'intention : classifieur bayésien entraîné sur
 *      data/chatbotData.ts (hôtel, restaurant, spectacle…)
 *   2. Extraction d'entités par expressions régulières : date ("demain",
 *      "ce week-end", "12/10"), nombre de personnes, nombre de nuits, budget
 *   3. Mémoire de conversation : si la question est ambiguë ("et pour demain ?"),
 *      on réutilise l'intention précédente
 *   4. Réponse construite à partir des VRAIES données de la base
 *      (chambres libres, spectacles à venir, plats, tarifs…)
 *   5. Si le Naive Bayes hésite, un réseau de neurones (semantic.ts) compare le
 *      SENS de la question aux exemples : « où passer la nuit ? » → hôtel.
 *   6. Apprentissage continu : les corrections des admins (voir learning.ts)
 *      réentraînent le modèle à chaud ; une phrase déjà corrigée est reconnue
 *      à coup sûr, et les fautes de frappe sont tolérées.
 */
import { NaiveBayes, crossValidate, evaluate, type Evaluation, type Example, type Prediction } from './naiveBayes.js';
import { normalize } from './text.js';
import { CHATBOT_DATA, CHATBOT_TEST, CHATBOT_HARD_TEST, CHATBOT_SHORT_TEST, CHATBOT_OUT_OF_SCOPE, INTENTS } from './data/chatbotData.js';
import { semanticPredict, semanticReady, type SemanticPrediction } from './semantic.js';
import { query, queryOne } from '../db/database.js';
import { recommendForUser, MODULE_LABELS } from './recommender.js';
import { BUSINESS } from './data/businessInfo.js';

const OPTIONS = { unique: true, prefixes: true };
const MIN_CONFIDENCE = 0.3;
/** Une correction d'admin pèse autant que 3 exemples de base. */
export const LEARNED_WEIGHT = 3;
export const INTENT_NAMES = Object.keys(INTENTS);

// Le modèle est remplaçable : il est réentraîné chaque fois qu'un admin corrige l'IA
let learned: Example[] = [];
let memory = new Map<string, string>(); // phrase corrigée (normalisée) → intention
let model = new NaiveBayes(OPTIONS).train(CHATBOT_DATA);
let evaluation: { crossValidation: Evaluation; testSet: Evaluation } | null = null;

const trainingData = () => [...CHATBOT_DATA, ...learned.map(e => ({ ...e, weight: LEARNED_WEIGHT }))];

/** Réentraîne le chatbot avec les données de base + les exemples appris. */
export function retrainChatbot(learnedExamples: Example[]) {
  learned = learnedExamples.filter(e => INTENT_NAMES.includes(e.label));
  memory = new Map(learned.map(e => [normalize(e.text), e.label]));
  model = new NaiveBayes(OPTIONS).train(trainingData());
  evaluation = null;
  hybridCache = null;
}

export function chatbotEvaluation() {
  evaluation ??= {
    crossValidation: crossValidate(trainingData(), 5, OPTIONS),
    testSet: evaluate(model, CHATBOT_TEST),
  };
  return evaluation;
}
export const chatbotModelInfo = () => ({
  examples: CHATBOT_DATA.length + learned.length, learned: learned.length,
  vocabulary: model.vocabularySize, intents: model.labels.length,
});

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface ChatItem { title: string; subtitle?: string; price?: string }
export interface ChatAction { label: string; to: string }
export interface ChatReply {
  text: string;
  intent: string | null;
  confidence: number;
  entities: Entities;
  corrections?: { from: string; to: string }[];
  engine?: Engine | null;   // quel modèle a compris la question
  certain?: boolean;        // false → soumise à l'admin pour validation
  neighbor?: string;        // exemple le plus proche (réseau de neurones)
  logId?: string;
  items?: ChatItem[];
  actions?: ChatAction[];
  suggestions?: string[];
}

// ─── Extraction d'entités ────────────────────────────────────────────────────

export interface Entities {
  date?: string;      // AAAA-MM-JJ
  dateLabel?: string; // "demain", "samedi 26/09"…
  persons?: number;
  nights?: number;
  budget?: number;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
};
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const frDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const price = (n: number) => `${Number(n).toLocaleString('fr-FR').replace(/\s/g, ' ')} Ar`;

function toNumber(s: string): number { return NUMBER_WORDS[s] ?? Number(s); }

export function extractEntities(message: string, today = new Date()): Entities {
  const t = normalize(message);
  const e: Entities = {};
  const setDate = (d: Date, label: string) => { e.date = iso(d); e.dateLabel = label; };

  if (/apres demain/.test(t)) setDate(addDays(today, 2), 'après-demain');
  else if (/\bdemain\b/.test(t)) setDate(addDays(today, 1), 'demain');
  else if (/aujourd hui|ce soir|\bce midi\b|maintenant/.test(t)) setDate(today, /ce soir/.test(t) ? 'ce soir' : 'aujourd\'hui');
  else if (/week end|weekend/.test(t)) {
    const day = today.getDay();
    const offset = day === 6 || day === 0 ? 0 : 6 - day;
    setDate(addDays(today, offset), 'ce week-end');
  } else {
    const wd = WEEKDAYS.findIndex(w => new RegExp(`\\b${w}\\b`).test(t));
    if (wd >= 0) {
      const offset = (wd - today.getDay() + 7) % 7 || 7;
      const d = addDays(today, offset);
      setDate(d, frDate(d));
    }
    const m = message.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
    if (m) {
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : today.getFullYear();
      const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
      if (!isNaN(d.getTime())) setDate(d, frDate(d));
    }
  }

  const num = '(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)';
  const persons = t.match(new RegExp(`${num}\\s*(?:personnes?|pers|adultes?|invites?|places?|enfants?|amis)`))
    // "pour 3", mais pas "pour une coupe" ni "pour 2 nuits"
    ?? t.match(/\bpour\s+(\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b(?!\s*(?:nuits?|jours?|heures?|h\b|mois|semaines?))/);
  if (persons) e.persons = toNumber(persons[1]);
  else if (/en couple|a deux|mon mari|ma femme|ma copine|mon copain/.test(t)) e.persons = 2;

  const nights = t.match(new RegExp(`${num}\\s*nuits?`));
  if (nights) e.nights = toNumber(nights[1]);

  const budget = t.match(/(\d[\d\s]*)\s*(k|000)?\s*(?:ar|ariary|mga)\b/) ?? t.match(/(?:moins de|max|maximum|budget)\s*(\d[\d\s]*)\s*(k)?/);
  if (budget) {
    let v = Number(budget[1].replace(/\s/g, ''));
    if (budget[2] === 'k') v *= 1000;
    if (v > 0) e.budget = v;
  }
  return e;
}

// ─── Réponses par intention ──────────────────────────────────────────────────

type Handler = (ctx: { message: string; e: Entities; userId: string | null }) => Promise<Omit<ChatReply, 'intent' | 'confidence' | 'entities'>>;

const today = () => iso(new Date());

/**
 * Tarifs réglés par l'admin dans les paramètres de module (table module_config).
 * Valeurs par défaut identiques à celles des routes de réservation
 * (server/routes/bookings/*.ts), pour que le chatbot annonce le prix réellement facturé.
 */
const CONFIG_DEFAULTS: Record<string, Record<string, number>> = {
  gym:   { prix_seance: 5000 },
  pool:  { tarif_entree: 5000, tarif_accompagnant: 2000 },
  field: { prix_heure_libre: 10000 },
};
async function moduleConfig(module: string): Promise<Record<string, number>> {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM module_config WHERE module = $1', [module])
    .catch(() => []);
  const values = { ...CONFIG_DEFAULTS[module] };
  for (const r of rows) if (Number.isFinite(Number(r.value))) values[r.key] = Number(r.value);
  return values;
}

const HANDLERS: Record<string, Handler> = {
  async salutation({ userId }) {
    const u = userId ? await queryOne<{ fullname: string }>('SELECT fullname FROM users WHERE id = $1', [userId]).catch(() => undefined) : undefined;
    const name = u?.fullname?.split(' ')[0];
    return {
      text: `Bonjour${name ? ` ${name}` : ''} ! 👋 Je suis l'assistant ARENAH. Je peux vous aider à trouver une chambre, une table, un spectacle, un soin… Que puis-je faire pour vous ?`,
      suggestions: ['Chambre libre ce week-end', 'Spectacles à venir', 'Que me conseilles-tu ?'],
    };
  },
  async au_revoir() { return { text: 'À bientôt chez ARENAH ! Veloma 👋' }; },
  async remerciement() { return { text: 'Avec plaisir ! 😊 Autre chose ?', suggestions: ['Voir les promotions', 'Comment payer ?'] }; },

  async aide() {
    return {
      text: 'ARENAH regroupe plusieurs services au même endroit. Je peux vous renseigner sur chacun, vérifier les disponibilités et vous conseiller :',
      items: [
        { title: '🏨 Hôtel', subtitle: 'Chambres et suites' }, { title: '🍽️ Restaurant', subtitle: 'Carte et réservation de table' },
        { title: '🎭 Spectacles', subtitle: 'Concerts, théâtre, humour' }, { title: '💇 Salon', subtitle: 'Coiffure, soins, massage' },
        { title: '💪 Sport', subtitle: 'Salle, piscine, terrains' }, { title: '🎉 Événementiel', subtitle: 'Mariages, anniversaires, séminaires' },
      ],
      suggestions: ['Chambre pour 2 demain', 'Menu du restaurant', 'Que faire ce week-end ?'],
    };
  },

  async hotel({ e }) {
    const checkIn = e.date ?? today();
    const nights = e.nights ?? 1;
    const checkOut = iso(addDays(new Date(`${checkIn}T12:00:00`), nights));
    const guests = e.persons ?? 1;
    const rooms = await query<{ name: string; type: string; price_per_night: number; capacity: number }>(`
      SELECT r.name, r.type, r.price_per_night, r.capacity FROM hotel_rooms r
      WHERE r.active = true AND r.capacity >= $1 AND ($4::int IS NULL OR r.price_per_night <= $4)
        AND NOT EXISTS (
          SELECT 1 FROM hotel_bookings b WHERE b.room_id = r.id AND b.status <> 'annule'
            AND b.check_in < $3::date AND b.check_out > $2::date)
      ORDER BY r.price_per_night`, [guests, checkIn, checkOut, e.budget ?? null]);
    const when = e.dateLabel ?? 'aujourd\'hui';
    const criteria = `${when}, ${nights} nuit${nights > 1 ? 's' : ''}, ${guests} personne${guests > 1 ? 's' : ''}${e.budget ? `, budget ${price(e.budget)}` : ''}`;
    if (!rooms.length) {
      return {
        text: `Désolé, aucune chambre ne correspond (${criteria}). Essayez une autre date ?`,
        suggestions: ['Chambre libre demain', 'Chambre ce week-end'], actions: [{ label: 'Voir l\'hôtel', to: '/hotel' }],
      };
    }
    return {
      text: `J'ai trouvé ${rooms.length} chambre${rooms.length > 1 ? 's' : ''} libre${rooms.length > 1 ? 's' : ''} (${criteria}) :`,
      items: rooms.map(r => ({
        title: r.name, subtitle: `Jusqu'à ${r.capacity} personnes`,
        price: `${price(r.price_per_night)} / nuit${nights > 1 ? ` · ${price(r.price_per_night * nights)} au total` : ''}`,
      })),
      actions: [{ label: 'Réserver une chambre', to: '/hotel' }],
    };
  },

  async restaurant({ e }) {
    const dishes = await query<{ name: string; price: number; category: string | null; orders: string }>(`
      SELECT p.name, p.price, p.category,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) AS orders
      FROM products p WHERE p.module = 'restaurant' AND p.active = true
        AND ($1::int IS NULL OR p.price <= $1)
      ORDER BY orders DESC, p.price LIMIT 5`, [e.budget ?? null]);
    if (!dishes.length) return { text: 'La carte n\'est pas encore disponible en ligne.', actions: [{ label: 'Voir le restaurant', to: '/restaurant' }] };
    return {
      text: `Voici les plats les plus appréciés${e.budget ? ` à moins de ${price(e.budget)}` : ''} :`,
      items: dishes.map(d => ({ title: d.name, subtitle: d.category ?? undefined, price: price(d.price) })),
      actions: [{ label: 'Voir la carte', to: '/restaurant' }, { label: 'Réserver une table', to: '/restaurant' }],
    };
  },

  async spectacle({ e }) {
    const shows = await query<{ title: string; artist: string | null; date: string; time: string; venue: string; base_price: number }>(`
      SELECT s.title, s.artist, to_char(s.date, 'YYYY-MM-DD') AS date, s.time, s.venue,
             COALESCE((SELECT MIN(ss.price) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'free'), s.base_price) AS base_price
      FROM shows s
      WHERE s.active = true AND ${e.date ? 's.date = $1::date' : 's.date >= $1::date'}
      ORDER BY s.date, s.time LIMIT 4`, [e.date ?? today()]);
    if (!shows.length) {
      return {
        text: e.date ? `Aucun spectacle prévu ${e.dateLabel}. Voulez-vous voir les prochains ?` : 'Aucun spectacle programmé pour le moment.',
        suggestions: ['Prochains spectacles'], actions: [{ label: 'Voir les spectacles', to: '/spectacles' }],
      };
    }
    return {
      text: e.date ? `Au programme ${e.dateLabel} :` : 'Les prochains spectacles :',
      items: shows.map(s => ({
        title: s.title, subtitle: `${s.artist ? `${s.artist} · ` : ''}${frDate(new Date(`${s.date}T12:00:00`))} à ${s.time} · ${s.venue}`,
        price: `dès ${price(s.base_price)}`,
      })),
      actions: [{ label: 'Réserver des places', to: '/spectacles' }],
    };
  },

  async salon({ message, e }) {
    const services = await query<{ label: string; price: number; duration: number; category: string }>(
      'SELECT label, price, duration, category FROM salon_services WHERE active = true ORDER BY price');
    const words = normalize(message).split(' ').filter(w => w.length > 3);
    const matches = services.filter(s => words.some(w => normalize(s.label).includes(w.slice(0, 5)) || normalize(s.category).includes(w.slice(0, 5))));
    const list = (matches.length ? matches : services).filter(s => !e.budget || s.price <= e.budget).slice(0, 6);
    return {
      text: matches.length ? 'Voici les prestations correspondantes :' : 'Quelques prestations de notre salon :',
      items: list.map(s => ({ title: s.label, subtitle: `${s.duration} min · ${s.category}`, price: price(s.price) })),
      actions: [{ label: 'Prendre rendez-vous', to: '/salon' }],
    };
  },

  async gym() {
    const [plans, cfg] = await Promise.all([
      query<{ label: string; price: number; days: number }>('SELECT label, price, days FROM gym_plans WHERE active = true ORDER BY price'),
      moduleConfig('gym'),
    ]);
    return {
      text: `Nos formules salle de sport (horaires : ${BUSINESS.hours.gym}) :`,
      items: [
        { title: 'Séance à l\'unité', subtitle: 'Réservation d\'un créneau', price: price(cfg.prix_seance) },
        ...plans.map(p => ({ title: p.label, subtitle: `${p.days} jour${p.days > 1 ? 's' : ''}`, price: price(p.price) })),
      ],
      actions: [{ label: 'S\'abonner', to: '/salle-de-sport' }],
    };
  },

  async piscine() {
    const [passes, cfg] = await Promise.all([
      query<{ label: string; price: number; entries: number; validity_days: number }>(
        'SELECT label, price, entries, validity_days FROM pool_pass_types WHERE active = true ORDER BY price'),
      moduleConfig('pool'),
    ]);
    return {
      text: `La piscine est ouverte ${BUSINESS.hours.pool}. Nos tarifs :`,
      items: [
        { title: 'Entrée simple', subtitle: `Accompagnant : ${price(cfg.tarif_accompagnant)}`, price: price(cfg.tarif_entree) },
        ...passes.map(p => ({ title: p.label, subtitle: `${p.entries} entrée${p.entries > 1 ? 's' : ''} · valable ${p.validity_days} j`, price: price(p.price) })),
      ],
      actions: [{ label: 'Acheter un pass', to: '/piscine' }],
    };
  },

  async terrain({ message }) {
    const t = normalize(message);
    const sport = /basket/.test(t) ? 'basket' : /tennis/.test(t) ? 'tennis' : /foot|match/.test(t) ? 'foot' : null;
    const [slots, cfg] = await Promise.all([
      query<{ label: string; price: number; sport_type: string; equipment: string | null }>(
        `SELECT label, price, sport_type, equipment FROM field_slots
         WHERE active = true AND ($1::text IS NULL OR sport_type = $1) ORDER BY sport_type, id`, [sport]),
      moduleConfig('field'),
    ]);
    return {
      text: sport ? `Créneaux pour le ${sport} :` : 'Nos terrains et créneaux :',
      items: [
        ...slots.slice(0, 6).map(s => ({ title: `${s.sport_type.toUpperCase()} · ${s.label}`, subtitle: s.equipment ?? undefined, price: price(s.price) })),
        { title: 'Location libre', subtitle: 'Horaires au choix', price: `${price(cfg.prix_heure_libre)} / heure` },
      ],
      actions: [{ label: 'Réserver un terrain', to: '/terrain-foot' }],
    };
  },

  async enfants() {
    const tickets = await query<{ label: string; price: number; duration_hours: string }>(
      'SELECT label, price, duration_hours FROM kids_ticket_types WHERE active = true ORDER BY price').catch(() => []);
    return {
      text: 'L\'espace enfants propose jeux et animations encadrées :',
      items: tickets.map(k => ({ title: k.label, subtitle: `${Number(k.duration_hours)} h`, price: price(k.price) })),
      actions: [{ label: 'Voir l\'espace enfants', to: '/espace-enfants' }],
    };
  },

  async cybercafe() {
    const [d, rates] = await Promise.all([
      query<{ label: string; price: number }>('SELECT label, price FROM cybercafe_durations WHERE active = true ORDER BY minutes'),
      query<{ station_type: string; rate: number; n: number }>(
        `SELECT station_type, MIN(hourly_rate)::int AS rate, COUNT(*)::int AS n FROM cybercafe_stations
         WHERE active = true GROUP BY station_type ORDER BY rate`).catch(() => []),
    ]);
    const TYPES: Record<string, string> = { pc: 'PC', ps4: 'PS4', billard: 'Billard' };
    return {
      text: `Cybercafé ouvert ${BUSINESS.hours.shopAndCyber} (internet, PS4, impression). Tarifs :`,
      items: [
        ...rates.map(r => ({ title: `${TYPES[r.station_type] ?? r.station_type} à l'heure`, subtitle: `${r.n} poste${r.n > 1 ? 's' : ''}`, price: `dès ${price(r.rate)} / h` })),
        ...d.map(x => ({ title: `Forfait ${x.label}`, price: price(x.price) })),
      ],
      actions: [{ label: 'Réserver un poste', to: '/cybercafe' }],
    };
  },

  async evenement({ e }) {
    const halls = await query<{ name: string; capacity: number; base_price: number }>(
      'SELECT name, capacity, base_price FROM event_halls WHERE active = true AND capacity >= $1 ORDER BY capacity', [e.persons ?? 0]);
    return {
      text: halls.length
        ? `Nos salles${e.persons ? ` pour ${e.persons} invités` : ''} :`
        : `Aucune salle ne peut accueillir ${e.persons} personnes. Contactez-nous pour une solution sur mesure.`,
      items: halls.map(h => ({ title: h.name, subtitle: `Jusqu'à ${h.capacity} personnes`, price: `dès ${price(h.base_price)}` })),
      actions: [{ label: 'Demander un devis', to: '/evenementiel' }],
    };
  },

  async boutique() {
    const p = await query<{ name: string; price: number }>(
      `SELECT name, price FROM products WHERE module = 'boutique' AND active = true ORDER BY created_at DESC LIMIT 4`);
    return {
      text: 'Quelques articles de la boutique (livraison ou retrait sur place) :',
      items: p.map(x => ({ title: x.name, price: price(x.price) })),
      actions: [{ label: 'Visiter la boutique', to: '/boutique' }],
    };
  },

  async paiement() {
    return {
      text: 'Vous pouvez payer par Mobile Money (MVola, Orange Money, Airtel Money) directement sur le site, ou sur place. Chaque paiement génère une facture téléchargeable.',
      actions: [{ label: 'Mes paiements', to: '/mes-paiements' }],
    };
  },

  async fidelite({ userId }) {
    if (!userId) {
      return { text: 'Chaque achat vous rapporte des points de fidélité, convertibles en réductions. Connectez-vous pour voir votre solde.', actions: [{ label: 'Se connecter', to: '/login' }] };
    }
    const r = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'redeem' THEN -points ELSE points END), 0) AS total FROM loyalty_points WHERE user_id = $1`, [userId]).catch(() => undefined);
    return {
      text: `Vous avez ${Number(r?.total ?? 0).toLocaleString('fr-FR')} points de fidélité. 🎁 Utilisez-les lors de votre prochain paiement !`,
      actions: [{ label: 'Mon profil', to: '/profil' }, { label: 'Parrainage', to: '/parrainage' }],
    };
  },

  async annulation() {
    return {
      text: `Pour annuler ou modifier une réservation, rendez-vous dans votre espace client. Pour un remboursement, contactez-nous au ${BUSINESS.phone}.`,
      actions: [{ label: 'Mes commandes', to: '/mes-commandes' }, { label: 'Conditions (CGV)', to: '/cgv' }],
    };
  },

  async horaires() {
    return {
      text: 'Nos horaires :',
      items: [
        { title: 'Réception hôtel & restaurant', subtitle: BUSINESS.hours.reception }, { title: 'Salle de sport', subtitle: BUSINESS.hours.gym },
        { title: 'Piscine', subtitle: BUSINESS.hours.pool }, { title: 'Boutique & Cybercafé', subtitle: BUSINESS.hours.shopAndCyber },
      ],
    };
  },

  async contact() {
    return {
      text: `📍 ${BUSINESS.address}\n📞 ${BUSINESS.phone}\n✉️ ${BUSINESS.email}`,
      actions: [{ label: 'À propos', to: '/a-propos' }, { label: 'FAQ', to: '/faq' }],
    };
  },

  async recommandation({ userId }) {
    const reco = await recommendForUser(userId, 3);
    const PATHS: Record<string, string> = {
      hotel: '/hotel', restaurant: '/restaurant', boutique: '/boutique', gym: '/salle-de-sport', salon: '/salon',
      pool: '/piscine', field: '/terrain-foot', show: '/spectacles', event: '/evenementiel', cybercafe: '/cybercafe', kids: '/espace-enfants',
    };
    return {
      text: reco.personalized
        ? 'D\'après ce que vous aimez et ce qu\'ont apprécié des clients au profil similaire, je vous conseille :'
        : 'Les activités préférées de nos clients en ce moment :',
      items: reco.modules.map(m => ({ title: MODULE_LABELS[m]?.replace(/^(l'|le |la |les )/, '').replace(/^./, c => c.toUpperCase()) ?? m })),
      actions: reco.modules.map(m => ({ label: `Découvrir ${MODULE_LABELS[m] ?? m}`, to: PATHS[m] ?? '/' })),
    };
  },
};

// ─── Point d'entrée ──────────────────────────────────────────────────────────

// ─── Compréhension : Naive Bayes d'abord, réseau de neurones en renfort ──────

/**
 * Seuils du Naive Bayes. Sur 21 intentions, un message d'un seul mot donne une
 * probabilité basse même quand le modèle n'hésite pas (« salut » : 16 %, mais
 * 2,4 fois plus que le 2e choix). On juge donc aussi l'ÉCART avec le 2e choix.
 * Valeurs choisies en mesurant 4 jeux de test (voir docs/IA.md).
 */
export const NB_TRUSTED = 0.7;        // confiance à partir de laquelle on ne consulte pas le réseau de neurones…
export const NB_TRUSTED_MARGIN = 3;   // …ou 1er choix au moins 3 fois plus probable que le 2e
const NB_FALLBACK_MARGIN = 2;         // dernier recours : 1er choix au moins 2 fois plus probable

type NbGuess = { label: string; confidence: number; margin: number };
const nbTrusted = (nb: NbGuess) => nb.confidence > 0 && (nb.confidence >= NB_TRUSTED || nb.margin >= NB_TRUSTED_MARGIN);
const nbAcceptable = (nb: NbGuess) => nb.confidence > 0 && (nb.confidence >= MIN_CONFIDENCE || nb.margin >= NB_FALLBACK_MARGIN);

export type Engine = 'memory' | 'naive_bayes' | 'neural' | 'context';

export interface Decision {
  intent: string | null;
  confidence: number;
  engine: Engine | null;
  neighbor?: string; // exemple le plus proche trouvé par le réseau de neurones
  certain: boolean;  // false → la réponse est soumise à l'admin (onglet Apprentissage)
}

/**
 * Règle de décision (fonction pure, testée) :
 *   1. phrase déjà corrigée par un admin → mémoire
 *   2. Naive Bayes sûr de lui (≥ 70 %, ou 3× plus que le 2e choix) → Naive Bayes
 *   3. question de suite (« et pour demain ? ») → même sujet que la précédente
 *   4. sinon, le réseau de neurones compare le SENS de la question aux exemples ;
 *      il ne répond que si ses voisins sont d'accord (sinon : hors sujet)
 *   5. dernier recours : Naive Bayes (≥ 30 %, ou 2× plus que le 2e choix)
 */
export function decideIntent(input: {
  remembered?: string;
  nb: NbGuess;
  semantic: SemanticPrediction | null;
  followUp?: string | null; // intention précédente, si la question n'est qu'une précision (date, nombre…)
}): Decision {
  const { remembered, nb, semantic, followUp } = input;
  if (remembered) return { intent: remembered, confidence: 1, engine: 'memory', certain: true };
  if (nbTrusted(nb)) return { intent: nb.label, confidence: nb.confidence, engine: 'naive_bayes', certain: true };
  if (followUp && nb.confidence < 0.5) return { intent: followUp, confidence: nb.confidence, engine: 'context', certain: true };
  if (semantic?.accepted) return { intent: semantic.label, confidence: semantic.similarity, engine: 'neural', neighbor: semantic.neighbor, certain: false };
  if (nbAcceptable(nb)) return { intent: nb.label, confidence: nb.confidence, engine: 'naive_bayes', certain: false };
  return { intent: null, confidence: Math.max(nb.confidence, semantic?.similarity ?? 0), engine: null, certain: false };
}

async function understand(message: string, followUp?: string | null): Promise<Decision & { corrections: Prediction['corrections'] }> {
  const pred = model.predict(message);
  const remembered = memory.get(normalize(message));
  // Le réseau de neurones n'est consulté que si le Naive Bayes hésite (économie de calcul)
  const needsNeural = !remembered && !nbTrusted(pred);
  const semantic = needsNeural ? await semanticPredict(message).catch(() => null) : null;
  const decision = decideIntent({ remembered, nb: pred, semantic, followUp });
  return { ...decision, confidence: Math.round(decision.confidence * 100) / 100, corrections: pred.corrections };
}

/** Exemples à indexer par le réseau de neurones (base + corrections des admins). */
export const semanticExamples = () => trainingData().map(({ text, label }) => ({ text, label }));

/**
 * Compare « Naive Bayes seul » et « Naive Bayes + réseau de neurones » sur :
 *   - les 42 questions de test, les 30 reformulations difficiles, 21 messages courts,
 *   - 12 questions hors sujet (ici, la bonne réponse est de NE PAS répondre).
 * Mesure ce qui se passe vraiment pour un client (seuils de confiance compris).
 */
let hybridCache: Promise<HybridReport> | null = null;
export interface HybridReport {
  neuralReady: boolean;
  sets: { name: string; total: number; naiveBayes: number; hybrid: number }[];
  outOfScope: { total: number; naiveBayesRejected: number; hybridRejected: number };
}
let hybridCacheNeural = false;
export function hybridEvaluation(): Promise<HybridReport> {
  // Recalcul si le réseau de neurones a fini de charger depuis la dernière mesure
  if (hybridCache && hybridCacheNeural !== semanticReady()) hybridCache = null;
  hybridCacheNeural = semanticReady();
  hybridCache ??= (async () => {
    const nbOnly = (q: string) => {
      const p = model.predict(q);
      return nbAcceptable(p) ? p.label : null;
    };
    const sets = [];
    for (const [name, data] of [['Questions de test', CHATBOT_TEST], ['Reformulations difficiles', CHATBOT_HARD_TEST], ['Messages courts', CHATBOT_SHORT_TEST]] as const) {
      let nb = 0, hybrid = 0;
      for (const ex of data) {
        if (nbOnly(ex.text) === ex.label) nb++;
        if ((await understand(ex.text)).intent === ex.label) hybrid++;
      }
      sets.push({ name, total: data.length, naiveBayes: nb, hybrid });
    }
    let nbRejected = 0, hybridRejected = 0;
    for (const q of CHATBOT_OUT_OF_SCOPE) {
      if (!nbOnly(q)) nbRejected++;
      if (!(await understand(q)).intent) hybridRejected++;
    }
    return {
      neuralReady: semanticReady(),
      sets,
      outOfScope: { total: CHATBOT_OUT_OF_SCOPE.length, naiveBayesRejected: nbRejected, hybridRejected },
    };
  })();
  return hybridCache;
}
export const resetHybridEvaluation = () => { hybridCache = null; };

export async function chat(message: string, userId: string | null, previousIntent?: string | null): Promise<ChatReply> {
  const e = extractEntities(message);
  // « et pour demain ? » : une précision (date, nombre…) se rattache au sujet précédent
  const followUp = previousIntent && HANDLERS[previousIntent] && Object.keys(e).length > 0 ? previousIntent : null;
  const { intent, confidence, engine, neighbor, certain, corrections } = await understand(message, followUp);

  if (!intent) {
    return {
      text: 'Je n\'ai pas bien compris 🤔 Pouvez-vous reformuler ? Je peux vous renseigner sur l\'hôtel, le restaurant, les spectacles, le salon, le sport ou l\'événementiel.\n\nVotre question est transmise à l\'équipe pour que j\'apprenne à y répondre.',
      intent: null, confidence, engine: null, entities: e, corrections,
      suggestions: ['Que peux-tu faire ?', 'Chambre libre ce soir', 'Menu du restaurant'],
    };
  }

  const reply = await HANDLERS[intent]({ message, e, userId });
  return { ...reply, intent, confidence, engine, neighbor, certain, entities: e, corrections };
}
