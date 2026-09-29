# ARENAH — Comment démarrer

## Option Docker (le plus simple)

Seul [Docker Desktop](https://www.docker.com/products/docker-desktop/) est
nécessaire : PostgreSQL, l'API et le site tournent dans des conteneurs.

```bash
cp .env.docker.example .env     # puis remplir DB_PASSWORD et JWT_SECRET
docker compose up -d --build
```

Au premier démarrage, les tables sont créées et les données de démo chargées
automatiquement (comptes à mots de passe publics, faux clients et faux avis
pour démontrer l'IA). **Réservé au développement et aux démonstrations** :
pour la mise en ligne, suivre la section « Déploiement Docker sur VPS » de
[DEPLOIEMENT.md](DEPLOIEMENT.md). Fonctionnement de l'IA : [docs/IA.md](docs/IA.md).

| Quoi | URL |
|------|-----|
| Site | http://localhost:8088 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/api/docs |
| PostgreSQL | `localhost:5433` (utilisateur `postgres`, mot de passe du `.env`) |

Commandes utiles : `docker compose logs -f api` (logs), `docker compose down`
(arrêt, données conservées), `docker compose down -v` (arrêt + base effacée).

## Option sans Docker

### Prérequis

PostgreSQL 14+ installé et démarré, avec une base nommée `arenah` :

```bash
createdb -U postgres arenah
```

La connexion se configure dans `.env.local` (`DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD`).

## Première fois (installation)

```bash
npm install
npm run db:init
npm run db:seed
```

`db:init` crée les 58 tables, `db:seed` charge les comptes et le catalogue de démo.

## Démarrer le projet

### Option 1 — Tout en une commande (recommandé)
```bash
npm run dev:all
```
Lance le serveur API **et** le frontend en même temps.

### Option 2 — Deux terminaux séparés

**Terminal 1 — Serveur API :**
```bash
npm run server:dev
```

**Terminal 2 — Frontend :**
```bash
npm run dev
```

## URLs

| Quoi | URL |
|------|-----|
| Site client | http://localhost:8080 |
| Espace admin module | http://localhost:8080/admin |
| Portail Super Admin | http://localhost:8080/super-admin |
| API serveur | http://localhost:3001 |
| Documentation API (Swagger) | http://localhost:3001/api-docs |

## Comptes de test

La connexion se fait via `/login` pour tous les rôles — il n'y a pas de page de
connexion séparée pour l'administration.

Les mots de passe sont ceux que le seed a utilisés. En développement, il
applique des valeurs par défaut et les **affiche en fin d'exécution** —
relancez `npm run db:seed` pour les revoir.

En production, le seed refuse de démarrer tant que `SEED_ADMIN_PASSWORD` et
`SEED_CLIENT_PASSWORD` ne sont pas fournis :

```bash
SEED_ADMIN_PASSWORD='...' SEED_CLIENT_PASSWORD='...' npm run db:seed
```

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Client | client@arenah.mg | `SEED_CLIENT_PASSWORD` |
| Super Admin | superadmin@arenah.mg | `SEED_ADMIN_PASSWORD` |
| Propriétaire | proprietaire@arenah.mg | `SEED_ADMIN_PASSWORD` |
| Caissier | caissier@arenah.mg | `SEED_ADMIN_PASSWORD` |

### Admins par module

Un admin par module, chacun ne voit que le sien, tous avec `SEED_ADMIN_PASSWORD`.

| Email | Voit quoi |
|-------|-----------|
| superadmin@arenah.mg | Tout — dashboard global, toutes commandes, tous paiements, tous produits, toutes réservations, tous clients |
| admin.boutique@arenah.mg | Commandes boutique, Paiements, Produits boutique, Clients |
| admin.restaurant@arenah.mg | Commandes restaurant, Paiements, Produits restaurant, Clients |
| admin.hotel@arenah.mg | Réservations hôtel, Paiements, Clients |
| admin.gym@arenah.mg | Réservations gym + coach, Paiements, Clients |
| admin.salon@arenah.mg | Réservations salon, Paiements, Clients |
| admin.field@arenah.mg | Réservations terrains, Paiements, Clients |
| admin.pool@arenah.mg | Réservations piscine + cours, Paiements, Clients |
| admin.event@arenah.mg | Réservations événements, Paiements, Clients |
| admin.spectacles@arenah.mg | Réservations spectacles, Paiements, Clients |
| admin.cybercafe@arenah.mg | Réservations cybercafé, Paiements, Clients |
| admin.kids@arenah.mg | Réservations Espace Kids, Paiements, Clients |

## Commandes utiles

```bash
npm run db:status   # État de la base : nombre de tables et de lignes par module
```

```bash
npm run db:seed     # Recharger les données de démo (idempotent, ne duplique rien)
```

```bash
npm run build       # Build de production
```

```bash
npm run test        # Lancer les tests
```

### Remise à zéro

`db:reset` supprime **toutes** les données (commandes, paiements, réservations,
comptes) puis rejoue schéma et seed. Le drapeau de confirmation est obligatoire :

```bash
npm run db:reset -- --confirm
```

## Paramètres plateforme

Depuis `/super-admin/platform-settings`, un super admin pilote :

- **Mode maintenance** — bloque commandes et réservations pour tout le monde
  sauf les super admins ; la consultation reste ouverte.
- **Inscriptions** — ouvre ou ferme la création de comptes client.
- **Modules ouverts** — les 11 modules activables individuellement.
- **Canaux de notification** — email, push, SMS.

## Services externes

Les clés suivantes sont vides dans `.env` — les fonctionnalités correspondantes
sont donc inactives tant qu'elles ne sont pas renseignées :

| Fonction | Variables |
|----------|-----------|
| Paiement MVola | `MVOLA_CONSUMER_KEY`, `MVOLA_CONSUMER_SECRET`, `MVOLA_MERCHANT_NUMBER` |
| Paiement Orange Money | `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_MERCHANT_KEY` |
| Paiement Airtel Money | `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET` |
| Emails | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| SMS | `INFOBIP_API_KEY`, `INFOBIP_BASE_URL` |
| Push navigateur | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY` |

## Avant la mise en production

- Remplacer `JWT_SECRET` dans `.env.local` — la valeur actuelle est un
  placeholder de développement.
- Renseigner `CLIENT_ORIGIN` avec le domaine réel (contrôle CORS).
- Changer les mots de passe de démo des comptes admin.
