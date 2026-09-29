/**
 * ARENAH IA – Compréhension du SENS par réseau de neurones
 *
 * Le Naive Bayes reconnaît des MOTS : « où passer la nuit ? » ne contient
 * aucun mot de ses exemples sur l'hôtel. Ce module utilise un petit réseau de
 * neurones (Transformer MiniLM multilingue, 12 couches, ~118 Mo) qui
 * transforme chaque phrase en un vecteur de 384 nombres représentant son sens :
 * deux phrases de même sens ont des vecteurs proches, même sans mot commun.
 *
 * Classification par plus proches voisins (k-NN) :
 *   1. on calcule une fois le vecteur de chaque exemple d'entraînement
 *   2. pour une question, on cherche les 5 exemples les plus proches
 *      (similarité cosinus) et on les fait voter
 *   3. on n'accepte la réponse que si les voisins sont d'accord (≥ 3 sur 5)
 *      et assez proches (similarité ≥ 0,5) ; sinon la question est jugée
 *      hors sujet. Ces seuils ont été choisis par mesure (voir docs/IA.md).
 *
 * Le modèle tourne DANS le serveur (onnxruntime), sans API externe.
 *
 * Variables d'environnement :
 *   AI_SEMANTIC=off              désactive le module (petits serveurs < 1 Go de RAM)
 *   AI_MODEL_DIR                 dossier du modèle (défaut : .cache/models)
 *   AI_ALLOW_MODEL_DOWNLOAD=false interdit le téléchargement (production :
 *                                le modèle est intégré à l'image Docker)
 */
import path from 'path';
import type { Example } from './naiveBayes.js';

export const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const K = 5;
export const MIN_AGREEMENT = 0.6;   // part des k voisins qui votent pour l'intention retenue
export const MIN_SIMILARITY = 0.5;  // similarité cosinus minimale avec le plus proche exemple

type Extractor = (texts: string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

let extractor: Extractor | null = null;
let status: 'off' | 'loading' | 'ready' | 'error' = 'off';
let errorMessage = '';
let index: { text: string; label: string; vec: number[] }[] = [];
const vectorCache = new Map<string, number[]>();

export const semanticStatus = () => ({ status, model: MODEL_ID, examples: index.length, error: errorMessage || undefined });
export const semanticReady = () => status === 'ready';

export const modelDir = () => path.resolve(process.env.AI_MODEL_DIR ?? '.cache/models');

/** Charge le réseau de neurones (quelques secondes ; téléchargement unique la 1re fois). */
export async function loadModel(): Promise<Extractor> {
  // Import dynamique : si la bibliothèque manque, le reste du serveur fonctionne
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = modelDir();
  env.allowRemoteModels = process.env.AI_ALLOW_MODEL_DOWNLOAD !== 'false';
  return (await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' })) as unknown as Extractor;
}

async function embed(texts: string[]): Promise<number[][]> {
  if (!extractor) throw new Error('modèle non chargé');
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    out.push(...(await extractor(texts.slice(i, i + 64), { pooling: 'mean', normalize: true })).tolist());
  }
  return out;
}

/** (Ré)indexe les exemples : seuls les nouveaux textes sont recalculés. */
export async function indexExamples(examples: Example[]) {
  if (!extractor) return;
  const missing = [...new Set(examples.map(e => e.text))].filter(t => !vectorCache.has(t));
  if (missing.length) {
    const vecs = await embed(missing);
    missing.forEach((t, i) => vectorCache.set(t, vecs[i]));
  }
  index = examples.map(e => ({ text: e.text, label: e.label, vec: vectorCache.get(e.text)! }));
}

/** Démarrage en arrière-plan : le chatbot fonctionne (Naive Bayes seul) pendant le chargement. */
export async function initSemantic(examples: () => Example[]) {
  if (process.env.AI_SEMANTIC === 'off') { status = 'off'; return; }
  status = 'loading';
  const started = Date.now();
  try {
    extractor = await loadModel();
    await indexExamples(examples());
    status = 'ready';
    console.log(`🧠 Réseau de neurones prêt (${index.length} exemples indexés, ${Date.now() - started} ms)`);
  } catch (err) {
    status = 'error';
    errorMessage = (err as Error).message;
    console.warn(`⚠️  Réseau de neurones indisponible, Naive Bayes seul : ${errorMessage}`);
  }
}

export interface SemanticPrediction {
  label: string;
  similarity: number;   // similarité avec l'exemple le plus proche de cette intention
  agreement: number;    // part des voisins d'accord
  accepted: boolean;    // assez sûr pour répondre ?
  neighbor: string;     // exemple le plus proche (explication)
}

export const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0); // vecteurs normalisés

/** Vote des k plus proches voisins (fonction pure, testable sans modèle). */
export function knnVote(vec: number[], idx: { text: string; label: string; vec: number[] }[], k = K): SemanticPrediction | null {
  if (!idx.length) return null;
  const nearest = idx.map(e => ({ e, s: cosine(vec, e.vec) })).sort((a, b) => b.s - a.s).slice(0, k);
  const votes = new Map<string, number>();
  for (const { e, s } of nearest) votes.set(e.label, (votes.get(e.label) ?? 0) + s);
  const [label] = [...votes].sort((a, b) => b[1] - a[1])[0];
  const same = nearest.filter(n => n.e.label === label);
  const similarity = Math.round(same[0].s * 100) / 100;
  const agreement = same.length / nearest.length;
  return {
    label, similarity, agreement,
    accepted: agreement >= MIN_AGREEMENT && similarity >= MIN_SIMILARITY,
    neighbor: same[0].e.text,
  };
}

export async function semanticPredict(text: string): Promise<SemanticPrediction | null> {
  if (status !== 'ready') return null;
  const [vec] = await embed([text]);
  return knnVote(vec, index);
}
