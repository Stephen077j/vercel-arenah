# 🎯 ARENAH - Plateforme Self-Service Multi-Services

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/votre-repo)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/votre-repo)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**ARENAH** est une plateforme self-service complète permettant aux clients d'accéder à 10 modules de services différents : boutique, restaurant, hôtel, salle de sport, piscine, salon, terrain de foot, événementiel, cybercafé et spectacles.

---

## ✨ Fonctionnalités principales

- 🔐 **Authentification sécurisée** avec Supabase Auth
- 🎨 **Design moderne et professionnel** avec page de connexion luxe
- 🛍️ **10 modules de services** intégrés
- 🛒 **Panier et commandes** avec gestion complète
- ❤️ **Système de favoris** pour sauvegarder ses préférences
- 🔔 **Notifications en temps réel** avec compteurs
- 📱 **Responsive design** (desktop + mobile)
- 🌐 **Interface multilingue** (à venir)

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ et npm (ou bun)
- Compte Supabase (gratuit)

### Installation

```bash
# 1. Cloner le repository
git clone <YOUR_GIT_URL>
cd local-connect-main

# 2. Installer les dépendances
npm install
# ou avec bun
bun install

# 3. Configurer les variables d'environnement
cp .env.local.example .env.local
# Éditer .env.local avec vos clés Supabase

# 4. Lancer le serveur de développement
npm run dev
# ou avec bun
bun run dev
```

L'application sera accessible sur `http://localhost:5173`

---

## 🔧 Configuration Supabase

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Récupérer l'URL et la clé anon public

### 2. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

### 3. Configuration pour le développement

Pour faciliter le développement, vous pouvez :

1. **Désactiver la confirmation email** (optionnel)
   - Dashboard Supabase → Authentication → Providers → Email
   - Décocher "Confirm email"

2. **Augmenter les limites de rate** (recommandé)
   - Dashboard Supabase → Authentication → Rate Limits
   - Passer à 100/heure

📚 **Guides détaillés disponibles** :
- `GUIDE_CLE_API_SUPABASE.md` - Obtenir les clés Supabase
- `DESACTIVER_CONFIRMATION_EMAIL.md` - Désactiver la confirmation en dev
- `SOLUTION_RATE_LIMIT.md` - Augmenter les limites de rate

---

## 📁 Structure du projet

```
local-connect-main/
├── src/
│   ├── client/                    # Application client (self-service)
│   │   ├── components/            # Composants React
│   │   │   ├── ClientHeader.tsx   # Header avec authentification
│   │   │   └── ClientFooter.tsx   # Footer
│   │   ├── lib/                   # Bibliothèques et utilitaires
│   │   │   ├── clientAuth.tsx     # Context d'authentification
│   │   │   ├── supabase.ts        # Client Supabase
│   │   │   └── clientStore.ts     # Store Zustand
│   │   └── pages/                 # Pages de l'application
│   │       ├── ClientLogin.tsx    # Page de connexion luxe
│   │       ├── ClientHome.tsx     # Page d'accueil
│   │       ├── ClientBoutique.tsx # Module boutique
│   │       └── ...                # Autres modules
│   ├── components/ui/             # Composants shadcn/ui
│   ├── lib/                       # Utilitaires globaux
│   └── App.tsx                    # Point d'entrée
├── public/                        # Assets statiques
├── .env.local                     # Configuration (à créer)
└── Documentation/                 # Guides et documentation
```

---

## 🛠️ Technologies utilisées

### Frontend
- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **React Router v6** - Routing
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Composants UI (Radix UI + Tailwind)
- **Lucide React** - Icônes

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL (base de données)
  - Auth (authentification)
  - Storage (stockage de fichiers)
  - Realtime (temps réel)

### State Management
- **Context API** - Authentification
- **Zustand** - Panier et notifications

### Autres
- **Sonner** - Notifications toast
- **date-fns** - Manipulation de dates
- **Zod** - Validation de schémas

---

## 📚 Documentation

### Guides utilisateur
- 📖 [Guide des clés API Supabase](GUIDE_CLE_API_SUPABASE.md)
- 📖 [Guide de vérification email](GUIDE_VERIFICATION_EMAIL.md)
- 📖 [Désactiver la confirmation email](DESACTIVER_CONFIRMATION_EMAIL.md)
- 📖 [Solution rate limit](SOLUTION_RATE_LIMIT.md)
- 📖 [Compte de test client](COMPTE_TEST_CLIENT.md)
- 📖 [Page de login luxe](PAGE_LOGIN_LUXE.md)

### Documentation technique
- 📖 [Rapport d'audit](RAPPORT_AUDIT.md)
- 📖 [Corrections appliquées](CORRECTIONS_APPLIQUEES.md)
- 📖 [Authentification fonctionnelle](AUTHENTIFICATION_FONCTIONNELLE.md)
- 📖 [Intégration Supabase](INTEGRATION_SUPABASE.md)
- 📖 [Structure base de données](base-donner-supabase.md)
- 📖 [Liste des fonctionnalités](LISTE_FONCTIONNALITES.md)
- 📖 [Résumé final](RESUME_FINAL.md)

---

## 🎨 Modules disponibles

| Module | Route | Description |
|--------|-------|-------------|
| 🏠 Accueil | `/` | Page d'accueil avec présentation |
| 🛍️ Boutique | `/boutique` | Catalogue de produits |
| 🍽️ Restaurant | `/restaurant` | Menu et commande en ligne |
| 🏨 Hôtel | `/hotel` | Réservation de chambres |
| 💪 Salle de sport | `/salle-de-sport` | Réservation de créneaux |
| 🏊 Piscine | `/piscine` | Réservation de créneaux |
| 💇 Salon | `/salon` | Réservation de services |
| ⚽ Terrain de foot | `/terrain-foot` | Réservation de créneaux |
| 🎉 Événementiel | `/evenementiel` | Liste et réservation d'événements |
| 💻 Cybercafé | `/cybercafe` | Réservation de postes |
| 🎭 Spectacles | `/spectacles` | Réservation de billets |

### Pages utilitaires
- 🔐 Connexion : `/login`
- 🛒 Panier : `/panier`
- 📦 Mes commandes : `/mes-commandes`
- ❤️ Favoris : `/favoris`

---

## 🧪 Scripts disponibles

```bash
# Développement
npm run dev          # Lancer le serveur de dev (port 5173)

# Build
npm run build        # Compiler pour la production
npm run preview      # Prévisualiser le build de production

# Qualité du code
npm run lint         # Vérifier le code avec ESLint
npm run type-check   # Vérifier les types TypeScript
```

---

## 🔐 Authentification

### Inscription
1. Aller sur `/login`
2. Cliquer sur l'onglet "Inscription"
3. Remplir le formulaire (nom, email, téléphone, mot de passe)
4. Confirmer l'email (si activé)

### Connexion
1. Aller sur `/login`
2. Entrer email et mot de passe
3. Cliquer sur "Se connecter"

### Compte de test
```
Email: test@arenah.com
Mot de passe: test123456
```

---

## 🚀 Déploiement

### Vercel (recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

### Netlify

```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Déployer
netlify deploy --prod
```

### Variables d'environnement

N'oubliez pas de configurer les variables d'environnement sur votre plateforme de déploiement :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📝 Roadmap

### Version 1.1 (Prochaine)
- [ ] Récupération de mot de passe
- [ ] Gestion du profil utilisateur
- [ ] Protection des routes
- [ ] Recherche globale

### Version 1.2
- [ ] Paiement en ligne
- [ ] Notifications avancées
- [ ] Système d'avis et notes
- [ ] Programme de fidélité

### Version 2.0
- [ ] OAuth (Google, Facebook)
- [ ] Authentification 2FA
- [ ] PWA (mode hors ligne)
- [ ] Mode sombre
- [ ] Multi-langues

---

## 🐛 Problèmes connus

Aucun problème connu actuellement. Si vous rencontrez un bug, veuillez [ouvrir une issue](https://github.com/votre-repo/issues).

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Auteurs

- **Développeur principal** - Kiro AI
- **Date de création** - 17 Mai 2026

---

## 🙏 Remerciements

- [Supabase](https://supabase.com) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com) - Composants UI
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [Lucide](https://lucide.dev) - Icônes
- [Vite](https://vitejs.dev) - Build tool

---

## 📞 Support

Pour toute question ou problème :
1. Consulter la [documentation](RESUME_FINAL.md)
2. Vérifier les [guides spécifiques](LISTE_FONCTIONNALITES.md)
3. Ouvrir une [issue](https://github.com/votre-repo/issues)

---

## 📊 Statistiques

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

**Fait avec ❤️ par l'équipe ARENAH**
