import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'fr' | 'en';

const T = {
  fr: {
    // Nav
    boutique: 'Boutique', restaurant: 'Restaurant', hotel: 'Hôtel', gym: 'Gym',
    pool: 'Piscine', salon: 'Salon', field: 'Terrain', events: 'Événements',
    cybercafe: 'Cybercafé', spectacles: 'Spectacles', kids: 'Espace Kids', orders: 'Commandes',
    // Header
    search: 'Rechercher…', favorites: 'Favoris', cart: 'Panier', login: 'Connexion',
    // User menu
    my_activities: 'Mes activités', my_payments: 'Mes paiements', my_favorites: 'Mes favoris',
    my_profile: 'Mon profil', logout: 'Déconnexion',
    // Common
    add_to_cart: 'Ajouter', book: 'Réserver', pay: 'Payer', cancel: 'Annuler',
    loading: 'Chargement…', back: 'Retour', save: 'Enregistrer', close: 'Fermer',
    // Home
    home_hero_title: 'Votre complexe de loisirs',
    home_hero_sub: 'Hôtel · Restaurant · Sport · Bien-être · Spectacles',
    home_featured: 'Offres du moment',
    home_reco: 'Pour vous',
    home_reco_anon: 'Vous aimerez peut-être',
    home_products: 'Produits & services populaires',
    home_promos: 'Promotions du moment',
    home_reviews: 'Ils nous font confiance',
    // Cart
    cart_empty: 'Votre panier est vide',
    cart_total: 'Total',
    cart_subtotal: 'Sous-total',
    cart_promo: 'Code promo',
    cart_apply: 'Appliquer',
    cart_checkout: 'Choisir le paiement',
    // Orders
    orders_title: 'Mes activités',
    orders_empty: 'Aucune activité',
    orders_refresh: 'Actualiser',
    order_reorder: 'Commander à nouveau',
    order_review: 'Laisser un avis',
    order_cancel: 'Annuler',
    // Statuses
    status_pending: 'En attente', status_prep: 'En préparation', status_shipped: 'Expédiée',
    status_delivered: 'Livrée', status_confirmed: 'Confirmé', status_active: 'Actif',
    status_paid: 'Payé', status_done: 'Terminé', status_cancelled: 'Annulé',
    // Pages
    faq_title: 'Questions fréquentes',
    about_title: 'À propos d\'ARENAH',
    cgv_title: 'Conditions Générales de Vente',
    privacy_title: 'Politique de Confidentialité',
    // Promo
    promo_applied: 'Code appliqué',
    promo_invalid: 'Code invalide ou expiré',
    // Misc
    share: 'Partager', copy_link: 'Copier le lien', copied: 'Lien copié !',
    newsletter_title: 'Recevez nos offres exclusives',
    newsletter_sub: 'Promos, événements et nouveautés ARENAH',
    newsletter_btn: "S'inscrire",
    points: 'pts', your_points: 'Vos points',
    expires_in: 'Expire dans', days: 'j', hours: 'h', minutes: 'min',
  },
  en: {
    boutique: 'Shop', restaurant: 'Restaurant', hotel: 'Hotel', gym: 'Gym',
    pool: 'Pool', salon: 'Salon', field: 'Sports Field', events: 'Events',
    cybercafe: 'Cyber Café', spectacles: 'Shows', kids: 'Kids Zone', orders: 'Orders',
    search: 'Search…', favorites: 'Favorites', cart: 'Cart', login: 'Sign In',
    my_activities: 'My Activities', my_payments: 'My Payments', my_favorites: 'My Favorites',
    my_profile: 'My Profile', logout: 'Sign Out',
    add_to_cart: 'Add', book: 'Book', pay: 'Pay', cancel: 'Cancel',
    loading: 'Loading…', back: 'Back', save: 'Save', close: 'Close',
    home_hero_title: 'Your Leisure Complex',
    home_hero_sub: 'Hotel · Restaurant · Sport · Wellness · Shows',
    home_featured: 'Current Deals',
    home_reco: 'For You',
    home_reco_anon: 'You Might Like',
    home_products: 'Popular Products & Services',
    home_promos: 'Current Promotions',
    home_reviews: 'They Trust Us',
    cart_empty: 'Your cart is empty',
    cart_total: 'Total',
    cart_subtotal: 'Subtotal',
    cart_promo: 'Promo code',
    cart_apply: 'Apply',
    cart_checkout: 'Choose Payment',
    orders_title: 'My Activities',
    orders_empty: 'No activity',
    orders_refresh: 'Refresh',
    order_reorder: 'Order Again',
    order_review: 'Leave a Review',
    order_cancel: 'Cancel',
    status_pending: 'Pending', status_prep: 'Preparing', status_shipped: 'Shipped',
    status_delivered: 'Delivered', status_confirmed: 'Confirmed', status_active: 'Active',
    status_paid: 'Paid', status_done: 'Completed', status_cancelled: 'Cancelled',
    faq_title: 'FAQ',
    about_title: 'About ARENAH',
    cgv_title: 'Terms & Conditions',
    privacy_title: 'Privacy Policy',
    promo_applied: 'Code applied',
    promo_invalid: 'Invalid or expired code',
    share: 'Share', copy_link: 'Copy link', copied: 'Link copied!',
    newsletter_title: 'Get Exclusive Offers',
    newsletter_sub: 'Deals, events and ARENAH news',
    newsletter_btn: 'Subscribe',
    points: 'pts', your_points: 'Your Points',
    expires_in: 'Expires in', days: 'd', hours: 'h', minutes: 'min',
  },
} as const;

export type TKey = keyof typeof T.fr;

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; }

const LangContext = createContext<LangCtx>({
  lang: 'fr', setLang: () => {}, t: (k) => T.fr[k],
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const stored = (localStorage.getItem('arenah_lang') || 'fr') as Lang;
  const [lang, setLangState] = useState<Lang>(stored);
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem('arenah_lang', l); };
  const t = (k: TKey): string => T[lang][k] ?? T.fr[k];
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
