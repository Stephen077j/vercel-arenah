/**
 * ARENAH IA – Analyse des avis clients
 *
 * Pour chaque avis :
 *   1. sentiment global (positif / négatif / neutre) par le classifieur bayésien
 *   2. combinaison avec la note en étoiles (le texte compte pour 60 %, la note pour 40 %)
 *   3. aspects mentionnés (accueil, propreté, prix…) avec le sentiment de la
 *      phrase où chaque aspect apparaît
 *   4. détection d'incohérence : 5 étoiles mais texte très négatif (ou l'inverse)
 */
import { NaiveBayes, crossValidate, type Evaluation, type Example } from './naiveBayes.js';
import { normalize, sentences } from './text.js';
import { SENTIMENT_DATA, type Sentiment } from './data/sentimentData.js';

const OPTIONS = { lexicon: true, prefixes: true };
const LEARNED_WEIGHT = 3;
export const SENTIMENTS: Sentiment[] = ['positif', 'negatif', 'neutre'];

// Remplaçable : réentraîné quand un admin corrige le sentiment d'un avis
let learned: Example<Sentiment>[] = [];
let model = new NaiveBayes<Sentiment>(OPTIONS).train(SENTIMENT_DATA);
let evaluation: Evaluation<Sentiment> | null = null;

const trainingData = () => [...SENTIMENT_DATA, ...learned.map(e => ({ ...e, weight: LEARNED_WEIGHT }))];

export function retrainSentiment(learnedExamples: Example<Sentiment>[]) {
  learned = learnedExamples.filter(e => SENTIMENTS.includes(e.label));
  model = new NaiveBayes<Sentiment>(OPTIONS).train(trainingData());
  evaluation = null;
}

// Mesurée sur des phrases non vues à l'entraînement (validation croisée)
export function sentimentEvaluation(): Evaluation<Sentiment> {
  evaluation ??= crossValidate(trainingData(), 5, OPTIONS);
  return evaluation;
}

export const sentimentModelInfo = () => ({
  examples: SENTIMENT_DATA.length + learned.length,
  learned: learned.length,
  vocabulary: model.vocabularySize,
});

/** Aspects et mots-clés (sans accents, comparés au début des mots). */
export const ASPECTS: Record<string, { label: string; keywords: string[] }> = {
  accueil:      { label: 'Accueil & personnel', keywords: ['personnel', 'accueil', 'serveu', 'staff', 'equipe', 'coach', 'coiffeu', 'aimable', 'impoli', 'souriant', 'fandraisana', 'serviable'] },
  proprete:     { label: 'Propreté',            keywords: ['propre', 'sale ', 'salet', 'maloto', 'madio', 'hygien', 'toilette', 'odeur', 'sentait', 'tache', 'degoutant'] },
  prix:         { label: 'Prix',                keywords: ['prix', 'cher', 'lafo', 'tarif', 'arnaque', 'addition', 'rapport qualite'] },
  attente:      { label: 'Rapidité & attente',  keywords: ['attente', 'attendu', 'attendre', 'lent', 'rapide', 'retard', 'vite'] },
  nourriture:   { label: 'Nourriture',          keywords: ['repas', 'plat', 'nourriture', 'sakafo', 'cuisine', 'gout', 'delicieu', 'savoureu', 'dejeuner', 'menu', 'portion', 'romazava'] },
  confort:      { label: 'Confort & équipements', keywords: ['chambre', 'lit ', 'bruit', 'climatisation', 'douche', 'confort', 'efitrano', 'equipement', 'connexion', 'poste', 'pelouse', 'eau '] },
  ambiance:     { label: 'Ambiance',            keywords: ['ambiance', 'musique', 'son ', 'lumiere', 'cadre', 'calme', 'decor'] },
  organisation: { label: 'Organisation & réservation', keywords: ['organis', 'reservation', 'paiement', 'annul', 'rembours', 'commande', 'livraison'] },
};

export interface ReviewAnalysis {
  sentiment: Sentiment;
  confidence: number;
  score: number; // -1 (très négatif) … +1 (très positif)
  textSentiment: Sentiment | null;
  aspects: { id: string; label: string; sentiment: Sentiment }[];
  keywords: string[];
  inconsistent: boolean; // la note ne correspond pas au texte
}

function ratingDistribution(rating: number): Record<Sentiment, number> {
  if (rating <= 2) return { negatif: 0.85, neutre: 0.1, positif: 0.05 };
  if (rating === 3) return { negatif: 0.2, neutre: 0.6, positif: 0.2 };
  return { negatif: 0.05, neutre: 0.1, positif: 0.85 };
}

function argmax(p: Record<Sentiment, number>): Sentiment {
  return (Object.keys(p) as Sentiment[]).reduce((a, b) => (p[a] >= p[b] ? a : b));
}

export function detectAspects(text: string): { id: string; label: string; sentiment: Sentiment }[] {
  const found = new Map<string, Sentiment>();
  for (const sentence of sentences(text)) {
    const norm = ` ${normalize(sentence)} `;
    const pred = model.predict(sentence);
    for (const [id, { keywords }] of Object.entries(ASPECTS)) {
      if (found.has(id)) continue;
      if (keywords.some(k => norm.includes(` ${k}`))) found.set(id, pred.confidence ? pred.label : 'neutre');
    }
  }
  return [...found].map(([id, sentiment]) => ({ id, label: ASPECTS[id].label, sentiment }));
}

export function analyzeReview(comment: string | null | undefined, rating?: number | null): ReviewAnalysis {
  const text = comment?.trim() ?? '';
  const pred = text ? model.predict(text) : null;
  const hasText = !!pred && pred.confidence > 0;

  let dist: Record<Sentiment, number>;
  if (hasText && rating) {
    const r = ratingDistribution(rating);
    dist = {
      positif: 0.6 * pred!.probabilities.positif + 0.4 * r.positif,
      negatif: 0.6 * pred!.probabilities.negatif + 0.4 * r.negatif,
      neutre:  0.6 * pred!.probabilities.neutre  + 0.4 * r.neutre,
    };
  } else if (hasText) {
    dist = pred!.probabilities;
  } else {
    dist = ratingDistribution(rating ?? 3);
  }

  const sentiment = argmax(dist);
  const textSentiment = hasText ? pred!.label : null;
  const inconsistent = !!rating && hasText && pred!.confidence > 0.7 &&
    ((rating >= 4 && textSentiment === 'negatif') || (rating <= 2 && textSentiment === 'positif'));

  return {
    sentiment,
    confidence: Math.round(dist[sentiment] * 100) / 100,
    score: Math.round((dist.positif - dist.negatif) * 100) / 100,
    textSentiment,
    aspects: text ? detectAspects(text) : [],
    keywords: pred?.keywords.map(k => k.word.replace(/^NON_/, 'pas ')) ?? [],
    inconsistent,
  };
}
