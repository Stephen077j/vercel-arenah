/**
 * ARENAH IA – Moteur de recommandation (filtrage collaboratif)
 *
 * Idée : "les clients qui vous ressemblent ont aussi aimé…"
 *
 *   1. On construit une matrice clients × services : la case (u, m) contient
 *      l'intérêt du client u pour le service m, calculé à partir de ses
 *      réservations et commandes (log(1 + nombre)) et de ses avis
 *      (bonus si bonne note, malus si mauvaise).
 *   2. On mesure la ressemblance entre deux clients par la similarité cosinus
 *      de leurs lignes :  cos(u, v) = (u · v) / (‖u‖ × ‖v‖)
 *   3. Pour un client, le score d'un service qu'il n'a pas encore essayé est la
 *      moyenne des intérêts de ses k voisins les plus proches, pondérée par
 *      leur similarité.
 *
 * Évaluation ("leave-one-out") : pour chaque client ayant utilisé au moins
 * 2 services, on en cache un et on regarde si le moteur le retrouve dans son
 * top 3. On compare avec une méthode naïve (toujours proposer les services
 * les plus populaires) pour prouver que l'IA apporte quelque chose.
 */
import { query } from '../db/database.js';

type Vector = Map<string, number>;

export const MODULE_LABELS: Record<string, string> = {
  hotel: 'l\'hôtel', restaurant: 'le restaurant', boutique: 'la boutique', gym: 'la salle de sport',
  salon: 'le salon', pool: 'la piscine', field: 'les terrains', show: 'les spectacles',
  event: 'l\'événementiel', cybercafe: 'le cybercafé', kids: 'l\'espace enfants',
};
const K_NEIGHBORS = 10;
const CACHE_MS = 10 * 60 * 1000;
const EVAL_MAX_USERS = 300;

let cache: { at: number; matrix: Map<string, Vector> } | null = null;

/** Construit la matrice d'interactions depuis la base (mise en cache 10 min). */
export async function loadMatrix(force = false): Promise<Map<string, Vector>> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.matrix;

  const rows = await query<{ user_id: string; module: string; n: string }>(`
    SELECT user_id::text, module, COUNT(*) AS n FROM (
      SELECT user_id, CASE WHEN module = 'order' THEN 'boutique' ELSE module END AS module FROM orders
      UNION ALL SELECT user_id, 'hotel'     FROM hotel_bookings     WHERE status <> 'annule'
      UNION ALL SELECT user_id, 'gym'       FROM gym_subscriptions
      UNION ALL SELECT user_id, 'gym'       FROM gym_coach_bookings
      UNION ALL SELECT user_id, 'salon'     FROM salon_bookings
      UNION ALL SELECT user_id, 'pool'      FROM pool_passes
      UNION ALL SELECT user_id, 'field'     FROM field_bookings
      UNION ALL SELECT user_id, 'show'      FROM show_bookings
      UNION ALL SELECT user_id, 'event'     FROM event_bookings
      UNION ALL SELECT user_id, 'cybercafe' FROM cybercafe_bookings
    ) t
    WHERE user_id IS NOT NULL
    GROUP BY user_id, module
  `).catch(() => []);

  const reviews = await query<{ user_id: string; module: string; rating: string }>(`
    SELECT user_id::text, module, AVG(rating) AS rating FROM reviews GROUP BY user_id, module
  `).catch(() => []);

  const matrix = new Map<string, Vector>();
  const cell = (u: string) => { if (!matrix.has(u)) matrix.set(u, new Map()); return matrix.get(u)!; };

  for (const r of rows) {
    if (!MODULE_LABELS[r.module]) continue;
    cell(r.user_id).set(r.module, Math.log(1 + Number(r.n)));
  }
  for (const r of reviews) {
    const module = r.module === 'spectacles' ? 'show' : r.module;
    if (!MODULE_LABELS[module]) continue;
    const v = cell(r.user_id);
    // Une note de 5 ajoute +1, une note de 1 retire 1 (un service détesté ne doit pas être recommandé aux voisins)
    const bonus = (Number(r.rating) - 3) / 2;
    v.set(module, Math.max(0.1, (v.get(module) ?? 0.5) + bonus));
  }

  cache = { at: Date.now(), matrix };
  return matrix;
}

export function cosine(a: Vector, b: Vector): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) dot += x * y; }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export interface Recommendation { module: string; score: number; neighbors: number }

/** Recommande des services pour un profil donné (vecteur d'intérêts). */
export function recommendFor(
  profile: Vector, matrix: Map<string, Vector>, excludeUser?: string, limit = 4,
): Recommendation[] {
  const neighbors = [...matrix]
    .filter(([id]) => id !== excludeUser)
    .map(([id, vec]) => ({ id, vec, sim: cosine(profile, vec) }))
    .filter(n => n.sim > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, K_NEIGHBORS);

  const scores = new Map<string, { sum: number; weight: number; count: number }>();
  for (const n of neighbors) {
    for (const [module, value] of n.vec) {
      if (profile.has(module)) continue; // déjà utilisé par le client
      const s = scores.get(module) ?? { sum: 0, weight: 0, count: 0 };
      s.sum += n.sim * value; s.weight += n.sim; s.count++;
      scores.set(module, s);
    }
  }

  const totalSim = neighbors.reduce((s, n) => s + n.sim, 0) || 1;
  return [...scores]
    // score = intérêt moyen pondéré × part des voisins qui ont utilisé ce service
    .map(([module, s]) => ({ module, score: round((s.sum / s.weight) * (s.weight / totalSim)), neighbors: s.count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Ordre par défaut quand la base n'a encore aucun historique. */
const DEFAULT_ORDER = ['hotel', 'restaurant', 'show', 'salon', 'gym', 'pool', 'boutique', 'field', 'event', 'kids', 'cybercafe'];

/** Services classés par popularité (nombre de clients distincts), complétés par l'ordre par défaut. */
export function popularity(matrix: Map<string, Vector>): string[] {
  const counts = new Map<string, number>();
  for (const vec of matrix.values()) for (const m of vec.keys()) counts.set(m, (counts.get(m) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  return [...ranked, ...DEFAULT_ORDER.filter(m => !counts.has(m))];
}

export async function recommendForUser(userId: string | null, limit = 4) {
  const matrix = await loadMatrix();
  const profile = userId ? matrix.get(userId) : undefined;

  if (!profile || profile.size === 0) {
    return { modules: popularity(matrix).slice(0, limit), personalized: false, used: [] as string[], details: [] as Recommendation[] };
  }

  const details = recommendFor(profile, matrix, userId!, limit);
  const modules = details.map(d => d.module);
  // Complète avec les plus populaires si les voisins ne suffisent pas
  for (const m of popularity(matrix)) {
    if (modules.length >= limit) break;
    if (!modules.includes(m) && !profile.has(m)) modules.push(m);
  }
  return { modules, personalized: details.length > 0, used: [...profile.keys()], details };
}

/** Évaluation leave-one-out : taux de réussite dans le top 3, IA vs popularité. */
export async function evaluateRecommender(topN = 3) {
  const matrix = await loadMatrix(true);
  const popular = popularity(matrix);
  let tested = 0, hitsAI = 0, hitsPop = 0;

  // Échantillon borné : le test coûte (clients × services × clients) opérations,
  // on le limite pour qu'il reste rapide même avec des milliers de clients.
  const sample = [...matrix].filter(([, vec]) => vec.size >= 2).slice(0, EVAL_MAX_USERS);
  for (const [userId, vec] of sample) {
    for (const hidden of vec.keys()) {
      const profile = new Map(vec); profile.delete(hidden);
      tested++;
      const ai = recommendFor(profile, matrix, userId, topN).map(r => r.module);
      if (ai.includes(hidden)) hitsAI++;
      const pop = popular.filter(m => !profile.has(m)).slice(0, topN);
      if (pop.includes(hidden)) hitsPop++;
    }
  }

  return {
    users: matrix.size,
    tested,
    topN,
    hitRateAI: tested ? round(hitsAI / tested) : null,
    hitRatePopularity: tested ? round(hitsPop / tested) : null,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
