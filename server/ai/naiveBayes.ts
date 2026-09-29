/**
 * ARENAH IA – Classifieur bayésien naïf (Naive Bayes multinomial)
 *
 * Implémenté à la main, sans bibliothèque ni API externe.
 *
 * Principe (théorème de Bayes) : pour une phrase composée des mots w1…wn,
 * on choisit la classe c qui maximise
 *
 *     P(c | phrase) ∝ P(c) × P(w1 | c) × P(w2 | c) × … × P(wn | c)
 *
 *   - P(c)      = proportion des exemples d'entraînement de la classe c
 *   - P(w | c)  = (nb d'apparitions de w dans c + 1) / (nb de mots de c + taille du vocabulaire)
 *                 le "+1" est le lissage de Laplace : un mot jamais vu ne met
 *                 pas la probabilité à zéro
 *
 * On travaille en logarithmes (somme au lieu de produit) pour éviter que les
 * très petits nombres deviennent 0 en mémoire.
 *
 * Deux ajouts pour les vrais clients :
 *   - poids des exemples : une correction faite par un admin compte plus
 *     qu'un exemple de base (apprentissage continu)
 *   - tolérance aux fautes de frappe : un mot inconnu est rapproché du mot
 *     connu le plus proche (distance de Levenshtein), "chanbre" → "chambre"
 */
import { tokenize, type TokenizeOptions } from './text.js';

export interface Example<L extends string = string> {
  text: string;
  label: L;
  /** Importance de l'exemple (1 par défaut ; les corrections d'admin comptent plus). */
  weight?: number;
}

export interface Prediction<L extends string = string> {
  label: L;
  confidence: number;                 // probabilité de la classe choisie (0–1)
  /**
   * Écart avec le 2e choix : P(1er) / P(2e). Sur un message très court, la
   * probabilité se répartit entre toutes les classes et reste basse même quand
   * le modèle n'hésite pas (« salut » : 16 %, mais 2,3 fois plus que le 2e choix).
   */
  margin: number;
  probabilities: Record<L, number>;   // probabilité de chaque classe
  keywords: { word: string; weight: number }[]; // mots qui ont le plus pesé
  corrections: { from: string; to: string }[];  // fautes de frappe corrigées
}

/** Distance de Levenshtein : nombre minimal de lettres à ajouter/supprimer/remplacer. */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1; // inutile de continuer
    prev = cur;
  }
  return prev[b.length];
}

export interface Evaluation<L extends string = string> {
  accuracy: number;
  total: number;
  correct: number;
  labels: L[];
  confusion: Record<L, Record<L, number>>; // confusion[vraie][prédite]
  perClass: Record<L, { precision: number; recall: number; f1: number; support: number }>;
}

export interface NaiveBayesOptions extends TokenizeOptions {
  /**
   * Probabilité a priori identique pour chaque classe. À utiliser quand le
   * nombre d'exemples par classe reflète le travail de rédaction et non la
   * fréquence réelle : sinon, sur un message d'un seul mot (« salut »), les
   * classes riches en exemples (restaurant, hôtel) écrasent la bonne réponse.
   */
  uniformPrior?: boolean;
}

export class NaiveBayes<L extends string = string> {
  private docCount = new Map<L, number>();
  private wordCount = new Map<L, Map<string, number>>();
  private totalWords = new Map<L, number>();
  private vocabulary = new Set<string>();
  private totalDocs = 0;

  constructor(private readonly options: NaiveBayesOptions = {}) {}

  train(examples: Example<L>[]): this {
    for (const { text, label, weight = 1 } of examples) {
      this.totalDocs += weight;
      this.docCount.set(label, (this.docCount.get(label) ?? 0) + weight);
      if (!this.wordCount.has(label)) this.wordCount.set(label, new Map());
      const counts = this.wordCount.get(label)!;

      for (const tok of tokenize(text, this.options)) {
        this.vocabulary.add(tok);
        counts.set(tok, (counts.get(tok) ?? 0) + weight);
        this.totalWords.set(label, (this.totalWords.get(label) ?? 0) + weight);
      }
    }
    this.plainWords = null;
    return this;
  }

  private plainWords: string[] | null = null;

  /**
   * Mot inconnu → mot connu le plus proche (1 faute tolérée jusqu'à 7 lettres,
   * 2 au-delà). Seuls les vrais mots sont concernés, pas les caractéristiques
   * techniques (préfixes P_, lexique LEX_).
   */
  private closestKnownWord(token: string): string | null {
    const neg = token.startsWith('NON_');
    const word = neg ? token.slice(4) : token;
    if (word.length < 4 || /^\d+$/.test(word) || word.includes('_')) return null;
    this.plainWords ??= [...this.vocabulary].filter(w => !w.includes('_') && w !== 'NEG');
    const maxDist = word.length >= 8 ? 2 : 1;
    let best: string | null = null;
    let bestDist = maxDist + 1;
    for (const candidate of this.plainWords) {
      const d = levenshtein(word, candidate, maxDist);
      if (d < bestDist) { best = candidate; bestDist = d; if (d === 1 && maxDist === 1) break; }
    }
    if (!best) return null;
    const fixed = neg ? `NON_${best}` : best;
    return this.vocabulary.has(fixed) ? fixed : best;
  }

  get labels(): L[] { return [...this.docCount.keys()]; }
  get vocabularySize(): number { return this.vocabulary.size; }
  get trainingSize(): number { return this.totalDocs; }

  /** log P(w | c) avec lissage de Laplace */
  private logLikelihood(word: string, label: L): number {
    const count = this.wordCount.get(label)?.get(word) ?? 0;
    const total = this.totalWords.get(label) ?? 0;
    return Math.log((count + 1) / (total + this.vocabulary.size));
  }

  predict(text: string): Prediction<L> {
    // Mot inconnu : on tente de corriger une faute de frappe, sinon on l'ignore
    // (un mot jamais vu n'apporte aucune information).
    const tokens: string[] = [];
    const corrections: { from: string; to: string }[] = [];
    for (const t of tokenize(text, this.options)) {
      if (this.vocabulary.has(t)) { tokens.push(t); continue; }
      const fixed = this.closestKnownWord(t);
      if (fixed && !tokens.includes(fixed)) { tokens.push(fixed); corrections.push({ from: t, to: fixed }); }
    }
    const logScores = {} as Record<L, number>;

    for (const label of this.labels) {
      let score = this.options.uniformPrior ? 0 : Math.log(this.docCount.get(label)! / this.totalDocs); // log P(c)
      for (const tok of tokens) score += this.logLikelihood(tok, label);
      logScores[label] = score;
    }

    // Softmax : transforme les scores logarithmiques en probabilités qui somment à 1
    const max = Math.max(...Object.values<number>(logScores));
    const exp = {} as Record<L, number>;
    let sum = 0;
    for (const label of this.labels) { exp[label] = Math.exp(logScores[label] - max); sum += exp[label]; }
    const probabilities = {} as Record<L, number>;
    for (const label of this.labels) probabilities[label] = exp[label] / sum;

    const best = this.labels.reduce((a, b) => (probabilities[a] >= probabilities[b] ? a : b));
    const second = Math.max(0, ...this.labels.filter(l => l !== best).map(l => probabilities[l]));

    // Explication : pour chaque mot, combien il favorise la classe gagnante
    // par rapport à la moyenne des autres classes.
    const others = this.labels.filter(l => l !== best);
    const keywords = [...new Set(tokens)]
      .map(word => {
        const own = this.logLikelihood(word, best);
        const rest = others.length
          ? others.reduce((s, l) => s + this.logLikelihood(word, l), 0) / others.length
          : 0;
        return { word, weight: Math.round((own - rest) * 100) / 100 };
      })
      .filter(k => k.weight > 0 && k.word !== 'NEG' && !k.word.includes('LEX_'))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    return {
      label: best,
      confidence: tokens.length ? probabilities[best] : 0,
      margin: tokens.length && second > 0 ? probabilities[best] / second : 0,
      probabilities,
      keywords,
      corrections,
    };
  }
}

/** Mélange déterministe (même résultat à chaque démarrage → métriques stables). */
function shuffle<T>(items: T[], seed = 42): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Validation croisée à k plis : on découpe les données en k parts, on
 * entraîne sur k-1 parts et on teste sur la dernière, k fois. Le modèle est
 * donc toujours évalué sur des phrases qu'il n'a jamais vues.
 */
export function crossValidate<L extends string>(
  examples: Example<L>[], k = 5, options: NaiveBayesOptions = {},
): Evaluation<L> {
  const data = shuffle(examples);
  const pairs: [L, L][] = [];
  for (let fold = 0; fold < k; fold++) {
    const test = data.filter((_, i) => i % k === fold);
    const train = data.filter((_, i) => i % k !== fold);
    const model = new NaiveBayes<L>(options).train(train);
    for (const ex of test) pairs.push([ex.label, model.predict(ex.text).label]);
  }
  return summarize(pairs);
}

/** Évalue un modèle déjà entraîné sur un jeu de test séparé. */
export function evaluate<L extends string>(model: NaiveBayes<L>, test: Example<L>[]): Evaluation<L> {
  return summarize(test.map(ex => [ex.label, model.predict(ex.text).label] as [L, L]));
}

/** Calcule précision globale, matrice de confusion et scores par classe. */
function summarize<L extends string>(pairs: [L, L][]): Evaluation<L> {
  const labels = [...new Set(pairs.flat())];
  const confusion = {} as Record<L, Record<L, number>>;
  for (const a of labels) {
    confusion[a] = {} as Record<L, number>;
    for (const b of labels) confusion[a][b] = 0;
  }
  let correct = 0;
  for (const [actual, predicted] of pairs) {
    confusion[actual][predicted]++;
    if (actual === predicted) correct++;
  }

  const perClass = {} as Evaluation<L>['perClass'];
  for (const l of labels) {
    const tp = confusion[l][l];
    const predicted = labels.reduce((s, x) => s + confusion[x][l], 0);
    const actual = labels.reduce((s, x) => s + confusion[l][x], 0);
    const precision = predicted ? tp / predicted : 0;
    const recall = actual ? tp / actual : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    perClass[l] = { precision: round(precision), recall: round(recall), f1: round(f1), support: actual };
  }

  return { accuracy: round(correct / pairs.length), total: pairs.length, correct, labels, confusion, perClass };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
