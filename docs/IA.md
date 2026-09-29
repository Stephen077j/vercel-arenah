# ARENAH — Intelligence artificielle

Ce document décrit les fonctions d'IA de la plateforme, leurs limites réelles
et la façon de les exploiter au quotidien.

**Principe :** tous les modèles sont programmés dans le serveur ARENAH
(`server/ai/`). Aucune API externe, aucune donnée envoyée à un tiers, aucun
coût à l'usage.

---

## 1. Les trois fonctions

| Fonction | Où | Algorithme | Précision mesurée* |
|---|---|---|---|
| Assistant client (chat) | bulle en bas à droite du site | Naive Bayes + réseau de neurones (Transformer) + extraction d'entités | 100 % sur 42 questions de test, 86 % sur 21 messages courts, 60 % sur 30 reformulations difficiles |
| Analyse des avis | Admin → Intelligence IA | Naive Bayes + lexique de polarité + aspects | 85 % (validation croisée) |
| Recommandations | Accueil → « Pour vous » | Filtrage collaboratif (similarité cosinus) | 83 % vs 55 % pour « les plus populaires »** |

\* Mesurée sur des données que le modèle n'a pas vues à l'entraînement. Les
chiffres à jour sont affichés dans Admin → Intelligence IA → Performances.
\*\* Mesuré sur les données de démonstration ; sera recalculé sur les vraies
données.

### Assistant client

#### Deux modèles complémentaires

| | Naive Bayes | Réseau de neurones |
|---|---|---|
| Ce qu'il reconnaît | des **mots** | le **sens** |
| Exemple compris | « je cherche une chambre » | « où est-ce que je peux passer la nuit ? » |
| Vitesse | < 1 ms | ~20–50 ms |
| Explicable | oui (mots qui ont pesé) | par l'exemple le plus proche |
| Taille | quelques Ko | ~130 Mo (MiniLM multilingue, 12 couches) |

Le Naive Bayes répond seul quand il est sûr : probabilité ≥ 70 %, **ou** 1er
choix au moins 3 fois plus probable que le 2e. (Sur 21 sujets, un message d'un
seul mot comme « salut » n'obtient que 16 %, alors que le modèle n'hésite pas :
c'est pourquoi l'écart avec le 2e choix compte aussi.) Sinon, le réseau de
neurones compare le sens de la question à tous les exemples connus (5 plus
proches voisins) et ne répond que si **au moins 3 sur 5 sont d'accord** et que
la similarité atteint 0,5. En dernier recours, le Naive Bayes répond si son 1er
choix est 2 fois plus probable que le 2e ; sinon la question est traitée comme
hors sujet.

Mesures (ce que vit réellement un client, seuils compris) :

| Jeu de questions | Naive Bayes seul | + réseau de neurones |
|---|---|---|
| 42 questions de test | 39 (93 %) | 42 (100 %) |
| 21 messages courts (« salut », « merci », « menu »…) | 16 (76 %) | 18 (86 %) |
| 30 reformulations difficiles (aucun mot commun) | 11 (37 %) | 18 (60 %) |
| 12 questions hors sujet correctement refusées | 10 | 9 |

Compromis assumé : 3 questions hors sujet sur 12 reçoivent une réponse au lieu
d'un « je n'ai pas compris ». Ne pas comprendre « salut » est plus gênant pour
un client ; ces réponses incertaines partent dans la file Apprentissage.

Historique : la première version ne jugeait que la probabilité brute ; elle ne
comprenait pas « salut » (bug signalé en test). Le jeu « messages courts » a
été ajouté pour que ce cas soit vérifié à chaque modification.

⚠️ Les seuils ont été choisis en mesurant ces mêmes jeux : les chiffres sont
légèrement optimistes. Les vrais chiffres viendront de l'usage (onglet
Apprentissage : taux de questions comprises).

Les réponses données par le réseau de neurones sont envoyées dans la file
Apprentissage : l'admin les valide en un clic, et la phrase validée devient un
exemple que le Naive Bayes apprend à son tour.

Si le réseau de neurones ne peut pas se charger (mémoire insuffisante, modèle
absent), le chatbot continue avec le Naive Bayes seul. `AI_SEMANTIC=off`
le désactive volontairement (serveur de moins de 1 Go de RAM).

#### Ce qu'il fait

1. **Comprend l'intention** de la question parmi 21 sujets (hôtel, restaurant,
   spectacles, salon, paiement, horaires…).
2. **Extrait** la date (« demain », « ce week-end », « 12/10 »), le nombre de
   personnes, de nuits et le budget.
3. **Répond avec les vraies données** : chambres réellement libres aux dates
   demandées, spectacles à venir, tarifs actuels, plats les plus commandés.
4. **Tolère les fautes de frappe** (« chanbre », « piscinne », « restorant »).
5. **Se souvient** de la question précédente (« et pour demain ? »).

#### D'où viennent les prix annoncés ?

Le chatbot **ne recopie rien** : à chaque question, il interroge la base de
données, la même que lit le site. Quand un admin modifie un prix ou retire une
offre, la réponse suivante du chatbot en tient compte, sans délai ni
redémarrage.

| Réponse du chatbot | Modifiée par l'admin dans |
|---|---|
| Chambres, prix par nuit, disponibilités | Hôtel → Gérer les chambres (+ réservations existantes) |
| Plats du restaurant, articles de boutique | Produits / Catalogue produits |
| Spectacles et prix d'appel | Spectacles → programme et sièges (place libre la moins chère) |
| Abonnements gym, séance à l'unité | Plans & Coachs · paramètres du module gym (`prix_seance`) |
| Pass piscine, entrée simple, accompagnant | Gérer les pass · paramètres du module piscine (`tarif_entree`, `tarif_accompagnant`) |
| Créneaux terrain, location à l'heure | Créneaux terrain · paramètres du module terrain (`prix_heure_libre`) |
| Salles d'événement | Salles & Options |
| Postes et forfaits du cybercafé | Gérer les postes |
| Tickets espace enfants | Tarifs enfants |
| Prestations du salon | *(pas encore d'écran admin : modifiables seulement en base)* |

Une offre retirée par l'admin disparaît du site **et** du chatbot, et ne peut
plus être réservée.

**Seule exception**, les informations pratiques (téléphone, adresse,
horaires) : elles sont dans `server/ai/data/businessInfo.ts`, à mettre à jour
par un développeur si elles changent.

### Analyse des avis

Pour chaque avis : sentiment (positif / neutre / négatif), aspects mentionnés
(accueil, propreté, prix, attente, nourriture, confort, ambiance, organisation)
avec leur propre sentiment, et alerte quand la note contredit le commentaire
(5 étoiles avec un texte négatif).

Un admin de module ne voit **que les avis de son module**.

### Recommandations

Les services suggérés sont ceux qu'ont appréciés les clients au profil le plus
proche (réservations, commandes, notes). Sans historique suffisant, l'accueil
affiche les services les plus populaires.

---

## 2. Apprentissage continu

L'IA ne connaît au départ que ~450 exemples rédigés à la main. Les vrais
clients formuleront autrement : elle apprend de ses erreurs, **avec
validation humaine**.

```
Client pose une question ──► l'IA répond ──► question enregistrée (anonyme)
                                   │
          confiance < 50 % ou 👎 du client
                                   ▼
        Admin → Intelligence IA → Apprentissage
        « La bonne réponse est… » → Apprendre
                                   ▼
        Modèle réentraîné immédiatement (sans redémarrage)
        + version historisée avec sa précision
```

- **Qui peut entraîner le chatbot :** le super administrateur uniquement (le
  chatbot est commun à toute la plateforme).
- **Qui peut corriger un avis :** le super administrateur, et chaque admin de
  module pour les avis de son module.
- **Annuler une erreur :** onglet Apprentissage → « Ce que l'IA a appris » →
  🗑 Oublier. Le modèle est réentraîné sans cet exemple.
- Une correction d'admin pèse autant que 3 exemples de base ; une phrase déjà
  corrigée est ensuite reconnue à coup sûr.
- Si l'API tourne sur plusieurs serveurs, chacun recharge les corrections des
  autres en moins d'une minute.

### Routine conseillée

**Une fois par semaine**, le super administrateur ouvre l'onglet
Apprentissage et traite la file « Questions à vérifier » (5 à 10 minutes).
Surveiller la courbe « Évolution de la précision » : elle ne doit pas baisser
après une série de corrections. Si c'est le cas, une correction est
probablement erronée : la retrouver dans l'historique et l'oublier.

---

## 3. Données personnelles

| Donnée | Traitement |
|---|---|
| Questions posées au chat | **anonymes** (aucun lien avec le compte), e-mails et numéros masqués avant enregistrement, **supprimées après 90 jours** (tâche `ai-log-purge`, 03h30 ; durée réglable par `AI_LOG_RETENTION_DAYS`) |
| Phrases apprises par l'IA | conservées sans lien avec un client |
| Avis | analysés sur place, rien n'est envoyé à l'extérieur |
| Recommandations | calculées à partir de l'historique du client, jamais affichées à d'autres |

La politique de confidentialité du site (page `/confidentialite`) décrit ces
traitements. Aucune décision automatique n'est prise sur un client.

Le chat est limité à 20 messages par minute et par adresse IP, pour qu'un
robot ne puisse pas saturer la base.

---

## 4. Limites connues (à connaître avant la mise en ligne)

- **Le chatbot ne réserve pas** : il informe et renvoie vers la bonne page.
  La réservation passe toujours par le parcours normal (avec paiement).
- **Pas de « vraie » conversation** : il reconnaît un sujet par message, il ne
  raisonne pas comme un assistant de type ChatGPT. Le réseau de neurones
  comprend le sens d'une phrase, mais ne génère pas de texte : les réponses
  restent des modèles remplis avec les données de la base. Une question hors
  de ses 21 sujets reçoit « Je n'ai pas bien compris » et part dans la file
  d'apprentissage.
- **Reformulations** : environ 6 sur 10 sont comprises (60 % mesurés) ;
  les autres partent dans la file d'apprentissage.
- **Mémoire serveur** : l'API consomme ~550 Mo avec le réseau de neurones
  (mesuré) ; prévoir un serveur d'au moins 1 Go de RAM (2 Go conseillés avec
  la base sur la même machine).
- **Démarrage** : le réseau de neurones met jusqu'à ~1 minute à se charger ;
  pendant ce temps le chatbot répond avec le Naive Bayes seul.
- **Langues :** français, avec quelques mots de malgache. Le malgache
  s'améliorera avec les corrections des admins (« Apprendre une nouvelle
  phrase »).
- **Sentiment :** environ 1 avis sur 7 est mal classé, surtout l'ironie et les
  avis très nuancés. Le résultat est une **aide à la lecture**, pas un
  jugement : lire les avis signalés avant d'agir.
- **Recommandations :** il faut un historique réel (clients ayant utilisé au
  moins 2 services) pour qu'elles deviennent pertinentes ; les premières
  semaines, la page d'accueil affichera surtout les services populaires.
- **Nouveau sujet** (ex. un futur spa) : ajouter une intention demande une
  intervention d'un développeur (`server/ai/data/chatbotData.ts` +
  réponse dans `server/ai/chatbot.ts`).

---

## 5. Pour les développeurs

| Fichier | Rôle |
|---|---|
| `server/ai/text.ts` | prétraitement : accents, négation, racinisation, lexique |
| `server/ai/naiveBayes.ts` | classifieur, fautes de frappe, validation croisée |
| `server/ai/semantic.ts` | réseau de neurones : vecteurs de sens, plus proches voisins |
| `server/ai/chatbot.ts` | intentions, entités, réponses depuis la base |
| `server/ai/sentiment.ts` | sentiment et aspects des avis |
| `server/ai/recommender.ts` | filtrage collaboratif et son évaluation |
| `server/ai/learning.ts` | apprentissage continu, journal, synchronisation |
| `server/ai/data/` | données d'entraînement et informations pratiques |
| `server/routes/ai.ts` | routes `/api/ai/*` |
| `server/db/schema_ai.sql` | tables `ai_chat_logs`, `ai_training_examples`, `ai_model_versions` |

Tests : `npm run test:server` (37 tests, dont des seuils de précision qui
échouent si une modification dégrade l'IA ; le test du vrai réseau de neurones
ne tourne que si le modèle est téléchargé : `npm run ai:model`).

Le modèle est téléchargé une fois (`npm run ai:model`, ~130 Mo depuis
Hugging Face) ; l'image Docker l'intègre à la construction, et en production
`AI_ALLOW_MODEL_DOWNLOAD=false` interdit tout téléchargement.

Données de démonstration (**développement uniquement**) : `npm run db:seed:ai`.
