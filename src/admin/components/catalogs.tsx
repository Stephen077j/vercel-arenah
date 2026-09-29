/**
 * Offres gérables par l'admin via CatalogManager, module par module.
 * Les clés (kind) correspondent à server/routes/admin/catalog.ts.
 */
import CatalogManager from './CatalogManager';

const SALON = '#f472b6';
const POOL = '#22d3ee';
const CYBER = '#6366f1';

const SALON_CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' }, { value: 'barbier', label: 'Barbier' },
  { value: 'soins', label: 'Soins du visage' }, { value: 'ongles', label: 'Ongles & beauté' },
  { value: 'massage', label: 'Massage & spa' }, { value: 'maquillage', label: 'Maquillage' },
  { value: 'epilation', label: 'Épilation' },
];

export const SalonServicesCatalog = () => (
  <CatalogManager kind="salon-services" icon="💇" accent={SALON}
    title="Prestations du salon" description="Coupes, soins, massages… proposés à la réservation"
    addLabel="Nouvelle prestation" titleField="label" priceField="price" groupBy="category"
    details={r => `${r.duration} min`}
    fields={[
      { name: 'label', label: 'Nom de la prestation', type: 'text', required: true, placeholder: 'Ex : Coupe + brushing' },
      { name: 'category', label: 'Catégorie', type: 'select', required: true, options: SALON_CATEGORIES, defaultValue: 'coiffure' },
      { name: 'price', label: 'Prix', type: 'number', required: true, suffix: 'Ar', step: 1000, defaultValue: 15000 },
      { name: 'duration', label: 'Durée', type: 'number', required: true, suffix: 'min', step: 15, defaultValue: 30,
        hint: 'Sert à calculer les créneaux disponibles' },
    ]} />
);

export const SalonTeamCatalog = () => (
  <CatalogManager kind="salon-hairdressers" icon="✂️" accent={SALON}
    title="Équipe du salon" description="Les clients peuvent choisir la personne qui s'occupe d'eux"
    addLabel="Ajouter un membre" titleField="name"
    details={r => String(r.specialty || 'Toutes prestations')}
    fields={[
      { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Ex : Marie Rakoto' },
      { name: 'specialty', label: 'Spécialité', type: 'text', placeholder: 'Ex : Coloration, tresses' },
    ]} />
);

export const PoolCoursesCatalog = () => (
  <CatalogManager kind="pool-courses" icon="🏊" accent={POOL}
    title="Cours de natation" description="Cours collectifs réservables par les clients"
    addLabel="Nouveau cours" titleField="name" priceField="price"
    details={r => [
      r.instructor ? `Avec ${r.instructor}` : null,
      `${r.max_students} élèves max`,
      Array.isArray(r.slots) && r.slots.length ? `Créneaux : ${r.slots.join(', ')}` : 'Aucun créneau',
    ].filter(Boolean).join(' · ')}
    fields={[
      { name: 'name', label: 'Nom du cours', type: 'text', required: true, placeholder: 'Ex : Natation enfants débutants' },
      { name: 'instructor', label: 'Maître-nageur', type: 'text', placeholder: 'Ex : Hery' },
      { name: 'price', label: 'Prix par séance', type: 'number', required: true, suffix: 'Ar', step: 1000, defaultValue: 20000 },
      { name: 'max_students', label: 'Élèves maximum', type: 'number', required: true, defaultValue: 10 },
      { name: 'slots', label: 'Créneaux horaires', type: 'tags', placeholder: '08:00, 10:00, 16:00',
        hint: 'Séparés par des virgules' },
    ]} />
);

export const CyberDurationsCatalog = () => (
  <CatalogManager kind="cybercafe-durations" icon="⏱️" accent={CYBER}
    title="Forfaits de durée" description="Durées proposées pour réserver un poste"
    addLabel="Nouveau forfait" titleField="label" priceField="price"
    details={r => `${r.minutes} minutes`}
    fields={[
      { name: 'label', label: 'Nom', type: 'text', required: true, placeholder: 'Ex : 2 heures' },
      { name: 'minutes', label: 'Durée', type: 'number', required: true, suffix: 'min', step: 15, defaultValue: 60 },
      { name: 'price', label: 'Prix', type: 'number', required: true, suffix: 'Ar', step: 500, defaultValue: 8000 },
    ]} />
);

export const CyberServicesCatalog = () => (
  <CatalogManager kind="cybercafe-services" icon="🖨️" accent={CYBER}
    title="Services du cybercafé" description="Impression, scan, photocopie… ajoutés à une réservation"
    addLabel="Nouveau service" titleField="label" priceField="price"
    details={() => 'Supplément à la réservation'}
    fields={[
      { name: 'label', label: 'Nom du service', type: 'text', required: true, placeholder: 'Ex : Impression couleur (page)' },
      { name: 'price', label: 'Prix', type: 'number', required: true, suffix: 'Ar', step: 100, defaultValue: 500 },
    ]} />
);

export const Ps4GamesCatalog = () => (
  <CatalogManager kind="ps4-games" icon="🎮" accent={CYBER}
    title="Jeux PS4 disponibles" description="Proposés aux clients qui réservent un poste PS4"
    addLabel="Ajouter un jeu" titleField="title"
    details={r => [r.genre, r.players ? `${r.players} joueur${Number(r.players) > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ') || 'Jeu PS4'}
    fields={[
      { name: 'title', label: 'Titre', type: 'text', required: true, placeholder: 'Ex : EA Sports FC 25' },
      { name: 'genre', label: 'Genre', type: 'text', placeholder: 'Ex : Football' },
      { name: 'players', label: 'Joueurs maximum', type: 'number', defaultValue: 2 },
      { name: 'image_url', label: 'Image (facultatif)', type: 'url', placeholder: 'https://…',
        hint: 'Adresse https:// ou fichier envoyé (/uploads/…)' },
    ]} />
);
