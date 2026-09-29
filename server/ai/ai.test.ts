/**
 * Tests de l'IA ARENAH — npm run test:server
 *
 * Ils verrouillent le comportement attendu : une modification qui dégrade
 * la compréhension du chatbot ou l'analyse des avis fait échouer les tests.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { normalize, tokenize, sentences } from './text';
import { NaiveBayes, crossValidate, levenshtein } from './naiveBayes';
import { analyzeReview, sentimentEvaluation } from './sentiment';
import { chatbotEvaluation, decideIntent, extractEntities, hybridEvaluation, retrainChatbot, semanticExamples } from './chatbot';
import { initSemantic, knnVote, modelDir } from './semantic';
import { cosine, recommendFor, popularity } from './recommender';
import { redactPersonalData } from './learning';
import { SENTIMENT_DATA } from './data/sentimentData';

describe('prétraitement du texte', () => {
  it('met en minuscules et retire les accents', () => {
    expect(normalize('Très BON Séjour !')).toBe('tres bon sejour');
  });
  it('marque les mots niés', () => {
    expect(tokenize("ce n'est pas propre")).toContain('NON_propr');
    expect(tokenize("le service n'est plus rapide")).toContain('NON_rapid');
  });
  it('ne traite pas "plus" comme une négation hors de "ne … plus"', () => {
    expect(tokenize('le plus beau séjour').some(t => t.startsWith('NON_'))).toBe(false);
  });
  it('découpe les phrases sur "mais"', () => {
    expect(sentences('personnel gentil mais chambre sale')).toHaveLength(2);
  });
});

describe('classifieur bayésien', () => {
  const model = new NaiveBayes().train([
    { text: 'chambre hôtel nuit', label: 'hotel' },
    { text: 'plat repas menu', label: 'resto' },
  ]);

  it('prédit la bonne classe', () => {
    expect(model.predict('une chambre pour la nuit').label).toBe('hotel');
  });
  it('confiance nulle quand aucun mot n\'est connu', () => {
    expect(model.predict('xyzzy blorp').confidence).toBe(0);
  });
  it('corrige les fautes de frappe', () => {
    const p = model.predict('une chanbre');
    expect(p.label).toBe('hotel');
    expect(p.corrections).toEqual([{ from: 'chanbr', to: 'chambr' }]);
  });
  it('distance de Levenshtein', () => {
    expect(levenshtein('chambre', 'chanbre')).toBe(1);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('piscine', 'restaurant', 2)).toBe(3); // arrêt anticipé au-delà du max
  });
  it('un exemple pondéré compte davantage', () => {
    const m = new NaiveBayes().train([
      { text: 'parking voiture', label: 'a' },
      { text: 'parking', label: 'b', weight: 5 },
    ]);
    expect(m.predict('parking').label).toBe('b');
  });
});

describe('analyse des avis', () => {
  it('précision ≥ 75 % en validation croisée (garde-fou de régression)', () => {
    expect(sentimentEvaluation().accuracy).toBeGreaterThanOrEqual(0.75);
  });
  it('reconnaît un avis positif et un avis négatif', () => {
    expect(analyzeReview('Repas délicieux et service rapide, je recommande').sentiment).toBe('positif');
    expect(analyzeReview('Chambre sale et personnel impoli, très déçu').sentiment).toBe('negatif');
  });
  it('détecte les aspects avec leur propre sentiment', () => {
    const a = analyzeReview('Le personnel était adorable mais la chambre était sale');
    expect(a.aspects.find(x => x.id === 'accueil')?.sentiment).toBe('positif');
    expect(a.aspects.find(x => x.id === 'proprete')?.sentiment).toBe('negatif');
  });
  it('signale une note qui contredit le texte', () => {
    expect(analyzeReview('Horrible, sale, personnel impoli, à éviter', 5).inconsistent).toBe(true);
    expect(analyzeReview('Parfait, je recommande', 5).inconsistent).toBe(false);
  });
  it('sans commentaire, se fie à la note', () => {
    expect(analyzeReview(null, 1).sentiment).toBe('negatif');
  });
  it('la validation croisée utilise des données non vues', () => {
    const ev = crossValidate(SENTIMENT_DATA, 5, { lexicon: true });
    expect(ev.total).toBe(SENTIMENT_DATA.length);
  });
});

describe('chatbot', () => {
  it('comprend ≥ 90 % des questions du jeu de test', () => {
    expect(chatbotEvaluation().testSet.accuracy).toBeGreaterThanOrEqual(0.9);
  });

  const jeudi = new Date(2026, 8, 24); // jeudi 24 septembre 2026
  it('extrait dates, personnes, nuits et budget', () => {
    expect(extractEntities('chambre pour 2 personnes ce week-end', jeudi)).toMatchObject({ date: '2026-09-26', persons: 2 });
    expect(extractEntities('3 nuits à partir du 12/10', jeudi)).toMatchObject({ date: '2026-10-12', nights: 3 });
    expect(extractEntities('demain', jeudi).date).toBe('2026-09-25');
    expect(extractEntities('un plat à moins de 20000 ar', jeudi).budget).toBe(20000);
  });
  it('comprend les salutations et remerciements d\'un seul mot (bug réel corrigé)', async () => {
    const { chat } = await import('./chatbot');
    for (const [q, intent] of [['salut', 'salutation'], ['coucou', 'salutation'], ['merci', 'remerciement']]) {
      expect((await chat(q, null)).intent, q).toBe(intent);
    }
  });
  it('ne confond pas "pour une coupe" avec un nombre de personnes', () => {
    expect(extractEntities('combien pour une coupe', jeudi).persons).toBeUndefined();
  });
  it('apprend une correction sans dégrader le reste', async () => {
    const { chat } = await import('./chatbot');
    const before = chatbotEvaluation().testSet.accuracy;
    retrainChatbot([{ text: 'vous avez un parking ?', label: 'contact' }]);
    const r = await chat('vous avez un parking ?', null);
    expect(r.intent).toBe('contact');
    expect(r.confidence).toBe(1);
    expect(chatbotEvaluation().testSet.accuracy).toBeGreaterThanOrEqual(before);
    retrainChatbot([]);
  });
});

describe('hybride Naive Bayes + réseau de neurones : règle de décision', () => {
  const sem = (label: string, accepted: boolean) =>
    ({ label, similarity: 0.7, agreement: accepted ? 0.8 : 0.2, accepted, neighbor: 'ex' });

  it('Naive Bayes sûr de lui : pas besoin du réseau de neurones', () => {
    expect(decideIntent({ nb: { label: 'hotel', confidence: 0.9, margin: 20 }, semantic: sem('gym', true) }))
      .toMatchObject({ intent: 'hotel', engine: 'naive_bayes' });
  });
  it('Naive Bayes hésite : le réseau de neurones décide', () => {
    expect(decideIntent({ nb: { label: 'gym', confidence: 0.35, margin: 1.5 }, semantic: sem('hotel', true) }))
      .toMatchObject({ intent: 'hotel', engine: 'neural' });
  });
  it('voisins en désaccord : hors sujet, pas de réponse inventée', () => {
    expect(decideIntent({ nb: { label: 'gym', confidence: 0.1, margin: 1.2 }, semantic: sem('hotel', false) }).intent).toBeNull();
  });
  it('une correction d\'admin l\'emporte sur tout', () => {
    expect(decideIntent({ remembered: 'contact', nb: { label: 'hotel', confidence: 0.99, margin: 50 }, semantic: null }))
      .toMatchObject({ intent: 'contact', engine: 'memory', confidence: 1 });
  });
  it('question de suite (« et pour demain ? ») : même sujet', () => {
    expect(decideIntent({ nb: { label: 'gym', confidence: 0.2, margin: 1.1 }, semantic: sem('salon', true), followUp: 'hotel' }))
      .toMatchObject({ intent: 'hotel', engine: 'context' });
  });
  it('message d\'un mot : juge l\'écart avec le 2e choix, pas la probabilité brute', () => {
    // « salut » : 16 % seulement (21 intentions), mais 2,4 fois plus que le 2e choix
    expect(decideIntent({ nb: { label: 'salutation', confidence: 0.16, margin: 2.4 }, semantic: null }))
      .toMatchObject({ intent: 'salutation', engine: 'naive_bayes', certain: false });
    expect(decideIntent({ nb: { label: 'hotel', confidence: 0.2, margin: 4 }, semantic: sem('gym', true) }))
      .toMatchObject({ intent: 'hotel', engine: 'naive_bayes', certain: true });
  });
  it('les réponses du réseau de neurones sont soumises à l\'admin', () => {
    expect(decideIntent({ nb: { label: 'gym', confidence: 0.2, margin: 1.1 }, semantic: sem('hotel', true) }).certain).toBe(false);
  });
  it('réseau de neurones indisponible : Naive Bayes seul', () => {
    expect(decideIntent({ nb: { label: 'hotel', confidence: 0.4, margin: 1.5 }, semantic: null }))
      .toMatchObject({ intent: 'hotel', engine: 'naive_bayes' });
  });
});

describe('vote des plus proches voisins', () => {
  const idx = [
    { text: 'a1', label: 'hotel', vec: [1, 0] }, { text: 'a2', label: 'hotel', vec: [0.95, 0.31] },
    { text: 'a3', label: 'hotel', vec: [0.9, 0.44] }, { text: 'b1', label: 'gym', vec: [0, 1] },
    { text: 'b2', label: 'gym', vec: [0.31, 0.95] },
  ];
  it('retient l\'intention majoritaire et accepte si les voisins sont d\'accord', () => {
    expect(knnVote([1, 0], idx)).toMatchObject({ label: 'hotel', accepted: true, neighbor: 'a1' });
  });
  it('refuse quand la question est loin de tous les exemples', () => {
    expect(knnVote([-1, 0], idx)?.accepted).toBe(false);
  });
});

// Test du vrai modèle : seulement s'il est déjà téléchargé (npm run ai:model)
describe.skipIf(!fs.existsSync(path.join(modelDir(), 'Xenova')))('réseau de neurones (modèle réel)', () => {
  it('comprend des reformulations que le Naive Bayes rate', async () => {
    await initSemantic(semanticExamples);
    const r = await hybridEvaluation();
    const hard = r.sets.find(s => s.name.startsWith('Reformulations'))!;
    expect(r.neuralReady).toBe(true);
    expect(hard.hybrid).toBeGreaterThan(hard.naiveBayes);
    expect(hard.hybrid).toBeGreaterThanOrEqual(15);
    expect(r.outOfScope.hybridRejected).toBeGreaterThanOrEqual(r.outOfScope.total - 4);
  }, 300_000);
});

describe('recommandations', () => {
  const v = (o: Record<string, number>) => new Map(Object.entries(o));
  const matrix = new Map([
    ['a', v({ hotel: 1, restaurant: 1, show: 1 })],
    ['b', v({ hotel: 1, restaurant: 1, show: 1 })],
    ['c', v({ gym: 1, pool: 1, field: 1 })],
  ]);

  it('similarité cosinus', () => {
    expect(cosine(v({ x: 1 }), v({ x: 2 }))).toBeCloseTo(1);
    expect(cosine(v({ x: 1 }), v({ y: 1 }))).toBe(0);
  });
  it('recommande ce que les clients similaires ont aimé', () => {
    const reco = recommendFor(v({ hotel: 1, restaurant: 1 }), matrix).map(r => r.module);
    expect(reco[0]).toBe('show');
    expect(reco).not.toContain('gym');
  });
  it('ne recommande pas un service déjà utilisé', () => {
    expect(recommendFor(v({ hotel: 1 }), matrix).map(r => r.module)).not.toContain('hotel');
  });
  it('popularité complétée par un ordre par défaut quand la base est vide', () => {
    expect(popularity(new Map()).length).toBeGreaterThan(4);
  });
});

describe('protection des données du chat', () => {
  it('masque e-mails et numéros de téléphone', () => {
    const r = redactPersonalData('écrivez à jean.rakoto@gmail.com ou au +261 34 12 345 67');
    expect(r).not.toContain('gmail');
    expect(r).not.toContain('345');
    expect(r).toContain('[e-mail]');
    expect(r).toContain('[numéro]');
    expect(redactPersonalData('au 034 12 345 67 ou demain')).toBe('au [numéro] ou demain');
  });
  it('ne masque pas les prix ni les dates', () => {
    expect(redactPersonalData('chambre à 180 000 ar le 12/10')).toBe('chambre à 180 000 ar le 12/10');
  });
});
