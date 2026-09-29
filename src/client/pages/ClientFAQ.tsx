import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';

const FAQS = [
  {
    cat: 'Commandes & Livraison',
    items: [
      { q: 'Quel est le délai de livraison des commandes restaurant ?', a: 'Les commandes restaurant sont généralement prêtes en 15 à 30 minutes. La livraison dans le complexe ARENAH est immédiate. Pour les commandes hors site, compter 20 à 45 minutes selon votre localisation à Ivato.' },
      { q: 'Puis-je modifier ou annuler ma commande après validation ?', a: 'Oui, tant que votre commande est encore au statut "En attente", vous pouvez l\'annuler depuis la page "Mes activités". Une fois la préparation commencée, l\'annulation n\'est plus possible.' },
      { q: 'Que faire si un article de ma commande est manquant ?', a: 'Contactez-nous immédiatement via WhatsApp (+261 34 49 469 39) en précisant votre numéro de commande. Nous rectifions l\'erreur dans les meilleurs délais avec un remboursement ou un remplacement.' },
    ],
  },
  {
    cat: 'Réservations Hôtel',
    items: [
      { q: 'Jusqu\'à quand puis-je annuler gratuitement ma réservation ?', a: 'L\'annulation est gratuite jusqu\'à 24h avant votre date d\'arrivée. En deçà de 24h, l\'acompte versé est conservé. En cas de force majeure (maladie justifiée, etc.), contactez-nous — nous étudions chaque situation.' },
      { q: 'Le petit-déjeuner est-il inclus dans le prix de la chambre ?', a: 'Cela dépend de la formule choisie. Les offres "Chambre seule" n\'incluent pas le petit-déjeuner, les formules "Chambre + Petit-déjeuner" le précisent clairement sur la page de réservation.' },
      { q: 'Puis-je réserver pour plusieurs nuits ?', a: 'Oui, sélectionnez votre date d\'arrivée et de départ dans le formulaire de réservation. Le tarif est calculé automatiquement en fonction du nombre de nuits.' },
    ],
  },
  {
    cat: 'Paiements & Remboursements',
    items: [
      { q: 'Quels modes de paiement acceptez-vous ?', a: 'Nous acceptons MVola (Telma), Orange Money, Airtel Money, les espèces à la caisse, et les cartes bancaires Visa/MasterCard. Le paiement en espèces n\'est disponible que sur place.' },
      { q: 'Comment utiliser un code promo ?', a: 'Au moment de valider votre panier, saisissez votre code dans le champ "Code promo" et cliquez sur "Appliquer". La remise s\'applique automatiquement sur le total. Les codes promos sont à usage unique et non cumulables.' },
      { q: 'Dans quel délai suis-je remboursé(e) en cas d\'annulation ?', a: 'Les remboursements sont effectués dans un délai de 7 jours ouvrables via le même moyen de paiement utilisé lors de la transaction.' },
    ],
  },
  {
    cat: 'Compte & Application',
    items: [
      { q: 'Comment créer un compte ARENAH ?', a: 'Cliquez sur "Connexion" en haut à droite, puis "Créer un compte". Renseignez votre nom, email et mot de passe. La création est gratuite et instantanée.' },
      { q: 'Comment télécharger l\'application mobile ?', a: 'ARENAH est une Progressive Web App (PWA). Sur mobile, ouvrez le site dans votre navigateur, puis cliquez sur "Ajouter à l\'écran d\'accueil" (bannière en haut) ou dans le menu de votre navigateur. L\'app s\'installe sans passer par un store.' },
      { q: 'Mes données personnelles sont-elles sécurisées ?', a: 'Oui. ARENAH ne revend jamais vos données. Les paiements transitent directement par les opérateurs (MVola, Orange Money...) et nous ne stockons jamais vos informations bancaires. Consultez notre politique de confidentialité pour plus de détails.' },
    ],
  },
  {
    cat: 'Services & Activités',
    items: [
      { q: 'Comment réserver une séance à la salle de sport ?', a: 'Rendez-vous sur la page "Salle de sport", choisissez votre forfait (séance unique, semaine, mois), puis payez en ligne. Votre accès est validé instantanément.' },
      { q: 'Peut-on organiser des événements privés à ARENAH ?', a: 'Oui ! ARENAH dispose d\'espaces événementiels privatisables (salle de conférence, espace cocktail, terrain). Contactez-nous via WhatsApp ou la page "Événementiel" pour un devis personnalisé.' },
      { q: 'Y a-t-il un parking à ARENAH ?', a: 'Oui, ARENAH dispose d\'un parking gratuit pour les clients sur place.' },
    ],
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>}
    </div>
  );
};

const ClientFAQ = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
      <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
    </Link>

    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <h1 className="font-display text-3xl">Questions fréquentes</h1>
    </div>
    <p className="text-muted-foreground text-sm mb-10">Trouvez rapidement une réponse à votre question</p>

    <div className="space-y-6">
      {FAQS.map(section => (
        <div key={section.cat} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">{section.cat}</h2>
          </div>
          <div className="px-5">
            {section.items.map(item => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
      <p className="font-semibold mb-1">Vous n'avez pas trouvé votre réponse ?</p>
      <p className="text-sm text-muted-foreground mb-4">Notre équipe est disponible 7j/7</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href="https://wa.me/261344946939?text=Bonjour ARENAH, j'ai une question."
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: '#25d366' }}
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
        <a
          href="tel:+261344946939"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          <Phone className="w-4 h-4" /> +261 34 49 469 39
        </a>
      </div>
    </div>
  </div>
);

export default ClientFAQ;
