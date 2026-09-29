# ARENAH — Guide de déploiement

> **Option la plus simple : un serveur VPS avec Docker.** Voir la section
> [Déploiement Docker sur VPS](#déploiement-docker-sur-vps) en fin de document.
> Le fonctionnement de l'IA est décrit dans [docs/IA.md](docs/IA.md).

Ce document décrit ce que la base de code attend de son hébergement.
**Aucun service n'a encore été créé.**

---

## Architecture cible

```
Navigateur
    │
    ├─── Frontend statique (Vite/React)      →  hébergeur de sites statiques
    │        appelle VITE_API_URL
    │
    └─── API Express (Node)                  →  hébergeur Node persistant
             │
             ├── PostgreSQL managé            →  DATABASE_URL
             ├── Stockage objet (uploads)     →  STORAGE_DRIVER
             └── Ordonnanceur externe (cron)  →  POST /api/cron/:job
```

Le backend **ne sert pas** le frontend : ce sont deux déploiements distincts.

---

## Frontend

| | |
|---|---|
| Framework | Vite 5 + React 18 + TypeScript |
| Commande de build | `npm run build` |
| Dossier de sortie | `dist` |
| Commande d'installation | `npm install` |
| Node | `>=20.11 <25` |

### Variables nécessaires

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | URL publique de l'API |
| `VITE_VAPID_PUBLIC_KEY` | Clé publique push (facultatif) |

> **Les variables `VITE_*` sont figées dans le bundle au moment du build.**
> Les modifier après coup n'a aucun effet tant qu'on ne relance pas le build.
> Elles sont visibles par n'importe quel visiteur : n'y mettez jamais de secret.

### Réécriture SPA

L'application utilise `react-router` en mode history. L'hébergeur doit
renvoyer `index.html` pour toute route inconnue, sinon un rechargement sur
`/super-admin/dashboard` renverra un 404.

---

## Backend

| | |
|---|---|
| Runtime | Node `>=20.11 <25` |
| Commande d'installation | `npm install` |
| Commande de build | aucune — TypeScript est exécuté via `tsx` |
| Commande de démarrage | `npm start` |
| Port | lu depuis `PORT` |
| Health check | `GET /api/health` |

`tsx` est en `dependencies` (et non `devDependencies`) précisément parce que
`npm start` le charge à l'exécution : un hébergeur qui élague les dépendances
de développement doit quand même le trouver.

### Variables obligatoires

Le serveur **refuse de démarrer** si l'une manque.

| Variable | Contrainte |
|---|---|
| `JWT_SECRET` | ≥ 32 caractères en production ; les valeurs de démo sont rejetées |
| `DATABASE_URL` *ou* `DB_PASSWORD` | l'un des deux modes de connexion |
| `CLIENT_ORIGIN` | obligatoire **en production uniquement** |

### Variables recommandées

| Variable | Défaut | Rôle |
|---|---|---|
| `NODE_ENV` | `development` | `production` active les contrôles stricts |
| `PORT` | `3001` | imposé par la plupart des hébergeurs |
| `FRONTEND_URL` | 1ʳᵉ valeur de `CLIENT_ORIGIN` | liens dans les e-mails |
| `API_BASE_URL` | vide | callbacks des opérateurs de paiement |
| `ENABLE_CRON` | `true` | voir la section Tâches planifiées |
| `STORAGE_DRIVER` | `local` | voir la section Stockage |

La liste complète est dans [`.env.example`](.env.example).

### Contraintes serverless

| Contrainte | Conséquence |
|---|---|
| Processus arrêté entre les requêtes | `node-cron` ne se déclenche jamais → poser `ENABLE_CRON=false` |
| Système de fichiers éphémère | les uploads disparaissent → configurer un stockage objet |
| Démarrages à froid | une connexion PostgreSQL par instance ; préférer un pooler |
| Durée d'exécution plafonnée | l'export Excel de `/api/analytics/export` peut dépasser la limite sur un gros volume |

Un hébergement Node **persistant** évite ces quatre contraintes.

---

## Base de données

PostgreSQL 13+ (`gen_random_uuid()` natif). L'extension `pgcrypto` est créée
par le schéma. Aucune construction réservée au superutilisateur : un rôle
propriétaire de base ordinaire suffit.

### Mise en place d'une base neuve

```bash
export DATABASE_URL="postgresql://user:pass@hote:5432/base?sslmode=require"
npm run db:init       # crée les tables (dont celles de l'IA)
npm run admin:create  # premier super administrateur (mot de passe fort exigé)
```

> ⚠️ En production, **ne lancez pas** `npm run db:seed:ai` : il crée de faux
> clients et de faux avis (il refuse d'ailleurs de tourner si
> `NODE_ENV=production`). `npm run db:seed` charge des comptes de démonstration :
> ne l'utilisez en production que si vous voulez le catalogue d'exemple, avec
> `SEED_ADMIN_PASSWORD` / `SEED_CLIENT_PASSWORD` forts.

Les deux commandes affichent leur cible avant d'agir, et sont idempotentes :
les rejouer ne duplique rien.

### Scripts disponibles

| Commande | Effet |
|---|---|
| `npm run db:init` | applique `schema.pg.sql` → `patch_v2.sql` → `schema_v3.sql` → `schema_ai.sql` |
| `npm run admin:create` | crée ou réinitialise un compte administrateur |
| `npm run db:seed` | données de démonstration (idempotent) |
| `npm run db:seed:ai` | faux clients et avis pour démontrer l'IA — **développement uniquement** |
| `npm run db:status` | nombre de tables et de lignes par module |
| `npm run db:reset -- --confirm` | **destructif** ; refusé si `NODE_ENV=production` |

### Variables

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | chaîne complète — prioritaire si présente ; TLS activé par défaut |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | mode variables séparées |
| `DB_SSL` | `false` pour désactiver TLS (base locale) |

> **Avant la première mise en production**, changez les mots de passe des
> comptes créés par le seed : ils sont documentés dans `DEMARRER.md`.

---

## Stockage des fichiers envoyés

Un seul type de fichier utilisateur aujourd'hui : **les avatars**, envoyés par
`POST /api/upload/avatar`, écrits sous `public/uploads/avatars/`, et dont l'URL
est enregistrée dans `users.avatar_url`.

Sur un hébergement à système de fichiers éphémère, ces fichiers disparaissent au
redéploiement alors que la base garde leur URL — d'où des images cassées.
Le serveur affiche un avertissement au démarrage dans ce cas.

`server/services/storage.ts` isole l'écriture derrière l'interface
`StorageDriver` (`save` / `delete` / `urlFor`). Le pilote `local` reproduit le
comportement historique. Pour brancher un stockage persistant : implémenter
l'interface, l'enregistrer dans `resolveDriver`, puis renseigner
`STORAGE_DRIVER` et `STORAGE_PUBLIC_URL`. **Aucune route n'a à changer.**

Fournisseurs disposant d'une offre gratuite, à départager selon vos contraintes :
Cloudinary, Supabase Storage, Backblaze B2, Cloudflare R2. Le choix reste ouvert.

---

## Tâches planifiées

| Tâche | Planification | Effet |
|---|---|---|
| `reminder-j1` | `0 8 * * *` | rappel e-mail + SMS aux clients dont le séjour commence le lendemain |
| `monthly-report` | `0 7 1 * *` | rapport du mois écoulé envoyé à `SUPERADMIN_EMAIL` |

Le corps des tâches vit dans `server/jobs/`, indépendamment de leur déclencheur.

### Sur un serveur persistant

`ENABLE_CRON=true` (défaut) : `node-cron` s'en charge, comportement historique.

### Sur un hébergement serverless

`node-cron` ne se déclencherait jamais. Poser :

```
ENABLE_CRON=false
CRON_TRIGGER_SECRET=<secret généré>
```

puis faire appeler par un ordonnanceur externe :

```
POST /api/cron/reminder-j1      en-tête : x-cron-secret: <secret>
POST /api/cron/monthly-report
```

`GET /api/cron` liste les tâches et leur planification de référence.
Sans `CRON_TRIGGER_SECRET`, ces routes répondent 503 : aucun endpoint
d'exécution n'est jamais exposé sans protection.

Ordonnanceurs possibles : Vercel Cron, GitHub Actions `schedule`, cron-job.org,
Upstash QStash. Le choix reste ouvert.

---

## Sécurité — à faire avant la mise en ligne

- [ ] Générer un `JWT_SECRET` unique :
      `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- [ ] Changer les mots de passe des comptes de démonstration
- [ ] Renseigner `CLIENT_ORIGIN` avec le domaine réel du frontend
- [ ] Vérifier qu'aucun `.env` n'est versionné : `git check-ignore .env`
- [ ] Choisir un stockage persistant pour les avatars
- [ ] Décider du sort des vulnérabilités npm (voir le rapport de phase 2)


---

## Déploiement Docker sur VPS

Tout tourne sur un seul serveur Linux : base PostgreSQL, API, site, et Caddy
qui gère le HTTPS (certificat Let's Encrypt automatique).

### Prérequis

- Un VPS Linux (2 Go de RAM minimum) avec Docker et Docker Compose
- Les ports 80 et 443 ouverts
- Un nom de domaine dont l'enregistrement DNS **A** pointe vers l'IP du serveur

### Première installation

```bash
git clone <dépôt> arenah && cd arenah
cp .env.production.example .env.production
nano .env.production        # DOMAIN, ACME_EMAIL, DB_PASSWORD, JWT_SECRET (+ intégrations)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Créer le premier super administrateur (le script pose les questions)
docker compose -f docker-compose.prod.yml --env-file .env.production exec api node --import tsx/esm server/db/create-admin.ts
```

Aucune donnée fictive n'est chargée en production : ni comptes de démo, ni
faux avis. La base et l'API ne sont pas exposées sur Internet, seul Caddy
(ports 80/443) l'est.

### Mise à jour

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Le schéma est mis à jour automatiquement au démarrage de l'API (idempotent).

### Sauvegarde de la base (à planifier chaque nuit)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U arenah arenah | gzip > arenah-$(date +%F).sql.gz
```

Copier ces fichiers **hors du serveur** (autre machine, stockage objet) :
une sauvegarde sur le même disque ne protège pas d'une panne du serveur.

### Restauration

```bash
gunzip -c arenah-AAAA-MM-JJ.sql.gz | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U arenah arenah
```

### Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
```
