/**
 * ARENAH IA – Prétraitement du texte (NLP)
 *
 * Étapes appliquées à chaque phrase avant l'apprentissage ou la prédiction :
 *   1. minuscules + suppression des accents  ("Très BON !" → "tres bon")
 *   2. découpage en mots (tokenisation)
 *   3. gestion de la négation : les mots qui suivent "pas", "jamais"… sont
 *      préfixés par "NON_"  ("pas bon" → "NON_bon"), sinon "bon" et "pas bon"
 *      seraient vus de la même façon
 *   4. suppression des mots vides ("le", "de", "et"…) qui n'apportent rien
 *   5. racinisation légère : on retire les terminaisons courantes
 *      ("rapides" → "rapid", "rapide" → "rapid")
 */

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'et', 'ou', 'a', 'au', 'aux',
  'en', 'dans', 'sur', 'pour', 'par', 'avec', 'ce', 'cet', 'cette', 'ces', 'c', 'qu', 'que',
  'qui', 'quoi', 'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me',
  'm', 'te', 't', 'se', 's', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'est', 'sont', 'etait', 'ete', 'etre',
  'ai', 'as', 'avons', 'avez', 'ont', 'avait', 'y', 'ca', 'cela', 'ici', 'aussi',
  'tout', 'tous', 'toute', 'toutes', 'fait', 'faire', 'suis', 'es', 'sommes', 'etes',
]);

/** Mots qui inversent le sens des mots suivants. */
const NEGATIONS = new Set(['pas', 'jamais', 'rien', 'aucun', 'aucune', 'ni', 'sans', 'tsy']);

/** Mots qui arrêtent la portée d'une négation. */
const NEGATION_BREAKERS = new Set(['mais', 'et', 'car', 'donc', 'cependant']);

const SUFFIXES = ['ement', 'ements', 'ations', 'ation', 'euses', 'euse', 'eux', 'ives', 'ive',
  'ees', 'ee', 'es', 'er', 'e', 's', 'x'];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // retire les accents
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stem(word: string): string {
  if (word.length <= 4 || /^\d+$/.test(word)) return word;
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) return word.slice(0, -suf.length);
  }
  return word;
}

/**
 * Lexique de polarité : mots dont le sens positif ou négatif est connu
 * d'avance. Quand l'option `lexicon` est active, chacun ajoute une
 * caractéristique LEX_POS ou LEX_NEG. Le modèle généralise ainsi mieux à des
 * phrases qu'il n'a jamais vues (approche hybride dictionnaire + apprentissage).
 */
const POSITIVE_WORDS = ['bon', 'bonne', 'bien', 'excellent', 'super', 'parfait', 'genial', 'magnifique',
  'delicieux', 'propre', 'rapide', 'agreable', 'adore', 'recommande', 'top', 'satisfait', 'chaleureux',
  'gentil', 'sympa', 'formidable', 'merveilleux', 'professionnel', 'confortable', 'beau', 'belle',
  'impeccable', 'bravo', 'merci', 'superbe', 'splendide', 'inoubliable', 'content', 'heureux',
  'accueillant', 'efficace', 'savoureux', 'adorable', 'aimable', 'serviable', 'attentionne', 'attentif',
  'sympathique', 'souriant', 'poli', 'courtois', 'competent', 'ravi', 'enchante', 'exceptionnel',
  'remarquable', 'extraordinaire', 'fantastique', 'incroyable', 'excellente', 'soigne', 'spacieux',
  'lumineux', 'calme', 'reposant', 'relaxant', 'frais', 'copieux', 'genereux', 'raffine', 'moderne',
  'tsara', 'madio', 'mahafinaritra', 'misaotra'];
const NEGATIVE_WORDS = ['mauvais', 'mauvaise', 'nul', 'sale', 'lent', 'froid', 'decu', 'decevant', 'horrible',
  'cher', 'impoli', 'desagreable', 'bruit', 'retard', 'casse', 'probleme', 'arnaque', 'dangereux',
  'catastrophe', 'pire', 'inadmissible', 'honteux', 'degoutant', 'abime', 'echoue', 'annule', 'plainte',
  'insupportable', 'mediocre', 'lamentable', 'minable', 'affreux', 'desastreux', 'inacceptable',
  'grossier', 'arrogant', 'meprisant', 'incompetent', 'bruyant', 'crasseux', 'infect', 'immonde',
  'panne', 'fade', 'rate', 'bacle', 'vole', 'escroquerie', 'attente', 'oubli', 'erreur', 'perdu',
  'ratsy', 'maloto', 'lafo'];
const POSITIVE_STEMS = new Set(POSITIVE_WORDS.map(stem));
const NEGATIVE_STEMS = new Set(NEGATIVE_WORDS.map(stem));

export interface TokenizeOptions {
  lexicon?: boolean;
  /** Compte chaque mot une seule fois par phrase (meilleur pour les textes courts). */
  unique?: boolean;
  /** Ajoute le préfixe de 4 lettres des mots longs comme caractéristique supplémentaire. */
  prefixes?: boolean;
}

/** Transforme une phrase en liste de "caractéristiques" pour le classifieur. */
export function tokenize(text: string, opts: TokenizeOptions = {}): string[] {
  const words = normalize(text).split(' ').filter(Boolean);
  const tokens: string[] = [];
  let negate = 0; // nombre de mots encore sous l'effet de la négation

  // "plus" n'est une négation qu'après "ne", un verbe pouvant s'intercaler :
  // "n'est plus propre", "ne sert plus". On retient donc "ne" sur 2 mots.
  let afterNe = 0;

  for (const w of words) {
    const isNegation = w === 'plus' ? afterNe > 0 : NEGATIONS.has(w);
    if (afterNe > 0) afterNe--;
    if (isNegation) { negate = 3; afterNe = 0; tokens.push('NEG'); continue; }
    if (NEGATION_BREAKERS.has(w)) { negate = 0; continue; }
    if (w === 'ne' || w === 'n') { afterNe = 2; continue; }
    if (STOPWORDS.has(w)) continue;
    const s = stem(w);
    const prefix = negate > 0 ? 'NON_' : '';
    tokens.push(prefix + s);
    // Préfixe de 4 lettres : rapproche les mots d'une même famille ("reservation" / "reserver")
    if (opts.prefixes && s.length > 5) tokens.push(`${prefix}P_${s.slice(0, 4)}`);
    if (opts.lexicon) {
      if (POSITIVE_STEMS.has(s)) tokens.push(`${prefix}LEX_POS`);
      else if (NEGATIVE_STEMS.has(s)) tokens.push(`${prefix}LEX_NEG`);
    }
    if (negate > 0) negate--;
  }
  return opts.unique ? [...new Set(tokens)] : tokens;
}

/** Découpe un texte en phrases (utile pour l'analyse par aspect). */
export function sentences(text: string): string[] {
  return text.split(/[.!?;\n]+|,?\s+(?:mais|par contre|cependant|en revanche)\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}
