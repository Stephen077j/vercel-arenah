import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Heart, Star, Users, Trophy } from 'lucide-react';

const STATS = [
  { icon: Users, label: 'Clients actifs', value: '2 000+' },
  { icon: Star,  label: 'Avis positifs',  value: '4.8/5' },
  { icon: Heart, label: 'Modules',         value: '10' },
  { icon: Trophy, label: 'Depuis',         value: '2019' },
];

const MODULES = [
  { emoji: '🏨', name: 'Hôtel',        desc: '12 chambres et suites confortables' },
  { emoji: '🍽️', name: 'Restaurant',   desc: 'Cuisine malgache et internationale' },
  { emoji: '💪', name: 'Salle de sport', desc: 'Équipements modernes & coaching' },
  { emoji: '🏊', name: 'Piscine',       desc: 'Piscine olympique & cours' },
  { emoji: '💇', name: 'Salon',         desc: 'Coiffure, beauté & bien-être' },
  { emoji: '⚽', name: 'Terrain foot',  desc: 'Terrain synthétique éclairé' },
  { emoji: '🎭', name: 'Spectacles',    desc: 'Soirées, concerts & événements' },
  { emoji: '🛍️', name: 'Boutique',      desc: 'Produits locaux & souvenirs' },
  { emoji: '💻', name: 'Cybercafé',     desc: 'Postes haut débit & impression' },
  { emoji: '🎪', name: 'Espace enfants', desc: 'Jeux & animations pour petits' },
];

const TEAM = [
  { name: 'Direction', role: 'Management & Stratégie', emoji: '👔' },
  { name: 'Accueil',   role: 'Service client 7j/7',    emoji: '🤝' },
  { name: 'Cuisine',   role: 'Chefs & équipe restaurant', emoji: '👨‍🍳' },
  { name: 'Tech',      role: 'Plateforme numérique',   emoji: '💻' },
];

const ClientAbout = () => (
  <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
      <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
    </Link>

    {/* Hero */}
    <div className="rounded-3xl overflow-hidden mb-10 relative" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '48px 40px' }}>
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#d4af37' }}>Ivato, Madagascar</p>
        <h1 className="font-display text-4xl font-bold text-white mb-4">ARENAH — Le complexe de loisirs d'Ivato</h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xl">
          ARENAH est un complexe multi-activités implanté au cœur d'Ivato, à deux pas de l'aéroport international d'Antananarivo.
          Depuis 2019, nous offrons à nos clients une expérience unique rassemblant hôtel, restauration, sport, bien-être et divertissement sous un même toit.
        </p>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
      {STATS.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
          <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
          <div className="font-bold text-2xl">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>

    {/* Notre histoire */}
    <div className="rounded-2xl border border-border bg-card p-6 mb-6">
      <h2 className="font-semibold text-lg mb-3">Notre histoire</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        <p>Fondé en 2019, ARENAH est né d'une vision simple : offrir aux habitants d'Ivato et aux voyageurs en transit un espace complet où se retrouver, se détendre, se restaurer et se divertir — sans quitter le quartier.</p>
        <p>Face au succès de nos premières activités (restaurant et hôtel), nous avons progressivement enrichi notre offre pour atteindre aujourd'hui <strong>10 modules</strong> complémentaires, répondant aux besoins quotidiens de nos clients.</p>
        <p>En 2024, nous avons lancé notre plateforme numérique pour permettre à nos clients de gérer toutes leurs réservations et commandes en ligne, 24h/24, depuis leur téléphone.</p>
      </div>
    </div>

    {/* Nos activités */}
    <div className="rounded-2xl border border-border bg-card p-6 mb-6">
      <h2 className="font-semibold text-lg mb-4">Nos 10 modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map(m => (
          <div key={m.name} className="flex items-center gap-3 rounded-xl p-3 bg-muted/40">
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <p className="font-semibold text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Équipe */}
    <div className="rounded-2xl border border-border bg-card p-6 mb-6">
      <h2 className="font-semibold text-lg mb-4">Notre équipe</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TEAM.map(t => (
          <div key={t.name} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <div className="text-3xl mb-2">{t.emoji}</div>
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-[11px] text-muted-foreground">{t.role}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Contact & Localisation */}
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-semibold text-lg mb-4">Nous trouver</h2>
      <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Route vers Anjomakely, Ivato<br />Antananarivo 102, Madagascar</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <a href="tel:+261344946939" className="hover:text-foreground transition-colors">+261 34 49 469 39</a>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <a href="mailto:contact@arenah.mg" className="hover:text-foreground transition-colors">contact@arenah.mg</a>
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Horaires d'accueil</p>
          <p>Réception hôtel & restaurant : <strong>7h – 22h</strong></p>
          <p>Salle de sport : <strong>6h – 21h</strong></p>
          <p>Piscine : <strong>8h – 19h</strong></p>
          <p>Boutique & Cybercafé : <strong>8h – 20h</strong></p>
        </div>
      </div>
    </div>
  </div>
);

export default ClientAbout;
