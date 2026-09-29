# Liaison POS ↔ Serveur Web — Même Réseau Local

---

## ⚠️ Règle absolue — NE PAS CASSER L'ADMIN MODULE WEB

> **L'admin module sur le site reste 100% fonctionnel en permanence.**
> Il est le **fallback de survie** : si l'APK React Native bug, si le logiciel Electron plante,
> si le téléphone du staff tombe en panne — le staff ouvre simplement un navigateur
> et continue de travailler exactement comme avant sur `/admin`.

### Ce que ça implique concrètement

```
✅ Toutes les routes Express existantes → INTOUCHABLES
✅ Toutes les pages admin web existantes → INTOUCHABLES
✅ Le comportement actuel de l'admin module → INCHANGÉ

✅ Les nouveaux endpoints POS sync → ADDITIFS seulement
   (ils s'ajoutent à côté, ils ne remplacent rien)
```

### Les trois chemins coexistent en parallèle

```
Staff sur navigateur /admin    ─── routes existantes ──→ PostgreSQL
                                                              │
Staff sur Electron POS         ─── nouvelles routes ──→ PostgreSQL
                                                              │
Staff sur React Native POS     ─── nouvelles routes ──→ PostgreSQL
```

Même données, même résultat, trois chemins différents. **Aucun ne dépend des autres.**

### Si l'APK ou Electron bug un soir

```
1. Staff ouvre Chrome / Firefox sur n'importe quel appareil
2. Va sur http://[IP-serveur]:8080/admin  (ou le domaine du site)
3. Se connecte avec son compte admin_module
4. Travaille normalement — commandes, statuts, paiements
5. Rien n'a changé, rien ne manque
```

---

## Vue d'ensemble

Toutes les applications tournent sur le **même réseau WiFi/LAN** (réseau ARENAH).
Le serveur Express est la **source de vérité centrale**.
Les POS Electron et React Native se synchronisent avec lui via HTTP.

---

## Topologie réseau

```
┌─────────────────────────────────────────────────────────────┐
│                    RÉSEAU LOCAL ARENAH                      │
│                  (WiFi / switch LAN)                        │
│                                                             │
│   ┌──────────────────┐                                      │
│   │  SERVEUR EXPRESS │  ← IP fixe locale ex: 192.168.1.10  │
│   │  + PostgreSQL    │    Port : 3001                       │
│   │  (PC ou NAS)     │                                      │
│   └────────┬─────────┘                                      │
│            │ HTTP REST                                       │
│     ┌──────┴──────────────────────────┐                     │
│     │                                 │                     │
│  ┌──▼──────────────┐   ┌─────────────▼──────────┐          │
│  │ ELECTRON (PC    │   │ REACT NATIVE (téléphone │          │
│  │ caisse desktop) │   │ du staff restaurant)    │          │
│  │ + SQLite cache  │   │ + SQLite cache          │          │
│  └─────────────────┘   └─────────────────────────┘          │
│                                                             │
│   ┌─────────────────────────────────────────────┐          │
│   │  SITE WEB CLIENT (navigateur)               │          │
│   │  → passe par Express pour toute commande    │          │
│   └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Rôle de chaque composant

| Composant | Rôle | Base de données |
|---|---|---|
| **Express + PostgreSQL** | Source de vérité — toutes les commandes y naissent | PostgreSQL (maître) |
| **Site web client** | Prise de commande → écrit dans PostgreSQL via Express | — |
| **Electron POS** | Affiche commandes + marque statut → lit/écrit via Express | SQLite (cache offline) |
| **React Native POS** | Même rôle qu'Electron sur téléphone du staff | SQLite (cache offline) |

---

## Principe de synchronisation

### Règle fondamentale

```
PostgreSQL = vérité
SQLite     = copie locale temporaire (buffer si coupure réseau)
```

Les POS ne **créent jamais** une commande web depuis leur côté.
Ils **reçoivent** les commandes web et **envoient** des mises à jour de statut.

### Deux directions de sync

```
DIRECTION 1 — Serveur → POS  (nouvelles commandes)
  Express reçoit commande web
  → POS poll toutes les 5 secondes : "nouvelles commandes ?"
  → POS stocke dans SQLite local
  → POS affiche sur écran

DIRECTION 2 — POS → Serveur  (mise à jour statut)
  Staff tape "En cours" ou "Prêt"
  → POS envoie PATCH au serveur immédiatement
  → Serveur met à jour PostgreSQL
  → Serveur déclenche notification client (Push + SMS)
```

---

## Flux complet d'une commande

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CLIENT commande sur le site web                          │
│    POST /api/orders → PostgreSQL                            │
│    status = "pending"                                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│ 2. POS POLL toutes les 5s                                   │
│    GET /api/sync/orders?module=restaurant&since=TIMESTAMP   │
│    → reçoit les nouvelles commandes                         │
│    → les stocke dans SQLite local                           │
│    → les affiche à l'écran du staff                         │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│ 3. STAFF voit la commande sur Electron ou React Native      │
│    Appuie sur "Accepter"                                    │
│    PATCH /api/orders/:id/status  { status: "en_cours" }    │
│    → PostgreSQL mis à jour                                  │
│    → SQLite local mis à jour                                │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│ 4. STAFF appuie sur "Prêt" quand commande terminée          │
│    PATCH /api/orders/:id/status  { status: "pret" }        │
│    → PostgreSQL mis à jour                                  │
│    → Express déclenche :                                    │
│       • Push notification → téléphone du client            │
│       • SMS → numéro du client                              │
│       • Email → adresse du client                           │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│ 5. CLIENT reçoit sur son téléphone :                        │
│    "🍽️ Votre commande est prête !"                         │
│    + lien vers le reçu numérique                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Statuts d'une commande

```
pending  →  en_cours  →  pret  →  livre  →  (annule)
  │              │          │         │
  │              │          │         └── client récupère / livré
  │              │          └──────────── notification Push + SMS
  │              └─────────────────────── staff a commencé
  └────────────────────────────────────── commande reçue (web)
```

---

## Endpoints Express à créer / modifier

### 🔴 Endpoints existants — INTOUCHABLES

Ces routes ne seront **jamais modifiées**. L'admin web continue de les utiliser exactement comme avant.

```
POST   /api/orders              ← création commande client web      [NE PAS TOUCHER]
GET    /api/orders              ← liste commandes admin web         [NE PAS TOUCHER]
PATCH  /api/orders/:id          ← modification complète admin web   [NE PAS TOUCHER]
GET    /api/admin/*             ← toutes les routes admin           [NE PAS TOUCHER]
GET    /api/payments/*          ← paiements                        [NE PAS TOUCHER]
POST   /api/push                ← notifications existantes          [NE PAS TOUCHER]
```

L'admin module web utilise ces routes. Elles restent identiques.

---

### 🟢 Nouveaux endpoints — ADDITIFS seulement

Ces routes sont **créées en plus**, dans un fichier séparé `server/routes/pos-sync.ts`.
Elles n'interfèrent avec rien d'existant.

```
GET  /api/pos/orders
     ?module=restaurant
     &since=2025-01-01T10:00:00Z
     → retourne uniquement les commandes nouvelles depuis "since"
     → filtrées par module du staff connecté
     → utilisé exclusivement par Electron et RN (polling 5s)
     → l'admin web N'utilise PAS cette route

PATCH /api/pos/orders/:id/status
     body: { status: "en_cours" | "pret" | "livre" | "annule" }
     → met à jour PostgreSQL (même table orders)
     → déclenche Push + SMS au client si status = "pret"
     → NE remplace PAS PATCH /api/orders/:id
     → les deux coexistent pour leurs usages respectifs

GET  /api/pos/orders/:id/receipt
     → détails du reçu pour impression POS
     → format adapté à l'écran POS (différent de la vue admin web)

GET  /api/pos/ping
     → healthcheck : POS vérifie que le serveur est joignable
     → répond { ok: true, timestamp: "..." }
```

### Pourquoi le préfixe `/api/pos/` ?

```
/api/orders/*     → admin web (inchangé)
/api/pos/*        → POS Electron + React Native (nouveau)

Même données PostgreSQL en dessous.
Deux interfaces différentes au-dessus.
Zéro conflit.
```

---

## Comportement hors ligne (coupure WiFi temporaire)

### Scénario : le WiFi coupe 2 minutes

```
POS perd la connexion
  → poll échoue silencieusement
  → POS continue d'afficher les commandes déjà dans SQLite
  → Staff peut encore marquer des statuts
      → stockés dans une QUEUE LOCALE (table SQLite "sync_queue")
  
WiFi revient
  → POS détecte la reconnexion
  → Envoie la queue locale au serveur dans l'ordre chronologique
  → SQLite se resynchronise avec PostgreSQL
  → Affichage mis à jour
```

### Table SQLite "sync_queue" (dans Electron et RN)

```
id          UUID
action      "update_status" | "create_order"
payload     JSON  { order_id, status, timestamp }
created_at  DATETIME
sent        BOOLEAN (false tant que pas envoyé au serveur)
```

---

## Configuration réseau requise

### IP fixe pour le serveur Express

Le serveur Express doit avoir une **IP locale fixe** pour que les POS sachent où se connecter.

```
Options :
  A. IP fixe dans le routeur WiFi (réservation DHCP par adresse MAC)
     → ex: 192.168.1.10 toujours attribuée au PC serveur

  B. Hostname local (mDNS)
     → ex: arenah.local → résolu automatiquement sur le réseau
     → fonctionne sur Mac/Linux sans config
     → sur Windows nécessite Bonjour (iTunes l'installe)

Recommandé : option A (IP fixe) pour la simplicité
```

### Configuration dans les POS

```
Electron et React Native ont besoin d'un fichier de config :

  API_BASE_URL = "http://192.168.1.10:3001"
  POLL_INTERVAL = 5000   (5 secondes)
  MODULE = "restaurant"  (ou hotel, salon, etc.)
  SYNC_TIMEOUT = 3000    (abandon de la requête après 3s)
```

---

## Sécurité sur le réseau local

Même en réseau local, les requêtes des POS vers Express doivent être authentifiées.

```
Approche recommandée :
  • Electron/RN se connectent avec les identifiants admin_module (email + mot de passe)
  • Express retourne un JWT valable 30 jours (renouvelé automatiquement)
  • Toutes les requêtes sync portent ce JWT dans le header Authorization
  • Le JWT encode le module assigné (restaurant, hotel, etc.)
    → le serveur filtre automatiquement les commandes du bon module
```

---

## Séquence de démarrage des POS

```
1. POS s'ouvre (Electron ou React Native)
2. Vérifie si un token JWT valide est stocké localement
3. Si non → écran de connexion (email + mot de passe staff)
4. Si oui → connexion silencieuse, démarre le polling
5. Teste la connexion à l'API : GET /api/ping
   → Si OK : mode EN LIGNE, polling actif
   → Si KO : mode HORS LIGNE, affiche SQLite local + badge "Hors ligne"
6. Affiche l'écran POS principal avec les commandes en cours
```

---

## Ce que ça ne couvre PAS (hors scope)

- Sync bidirectionnelle complexe (commandes créées offline sur POS puis remontées)
  → Pour l'instant : les commandes web viennent toujours du site
  → Les POS ne créent pas de commandes web à distance
  
- Multi-site (plusieurs restaurants sur plusieurs réseaux)
  → Nécessiterait Express en cloud (Supabase prod) et VPN entre sites

- Caisse offline totale (encaissements sans internet prolongés)
  → Possible avec la sync_queue mais à traiter séparément

---

## Résumé des modifications par projet

### Express API — fichiers CRÉÉS (rien de modifié)

```
server/routes/pos-sync.ts    ← nouveau fichier, routes /api/pos/*
server/index.ts              ← UNE SEULE LIGNE ajoutée :
                                app.use('/api/pos', posSyncRoutes)
```

- [ ] Créer `server/routes/pos-sync.ts` avec les 4 routes `/api/pos/...`
- [ ] Ajouter `app.use('/api/pos', posSyncRoutes)` dans `server/index.ts`
- [ ] **Aucun autre fichier serveur modifié**

### Electron POS — modifications dans le projet Electron (pas dans ce repo)
- [ ] Ajouter fichier `config.js` : `API_BASE_URL`, `POLL_INTERVAL`, `MODULE`
- [ ] Ajouter client HTTP axios vers `API_BASE_URL`
- [ ] Ajouter écran de connexion si pas de JWT stocké
- [ ] Ajouter service de polling `GET /api/pos/orders` toutes les 5s
- [ ] Ajouter détection réseau (online/offline via `navigator.onLine` ou `net` Electron)
- [ ] Ajouter table `sync_queue` dans SQLite locale
- [ ] Ajouter service de flush de la queue au retour en ligne
- [ ] Connecter boutons "En cours" / "Prêt" à `PATCH /api/pos/orders/:id/status`

### React Native POS — modifications dans le projet RN (pas dans ce repo)
- [ ] Même liste qu'Electron
- [ ] Utiliser `@react-native-community/netinfo` pour détection réseau
- [ ] JWT stocké dans `AsyncStorage` (sécurisé)

---

## Ordre d'implémentation recommandé

```
Semaine 1 — Fondation
  → Endpoint Express GET /api/sync/orders
  → Endpoint Express PATCH /api/orders/:id/status + notification
  → Test avec curl / Postman

Semaine 2 — Electron
  → Connexion HTTP dans Electron
  → Polling + affichage commandes
  → Boutons statut fonctionnels

Semaine 3 — React Native
  → Même logique que Electron
  → Test sur vrai téléphone sur le réseau

Semaine 4 — Robustesse
  → Gestion offline + sync_queue
  → Test coupure WiFi simulée
  → Notification Push/SMS au client

Semaine 5 — Reçu client
  → Page reçu dans le site web
  → Lien dans la notification
  → Test end-to-end complet
```
