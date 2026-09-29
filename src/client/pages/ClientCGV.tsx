import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Shield, Clock, CreditCard, Package, XCircle, Phone, Mail } from 'lucide-react';

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

const ClientCGV = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
    {/* Header */}
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
      <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
    </Link>

    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <h1 className="font-display text-3xl">Conditions Générales de Vente</h1>
    </div>
    <p className="text-muted-foreground text-sm mb-10">
      Dernière mise à jour : juin 2026 · Applicable à toutes les transactions effectuées sur la plateforme ARENAH
    </p>

    <div className="h-px bg-border mb-10" />

    <Section title="Objet et champ d'application" icon={FileText}>
      <p>Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des transactions effectuées entre <strong>ARENAH IVATO</strong> (ci-après "ARENAH") et tout client (ci-après "le Client") via la plateforme numérique accessible à l'adresse arenah.mg ou via l'application mobile.</p>
      <p>Toute commande, réservation ou paiement effectué sur la plateforme implique l'acceptation pleine et entière des présentes CGV par le Client. ARENAH se réserve le droit de modifier les présentes conditions à tout moment. La version applicable est celle en vigueur à la date de la transaction.</p>
    </Section>

    <Section title="Services proposés" icon={Package}>
      <p>ARENAH propose les services suivants via sa plateforme numérique :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>Réservation de chambres et suites (hôtel)</li>
        <li>Commande de repas et boissons (restaurant) — livraison, retrait ou sur place</li>
        <li>Abonnements et séances de salle de sport et coaching</li>
        <li>Réservation de créneaux pour le terrain de football</li>
        <li>Cours et forfaits piscine</li>
        <li>Prise de rendez-vous au salon de coiffure et bien-être</li>
        <li>Achat de billets pour spectacles et événements</li>
        <li>Location de postes cybercafé</li>
        <li>Achat de produits en boutique (livraison ou retrait)</li>
        <li>Réservation de salles événementielles</li>
      </ul>
    </Section>

    <Section title="Commandes et réservations" icon={Clock}>
      <p><strong>Commandes restaurant et boutique :</strong> La commande est validée dès la confirmation de paiement. ARENAH s'engage à préparer et livrer (ou mettre à disposition) dans les délais indiqués lors de la commande (généralement 15 à 30 minutes pour le restaurant).</p>
      <p><strong>Réservations hôtel :</strong> Une réservation est confirmée dès le versement de l'acompte indiqué. Le solde est dû à l'arrivée sauf mention contraire.</p>
      <p><strong>Réservations autres services :</strong> La réservation est confirmée par email ou notification dans l'application dès validation du paiement ou de l'acompte.</p>
      <p>ARENAH se réserve le droit de refuser ou annuler toute commande en cas de disponibilité insuffisante, d'erreur manifeste de prix, ou de suspicion de fraude.</p>
    </Section>

    <Section title="Prix et paiement" icon={CreditCard}>
      <p>Tous les prix sont exprimés en <strong>Ariary malgache (MGA)</strong> et sont affichés TTC (toutes taxes comprises applicables en République de Madagascar).</p>
      <p>Les modes de paiement acceptés sont :</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>MVola</strong> (Telma)</li>
        <li><strong>Orange Money</strong> (Orange Madagascar)</li>
        <li><strong>Airtel Money</strong> (Airtel Madagascar)</li>
        <li><strong>Espèces</strong> (à la caisse ARENAH uniquement)</li>
        <li><strong>Carte bancaire</strong> Visa/MasterCard</li>
      </ul>
      <p>En cas de paiement par mobile money, des frais de transaction (environ 3%) peuvent s'appliquer selon l'opérateur. Ces frais sont affichés avant la confirmation du paiement.</p>
      <p>Les codes promotionnels sont nominatifs, à usage unique sauf mention contraire, et ne peuvent être cumulés. Ils ne sont pas échangeables contre de l'argent.</p>
    </Section>

    <Section title="Annulations et remboursements" icon={XCircle}>
      <p><strong>Restaurant / Boutique :</strong> Toute commande en préparation ne peut être annulée. Les commandes en attente peuvent être annulées depuis la rubrique "Mes activités" avant le début de la préparation.</p>
      <p><strong>Hôtel :</strong> L'annulation est gratuite jusqu'à 24h avant la date d'arrivée. En deçà, l'acompte versé est conservé par ARENAH à titre de dédommagement.</p>
      <p><strong>Spectacles et événements :</strong> Les billets vendus ne sont ni remboursables ni échangeables, sauf annulation de l'événement par ARENAH.</p>
      <p><strong>Autres services :</strong> Les conditions d'annulation spécifiques sont indiquées sur chaque page de service.</p>
      <p>En cas de remboursement accordé, celui-ci sera effectué dans un délai de 7 jours ouvrables via le même moyen de paiement utilisé lors de la transaction.</p>
    </Section>

    <Section title="Responsabilités" icon={Shield}>
      <p>ARENAH s'engage à mettre en œuvre tous les moyens nécessaires pour assurer la continuité et la qualité de ses services. Toutefois, ARENAH ne pourra être tenu responsable en cas de force majeure, de panne technique indépendante de sa volonté, ou de toute circonstance exceptionnelle.</p>
      <p>Le Client est responsable de l'exactitude des informations fournies lors de la commande (adresse de livraison, numéro de téléphone). ARENAH ne saurait être tenu responsable d'un retard ou d'un échec de livraison résultant d'informations incorrectes.</p>
    </Section>

    <Section title="Litiges et droit applicable" icon={FileText}>
      <p>Les présentes CGV sont soumises au droit de la <strong>République de Madagascar</strong>. Tout litige relatif à une transaction effectuée sur la plateforme ARENAH sera soumis à la tentative préalable d'un règlement amiable.</p>
      <p>En cas d'échec, le litige sera porté devant les juridictions compétentes de la ville d'Antananarivo, Madagascar.</p>
    </Section>

    <div className="rounded-2xl border border-border bg-muted/30 p-6">
      <p className="font-semibold mb-3">Contact & réclamations</p>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +261 34 49 469 39</div>
        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> contact@arenah.mg</div>
        <p className="text-xs mt-2">ARENAH IVATO — Route vers Anjomakely, Ivato, Antananarivo 102, Madagascar</p>
      </div>
    </div>
  </div>
);

export default ClientCGV;
