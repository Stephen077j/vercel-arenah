/**
 * ARENAH IA – Jeu de données d'entraînement du chatbot
 *
 * Chaque "intention" est illustrée par des exemples de questions. Le
 * classifieur bayésien apprend à reconnaître l'intention d'une question
 * nouvelle, même formulée autrement. Ajoutez des exemples pour l'améliorer.
 */
import type { Example } from '../naiveBayes.js';

export const INTENTS: Record<string, string[]> = {
  salutation: [
    'bonjour', 'salut', 'bonsoir', 'coucou', 'hello', 'salama', 'bonjour je voudrais des informations',
    'salut ça va', 'hey', 'bonjour arenah', 'manao ahoana',
    'bonjour à vous', 'bonsoir l\'équipe', 'salut arenah', 'allo', 'bonjour madame', 'bonjour monsieur', 're bonjour', 'bjr', 'slt',
  ],
  au_revoir: [
    'au revoir', 'à bientôt', 'bye', 'bonne journée', 'bonne soirée', 'à plus tard', 'ciao',
    'veloma', 'à la prochaine',
    'à demain', 'je dois y aller', 'salut à plus', 'bonne nuit', 'adieu', 'on se revoit bientôt', 'c\'est tout pour moi',
  ],
  remerciement: [
    'merci', 'merci beaucoup', 'super merci', 'parfait merci', 'misaotra', 'merci pour votre aide',
    'génial merci', 'ok merci', 'c\'est gentil',
    'merci infiniment', 'je vous remercie', 'merci c\'est noté', 'top merci', 'merci bien', 'thanks', 'super, merci pour l\'info', 'misaotra betsaka',
  ],
  aide: [
    'que peux-tu faire', 'aide moi', 'j\'ai besoin d\'aide', 'comment ça marche', 'tu sers à quoi',
    'quels services proposez vous', 'qu\'est ce que je peux faire ici', 'menu principal',
    'quelles sont les activités', 'qu\'est-ce que arenah',
    'aidez moi s\'il vous plait', 'je ne sais pas quoi choisir', 'quelles options avez vous', 'liste des services', 'que proposez vous', 'présente toi', 'qui es tu', 'comment utiliser le site', 'je suis perdu',
  ],
  hotel: [
    'je cherche une chambre', 'réserver une chambre d\'hôtel', 'avez vous des chambres disponibles',
    'prix d\'une nuit à l\'hôtel', 'chambre pour deux personnes ce week-end', 'une suite pour ce soir',
    'combien coûte la chambre familiale', 'dormir chez vous', 'hébergement pour 3 nuits',
    'chambre libre demain', 'je veux loger à l\'hôtel', 'tarif chambre',
    'une nuit à l\'hôtel', 'chambre double', 'chambre single', 'réservation hôtel', 'nuitée', 'je veux dormir ici ce soir', 'il reste des chambres', 'chambre avec vue mer', 'séjour de 2 nuits', 'hôtel pour ma famille', 'une suite', 'chambre pas chère', 'logement', 'check in', 'chambre disponible samedi',
  ],
  restaurant: [
    'je veux manger', 'qu\'est-ce qu\'il y a au menu', 'réserver une table au restaurant',
    'quels plats proposez vous', 'avez vous du romazava', 'carte du restaurant', 'j\'ai faim',
    'table pour 4 ce soir', 'dîner ce soir', 'plats du jour', 'prix des plats', 'boissons disponibles',
    'qu\'est-ce qu\'on mange', 'il y a quoi à manger', 'déjeuner', 'repas du midi', 'menu du jour', 'spécialités malgaches', 'plats végétariens', 'dessert', 'cuisine', 'commander à manger', 'resto', 'plat', 'manger ce soir', 'une table pour deux', 'sakafo', 'carte des vins',
  ],
  spectacle: [
    'quels spectacles ce soir', 'y a-t-il un concert', 'programme des spectacles', 'acheter un billet',
    'événement culturel ce week-end', 'théâtre', 'soirée humour', 'prochain concert', 'places pour le show',
    'que voir ce soir', 'billet concert jazz',
    'concert samedi', 'un concert', 'spectacle ce week-end', 'soirée musique', 'danse traditionnelle', 'billetterie', 'humour', 'artistes', 'que se passe-t-il ce soir', 'spectacles à venir', 'prochains spectacles', 'show', 'hira gasy',
  ],
  salon: [
    'prendre rendez-vous chez le coiffeur', 'prix d\'une coupe', 'salon de beauté', 'coloration cheveux',
    'massage', 'manucure', 'soins du visage', 'je veux me faire coiffer', 'tarif brushing', 'onglerie',
    'coupe de cheveux', 'me faire couper les cheveux', 'coiffure', 'coiffeur', 'tresses', 'ongles', 'maquillage', 'beauté', 'épilation', 'soin', 'rendez-vous beauté', 'combien pour une coupe', 'barbier', 'pédicure', 'spa',
  ],
  gym: [
    'abonnement salle de sport', 'prix de la gym', 'je veux faire du sport', 'coach personnel',
    'musculation', 'fitness', 'abonnement mensuel sport', 'pass journalier gym', 'séance avec un coach',
    'perdre du poids',
    'salle de gym', 'faire de la musculation', 'sport en salle', 'entraînement', 'cardio', 'abonnement fitness', 'coach sportif', 'prix abonnement sport', 'faire du sport ce soir', 'salle de musculation ouverte', 'gym', 'musculation prix',
  ],
  piscine: [
    'piscine ouverte', 'prix entrée piscine', 'cours de natation', 'je veux nager', 'pass piscine',
    'baignade', 'aquagym', 'piscine pour enfants',
    'nager ce week-end', 'la piscine', 'prix de la piscine', 'leçons de natation', 'apprendre à nager', 'horaires piscine', 'quelle heure ferme la piscine', 'se baigner', 'bassin', 'natation enfant',
  ],
  terrain: [
    'réserver un terrain de foot', 'louer le terrain', 'match de football', 'terrain de basket',
    'créneau terrain ce soir', 'prix terrain foot', 'jouer au foot avec des amis', 'terrain de tennis',
    'terrain de football', 'foot à 5', 'réserver un créneau de foot', 'basketball', 'jouer au basket', 'location terrain ce soir', 'faire un match', 'tennis', 'terrain synthétique', 'prix du terrain',
  ],
  enfants: [
    'espace enfants', 'activités pour les enfants', 'aire de jeux', 'anniversaire enfant',
    'prix entrée enfant', 'garderie', 'mes enfants veulent jouer', 'jeux pour enfants',
    'jeux enfants', 'activités enfants', 'mes enfants s\'ennuient', 'espace de jeux', 'trampoline', 'enfants de 5 ans', 'anniversaire pour mon fils', 'zone enfants', 'animation enfants', 'toboggan',
  ],
  cybercafe: [
    'cybercafé', 'accès internet', 'louer un ordinateur', 'jouer à la ps4', 'gaming',
    'imprimer un document', 'prix d\'une heure d\'internet', 'poste de jeu', 'photocopie',
    'internet', 'ordinateur', 'wifi', 'ps4', 'jeux vidéo', 'impression', 'scanner un document', 'imprimer', 'console de jeu', 'cyber', 'playstation',
  ],
  evenement: [
    'organiser un mariage', 'louer une salle', 'salle de réception', 'organiser un anniversaire',
    'séminaire d\'entreprise', 'salle pour 200 personnes', 'événement privé', 'fête de famille',
    'location salle de fête',
    'mariage', 'faire un mariage', 'organiser une fête', 'conférence', 'réception', 'salle de mariage', 'salle de conférence', 'fiançailles', 'baptême', 'traiteur pour un événement', 'location de salle', 'soirée d\'entreprise', '150 invités', 'événementiel',
  ],
  boutique: [
    'acheter un produit', 'boutique en ligne', 'livraison à domicile', 'quels produits vendez vous',
    'commander en ligne', 'articles disponibles', 'faire du shopping',
    'shopping', 'acheter', 'boutique', 'produits', 'articles', 'vêtements', 'souvenirs', 'acheter en ligne', 'commander un article', 'livraison',
  ],
  paiement: [
    'comment payer', 'moyens de paiement', 'payer avec mvola', 'orange money accepté', 'airtel money',
    'paiement par carte', 'payer en espèces', 'le paiement a échoué', 'mobile money',
    'facture de paiement',
    'payer', 'paiement', 'mvola', 'orange money', 'airtel', 'carte bancaire', 'espèces', 'acompte', 'payer en plusieurs fois', 'facture', 'reçu', 'prix total à payer',
  ],
  fidelite: [
    'mes points de fidélité', 'combien de points j\'ai', 'programme fidélité', 'utiliser mes points',
    'carte de fidélité', 'réduction fidélité', 'parrainage', 'code promo',
    'points', 'fidélité', 'mon solde de points', 'cumuler des points', 'avantages clients', 'remise', 'promo', 'promotion', 'réductions', 'bon de réduction', 'voir les promotions',
  ],
  annulation: [
    'annuler ma réservation', 'je veux annuler', 'remboursement', 'modifier ma réservation',
    'changer la date', 'annulation commande', 'me faire rembourser',
    'annuler', 'annulation', 'rembourser', 'remboursement', 'décaler ma réservation', 'report', 'changer ma réservation', 'j\'ai un empêchement', 'modifier la commande',
  ],
  horaires: [
    'horaires d\'ouverture', 'vous êtes ouverts quand', 'à quelle heure vous fermez',
    'ouvert le dimanche', 'heure d\'ouverture', 'jours d\'ouverture',
    'horaires', 'heures d\'ouverture', 'vous ouvrez à quelle heure', 'ouvert ce soir', 'fermé le lundi', 'ouvert jours fériés', 'ça ferme quand', 'ouvert maintenant',
  ],
  contact: [
    'numéro de téléphone', 'comment vous contacter', 'adresse', 'où êtes vous situés',
    'parler à un conseiller', 'email de contact', 'service client', 'itinéraire',
    'contact', 'où êtes vous', 'où se trouve arenah', 'vous êtes situés où', 'téléphone', 'numéro', 'appeler', 'email', 'adresse exacte', 'localisation', 'comment venir', 'plan d\'accès', 'whatsapp', 'joindre quelqu\'un',
  ],
  recommandation: [
    'que me conseilles tu', 'une idée de sortie', 'que faire ce week-end', 'je m\'ennuie',
    'recommande moi quelque chose', 'surprends moi', 'une activité à faire', 'idée cadeau',
    'sortie en couple', 'que faire avec des amis',
    'conseille moi', 'conseil', 'une suggestion', 'idée', 'que faire aujourd\'hui', 'activité en famille', 'sortie entre amis', 'quoi faire', 'activité originale', 'je ne sais pas quoi faire', 'qu\'est ce qui est populaire', 'le plus apprécié',
  ],
};

/**
 * Jeu de TEST : questions réalistes qui ne figurent PAS dans l'entraînement.
 * Sert uniquement à mesurer la précision du chatbot (page "Intelligence IA").
 */
export const CHATBOT_TEST: Example[] = [
  ['Bonjour, avez-vous une chambre pour 2 personnes ce week-end ?', 'hotel'],
  ['je voudrais une suite pour 3 nuits à partir du 12/10', 'hotel'],
  ['combien coûte une nuit chez vous', 'hotel'],
  ['il reste de la place à l\'hôtel demain soir ?', 'hotel'],
  ['il y a quoi de bon à manger ?', 'restaurant'],
  ['je peux réserver une table pour ce soir ?', 'restaurant'],
  ['vous servez des plats malgaches ?', 'restaurant'],
  ['un concert samedi ?', 'spectacle'],
  ['quels sont les prochains spectacles', 'spectacle'],
  ['je veux acheter des billets pour le théâtre', 'spectacle'],
  ['c\'est combien pour une coupe de cheveux', 'salon'],
  ['je voudrais un massage relaxant', 'salon'],
  ['prix d\'une manucure', 'salon'],
  ['combien coûte l\'abonnement à la salle de sport', 'gym'],
  ['je veux un coach pour perdre du poids', 'gym'],
  ['a quelle heure ferme la piscine', 'piscine'],
  ['combien coûte l\'entrée de la piscine', 'piscine'],
  ['je veux réserver le terrain de foot samedi', 'terrain'],
  ['on peut jouer au basket chez vous ?', 'terrain'],
  ['vous avez des jeux pour les enfants ?', 'enfants'],
  ['je veux fêter l\'anniversaire de ma fille de 6 ans', 'enfants'],
  ['je dois imprimer un document', 'cybercafe'],
  ['combien pour une heure d\'internet', 'cybercafe'],
  ['je veux faire un mariage pour 150 invités', 'evenement'],
  ['louer une salle pour un séminaire', 'evenement'],
  ['vous vendez quoi à la boutique ?', 'boutique'],
  ['on peut payer avec mvola ?', 'paiement'],
  ['j\'ai un problème de paiement orange money', 'paiement'],
  ['combien de points de fidélité ai-je ?', 'fidelite'],
  ['avez-vous des codes promo ?', 'fidelite'],
  ['je voudrais annuler ma réservation d\'hier', 'annulation'],
  ['comment me faire rembourser', 'annulation'],
  ['vous êtes ouverts le dimanche ?', 'horaires'],
  ['à quelle heure ouvre la réception', 'horaires'],
  ['quel est votre numéro de téléphone', 'contact'],
  ['où êtes-vous situés exactement', 'contact'],
  ['idée de sortie en couple', 'recommandation'],
  ['que me conseilles-tu pour ce week-end', 'recommandation'],
  ['bonjour !', 'salutation'],
  ['merci beaucoup pour votre aide', 'remerciement'],
  ['au revoir et bonne journée', 'au_revoir'],
  ['que sais-tu faire ?', 'aide'],
].map(([text, label]) => ({ text, label }));

/**
 * Jeu de test DIFFICILE : reformulations qui partagent peu de mots avec les
 * exemples d'entraînement. Mesure ce qu'apporte la compréhension du SENS
 * (réseau de neurones) par rapport à la reconnaissance de MOTS (Naive Bayes).
 * Aucune de ces phrases n'est utilisée pour l'entraînement.
 */
export const CHATBOT_HARD_TEST: Example[] = [
  ['où est-ce que je peux passer la nuit ?', 'hotel'],
  ['il me faut un endroit pour me reposer après mon vol', 'hotel'],
  ['vous louez des suites pour les jeunes mariés ?', 'hotel'],
  ['j\'ai un petit creux', 'restaurant'],
  ['qu\'est-ce que vous cuisinez aujourd\'hui ?', 'restaurant'],
  ['on voudrait déjeuner en famille à midi', 'restaurant'],
  ['il y a un artiste qui se produit bientôt ?', 'spectacle'],
  ['je cherche une sortie culturelle pour samedi soir', 'spectacle'],
  ['mes cheveux sont trop longs', 'salon'],
  ['je voudrais me faire chouchouter', 'salon'],
  ['je veux me remettre en forme', 'gym'],
  ['je cherche un entraîneur pour me muscler', 'gym'],
  ['on peut se baigner chez vous ?', 'piscine'],
  ['mon fils veut apprendre à flotter', 'piscine'],
  ['on cherche où jouer un match à cinq contre cinq', 'terrain'],
  ['mes petits veulent se défouler', 'enfants'],
  ['je dois taper et sortir un CV', 'cybercafe'],
  ['on veut jouer à FIFA sur console', 'cybercafe'],
  ['nous célébrons nos noces l\'an prochain', 'evenement'],
  ['il nous faut un lieu pour une conférence de 100 personnes', 'evenement'],
  ['vous vendez des tee-shirts ?', 'boutique'],
  ['je peux régler par téléphone mobile ?', 'paiement'],
  ['comment je règle ma note ?', 'paiement'],
  ['j\'ai cumulé des avantages sur mon compte ?', 'fidelite'],
  ['je ne pourrai pas venir, je veux être remboursé', 'annulation'],
  ['c\'est ouvert à quelle heure le matin ?', 'horaires'],
  ['comment on vient chez vous depuis l\'aéroport ?', 'contact'],
  ['on peut se garer sur place ?', 'contact'],
  ['on ne sait pas quoi faire ce week-end', 'recommandation'],
  ['coucou toi', 'salutation'],
].map(([text, label]) => ({ text, label }));

/**
 * Jeu de test MESSAGES COURTS : un ou deux mots, comme les clients écrivent
 * souvent. Ajouté après un bug réel (« salut » n'était pas compris).
 */
export const CHATBOT_SHORT_TEST: Example[] = [
  ['salut', 'salutation'], ['Salut !', 'salutation'], ['coucou', 'salutation'], ['hello', 'salutation'],
  ['bonsoir', 'salutation'], ['bjr', 'salutation'], ['salama', 'salutation'],
  ['merci', 'remerciement'], ['merci !', 'remerciement'], ['misaotra', 'remerciement'],
  ['au revoir', 'au_revoir'], ['bye', 'au_revoir'],
  ['chambre', 'hotel'], ['hôtel', 'hotel'], ['menu', 'restaurant'], ['piscine', 'piscine'],
  ['spectacles', 'spectacle'], ['coiffure', 'salon'], ['horaires', 'horaires'], ['paiement', 'paiement'],
  ['aide', 'aide'],
].map(([text, label]) => ({ text, label }));

/**
 * Questions HORS SUJET : le chatbot doit répondre « je n'ai pas compris »
 * plutôt que d'inventer un sujet. Mesure la capacité de rejet.
 */
export const CHATBOT_OUT_OF_SCOPE: string[] = [
  'quelle est la capitale de la France ?', 'blablabla xyz', 'tu aimes les chats ?', 'raconte moi une blague',
  'qui a gagné la coupe du monde', 'combien font 2 + 2', 'il fait beau aujourd\'hui', 'je suis triste',
  'quel est le sens de la vie', 'donne moi le numéro de ta mère', 'asdfghjkl', 'le président de Madagascar',
];

export const CHATBOT_DATA: Example[] = Object.entries(INTENTS).flatMap(([label, texts]) =>
  texts.map(text => ({ text, label })),
);
