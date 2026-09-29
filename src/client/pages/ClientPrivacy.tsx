import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Bot, Database, Eye, Share2, Shield, Trash2, Phone, Mail } from 'lucide-react';

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="font-semibold text-lg">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-11">{children}</div>
  </div>
);

const ClientPrivacy = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
      <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
    </Link>

    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <h1 className="font-display text-3xl">Politique de Confidentialité</h1>
    </div>
    <p className="text-muted-foreground text-sm mb-10">
      Dernière mise à jour : septembre 2026 · ARENAH s'engage à protéger la vie privée de ses utilisateurs
    </p>

    <div className="h-px bg-border mb-10" />

    <Section title="Responsable du traitement" icon={Shield}>
      <p><strong>ARENAH IVATO</strong> est responsable du traitement de vos données personnelles.</p>
      <p>Contact DPO : <a href="mailto:contact@arenah.mg" className="text-primary hover:underline">contact@arenah.mg</a> · +261 34 49 469 39</p>
      <p>Adresse : Route vers Anjomakely, Ivato, Antananarivo 102, Madagascar</p>
    </Section>

    <Section title="Données collectées" icon={Database}>
      <p>ARENAH collecte les données suivantes lorsque vous utilisez notre plateforme :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Données d'identification :</strong> nom complet, adresse email, numéro de téléphone</li>
        <li><strong>Données de compte :</strong> identifiants de connexion (mot de passe chiffré), préférences</li>
        <li><strong>Données transactionnelles :</strong> historique des commandes, réservations et paiements</li>
        <li><strong>Données de navigation :</strong> pages visitées, clics, durée de session (via cookies analytiques)</li>
        <li><strong>Données de localisation :</strong> uniquement si vous renseignez une adresse de livraison</li>
        <li><strong>Avis et commentaires :</strong> notes et commentaires laissés sur nos services</li>
      </ul>
      <p>Nous ne collectons jamais vos informations bancaires complètes. Les transactions financières sont traitées directement par les opérateurs de paiement (MVola, Orange Money, etc.).</p>
    </Section>

    <Section title="Finalités du traitement" icon={Eye}>
      <p>Vos données sont utilisées pour les finalités suivantes :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>Gestion de votre compte et de vos réservations/commandes</li>
        <li>Traitement des paiements et émission de reçus</li>
        <li>Envoi de notifications (statut de commande, confirmation de réservation)</li>
        <li>Personnalisation de votre expérience et recommandations</li>
        <li>Amélioration de nos services (analyses statistiques anonymisées)</li>
        <li>Communication d'offres et promotions (avec votre consentement)</li>
        <li>Prévention de la fraude et sécurisation de la plateforme</li>
        <li>Respect des obligations légales et comptables</li>
      </ul>
    </Section>

    <Section title="Assistant et intelligence artificielle" icon={Bot}>
      <p>ARENAH utilise des outils d'intelligence artificielle développés en interne. <strong>Aucune de vos données n'est envoyée à un service d'IA externe.</strong></p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Assistant (chat) :</strong> les questions que vous posez sont enregistrées <em>sans lien avec votre compte</em>, après masquage automatique des e-mails et numéros de téléphone, afin d'améliorer les réponses. Elles sont supprimées au bout de 90 jours. Évitez d'y écrire des informations personnelles.</li>
        <li><strong>Avis :</strong> vos commentaires sont analysés automatiquement (satisfaction, points forts et points faibles) pour aider nos équipes à améliorer les services.</li>
        <li><strong>Recommandations :</strong> les services suggérés sur l'accueil sont calculés à partir de votre historique de réservations et d'avis, comparé à celui d'autres clients de façon anonyme.</li>
      </ul>
      <p>Ces traitements n'entraînent aucune décision automatique vous concernant (prix, accès aux services…).</p>
    </Section>

    <Section title="Cookies" icon={Database}>
      <p>ARENAH utilise les types de cookies suivants :</p>
      <ul className="list-disc pl-4 space-y-2">
        <li><strong>Cookies essentiels :</strong> nécessaires au fonctionnement de la plateforme (session, panier, authentification). Ils ne peuvent pas être désactivés.</li>
        <li><strong>Cookies analytiques :</strong> nous aident à comprendre comment vous utilisez le site (pages visitées, durée). Anonymisés et agrégés.</li>
        <li><strong>Cookies de personnalisation :</strong> mémorisent vos préférences pour personnaliser votre expérience.</li>
      </ul>
      <p>Vous pouvez accepter ou refuser les cookies non-essentiels via la bannière affichée à votre première visite, ou en vidant votre cache navigateur.</p>
    </Section>

    <Section title="Partage des données" icon={Share2}>
      <p>ARENAH ne vend jamais vos données personnelles à des tiers.</p>
      <p>Vos données peuvent être partagées avec :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Opérateurs de paiement</strong> (MVola, Orange Money, Airtel, prestataires carte bancaire) — uniquement les données nécessaires à la transaction</li>
        <li><strong>Prestataires SMS</strong> — uniquement votre numéro de téléphone pour l'envoi de notifications de commande</li>
        <li><strong>Hébergeurs cloud</strong> — pour le stockage sécurisé des données</li>
        <li><strong>Autorités compétentes</strong> — en cas d'obligation légale uniquement</li>
      </ul>
    </Section>

    <Section title="Conservation des données" icon={Database}>
      <p>Vos données sont conservées pendant les durées suivantes :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Données de compte actif :</strong> pendant toute la durée de votre utilisation + 3 ans après la dernière connexion</li>
        <li><strong>Données transactionnelles :</strong> 10 ans (obligation comptable malgache)</li>
        <li><strong>Données de navigation :</strong> 13 mois maximum</li>
        <li><strong>Questions posées à l'assistant :</strong> 90 jours, de façon anonyme</li>
        <li><strong>Cookies analytiques :</strong> 13 mois</li>
      </ul>
    </Section>

    <Section title="Vos droits" icon={Shield}>
      <p>Conformément à la réglementation applicable, vous disposez des droits suivants sur vos données personnelles :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
        <li><strong>Droit de rectification :</strong> corriger des données inexactes (depuis votre profil)</li>
        <li><strong>Droit à l'effacement :</strong> demander la suppression de votre compte et de vos données</li>
        <li><strong>Droit d'opposition :</strong> vous opposer au traitement à des fins marketing</li>
        <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
      </ul>
      <p>Pour exercer ces droits, contactez-nous à <a href="mailto:contact@arenah.mg" className="text-primary hover:underline">contact@arenah.mg</a> en indiquant votre identifiant de compte.</p>
    </Section>

    <Section title="Suppression de compte" icon={Trash2}>
      <p>Vous pouvez demander la suppression de votre compte et de l'ensemble de vos données personnelles depuis la page <Link to="/mon-profil" className="text-primary hover:underline">Mon Profil</Link>, ou en contactant notre équipe.</p>
      <p>La suppression est effective sous 30 jours. Certaines données peuvent être conservées plus longtemps si une obligation légale l'exige (données comptables notamment).</p>
    </Section>

    <div className="rounded-2xl border border-border bg-muted/30 p-6">
      <p className="font-semibold mb-3">Questions sur vos données ?</p>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +261 34 49 469 39</div>
        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> contact@arenah.mg</div>
        <p className="text-xs mt-2">Délai de réponse : 72 heures ouvrées maximum</p>
      </div>
    </div>
  </div>
);

export default ClientPrivacy;
