import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'ARENAH API',
      version:     '1.0.0',
      description: `
**API publique ARENAH IVATO** — Parc de loisirs, Soavinarivo, Antananarivo 102.

Utilisée par :
- **Site Web** (React/Vite) — auth Bearer JWT
- **POS Desktop** (Electron) — auth Bearer JWT + X-Api-Key
- **Mobile APK** (React Native Android) — auth Bearer JWT
- **Intégrations tierces** (CRM, Compta) — X-Api-Key

### Authentification

**Option 1 — JWT (utilisateurs)**
\`\`\`
POST /api/auth/login → { token }
Header: Authorization: Bearer <token>
\`\`\`

**Option 2 — API Key (devices/tiers)**
\`\`\`
Header: X-Api-Key: ARN_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

### Webhook signature HMAC
Chaque payload est signé : \`X-Arenah-Signature: sha256=<hmac>\`
      `,
      contact: { name: 'ARENAH', email: 'contact@arenah.mg' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Développement local' },
      { url: 'https://api.arenah.mg', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Token obtenu via POST /api/auth/login',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in:   'header',
          name: 'X-Api-Key',
          description: 'Clé générée pour POS Desktop, Mobile APK ou intégration tierce',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        User: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            email:           { type: 'string', format: 'email' },
            fullname:        { type: 'string' },
            phone:           { type: 'string' },
            role:            { type: 'string', enum: ['client','admin_module','super_admin','caissier'] },
            module_assigned: { type: 'string', nullable: true },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            name:        { type: 'string' },
            category:    { type: 'string' },
            price:       { type: 'integer', description: 'Prix en Ariary' },
            stock:       { type: 'integer' },
            module:      { type: 'string' },
            image_url:   { type: 'string', nullable: true },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id:           { type: 'string', format: 'uuid' },
            reference:    { type: 'string' },
            amount:       { type: 'integer' },
            fee:          { type: 'integer' },
            method:       { type: 'string', enum: ['mvola','orange','airtel','especes','carte'] },
            status:       { type: 'string', enum: ['pending','pending_cash','success','failed'] },
            booking_type: { type: 'string' },
            created_at:   { type: 'string', format: 'date-time' },
          },
        },
        PosSaleRequest: {
          type: 'object',
          required: ['items','method','module'],
          properties: {
            items: {
              type:  'array',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'string', format: 'uuid' },
                  qty:        { type: 'integer', minimum: 1 },
                },
              },
            },
            customer_name:  { type: 'string', description: 'Optionnel — client de passage' },
            customer_phone: { type: 'string' },
            method:         { type: 'string', enum: ['especes','mvola','orange','airtel','carte'] },
            discount:       { type: 'integer', description: 'Remise manuelle en Ariary' },
            notes:          { type: 'string' },
            module:         { type: 'string', enum: ['boutique','restaurant'] },
          },
        },
        PosSaleReceipt: {
          type: 'object',
          properties: {
            reference:   { type: 'string' },
            order_id:    { type: 'string' },
            cashier:     { type: 'string' },
            items:       { type: 'array' },
            subtotal:    { type: 'integer' },
            discount:    { type: 'integer' },
            fee:         { type: 'integer' },
            total:       { type: 'integer' },
            method:      { type: 'string' },
            date:        { type: 'string', format: 'date-time' },
          },
        },
        LoyaltyStatus: {
          type: 'object',
          properties: {
            total:       { type: 'integer', description: 'Total points' },
            ar_per_point:{ type: 'integer', description: 'Valeur d\'1 point en Ar' },
            level:       {
              type: 'object',
              properties: {
                name:  { type: 'string', enum: ['Bronze','Or','Platine'] },
                color: { type: 'string' },
                min:   { type: 'integer' },
                next:  { type: 'integer', nullable: true },
              },
            },
            history: { type: 'array' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',     description: 'Authentification (JWT)' },
      { name: 'Products', description: 'Catalogue produits' },
      { name: 'Payments', description: 'Paiements (MVola, Orange, Airtel, Espèces)' },
      { name: 'POS',      description: '🖥️ Point de Vente — Desktop & Mobile APK' },
      { name: 'Loyalty',  description: 'Programme fidélité' },
      { name: 'Promos',   description: 'Codes promo' },
      { name: 'Reviews',  description: 'Avis et étoiles' },
      { name: 'Bookings', description: 'Réservations (hotel, gym, salon…)' },
      { name: 'Webhooks', description: 'Webhooks pour intégrations tierces' },
      { name: 'API Keys', description: 'Gestion des clés API' },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────
      '/api/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Connexion',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object', required: ['email','password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'client@arenah.mg' },
                  password: { type: 'string', example: 'votre-mot-de-passe' },
                },
              },
            }},
          },
          responses: {
            200: { description: 'Token JWT', content: { 'application/json': { schema: {
              type: 'object', properties: {
                token: { type: 'string' },
                user:  { $ref: '#/components/schemas/User' },
              },
            }}}},
            401: { description: 'Identifiants invalides' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Inscription client', security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['email','password','fullname'],
              properties: {
                email:    { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                fullname: { type: 'string' },
                phone:    { type: 'string' },
              },
            }}},
          },
          responses: { 201: { description: 'Compte créé + token' }, 409: { description: 'Email déjà utilisé' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'], summary: 'Profil de l\'utilisateur connecté',
          responses: { 200: { description: 'Utilisateur courant', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
        },
      },
      // ── PRODUCTS ──────────────────────────────────────────────────────
      '/api/products': {
        get: {
          tags: ['Products'], summary: 'Liste des produits actifs',
          parameters: [
            { in: 'query', name: 'module',   schema: { type: 'string' }, description: 'boutique | restaurant' },
            { in: 'query', name: 'category', schema: { type: 'string' } },
            { in: 'query', name: 'q',        schema: { type: 'string' }, description: 'Recherche texte' },
          ],
          responses: { 200: { description: 'Liste produits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } },
        },
      },
      // ── POS ───────────────────────────────────────────────────────────
      '/api/pos/products': {
        get: {
          tags: ['POS'], summary: 'Catalogue optimisé pour POS (lecture rapide)',
          description: 'Endpoint allégé pour l\'affichage POS. Supporte recherche texte.',
          parameters: [
            { in: 'query', name: 'module', schema: { type: 'string' } },
            { in: 'query', name: 'q',      schema: { type: 'string' }, description: 'Recherche par nom ou catégorie' },
          ],
          responses: { 200: { description: 'Produits pour POS' } },
        },
      },
      '/api/pos/sale': {
        post: {
          tags: ['POS'], summary: 'Vente rapide POS (sans compte client obligatoire)',
          description: `Crée une commande + paiement en une seule requête.
Pensé pour le caissier : client de passage, paiement immédiat.
Pour espèces : statut passe directement à \`success\`.
Pour mobile money : statut \`pending\`, caissier confirme manuellement.`,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PosSaleRequest' } } },
          },
          responses: {
            201: {
              description: 'Vente créée — données du reçu thermique incluses',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  receipt: { $ref: '#/components/schemas/PosSaleReceipt' },
                },
              }}},
            },
            400: { description: 'Données invalides ou stock insuffisant' },
          },
        },
      },
      '/api/pos/receipt/{orderId}': {
        get: {
          tags: ['POS'], summary: 'Données reçu thermique pour une commande POS',
          parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Données du reçu (items, paiement, entreprise)' } },
        },
      },
      '/api/pos/stats/today': {
        get: {
          tags: ['POS'], summary: 'Résumé des ventes du jour (clôture caisse)',
          responses: {
            200: { description: 'Total + nb ventes + détail par méthode de paiement', content: { 'application/json': { schema: {
              type: 'object', properties: {
                date:      { type: 'string' },
                total:     { type: 'integer' },
                count:     { type: 'integer' },
                by_method: { type: 'array' },
              },
            }}}},
          },
        },
      },
      // ── PAYMENTS ──────────────────────────────────────────────────────
      '/api/payments/initiate': {
        post: {
          tags: ['Payments'], summary: 'Initier un paiement',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['amount','method','booking_type','booking_id'],
              properties: {
                amount:          { type: 'integer', description: 'Montant en Ariary' },
                method:          { type: 'string', enum: ['mvola','orange','airtel','especes','carte'] },
                booking_type:    { type: 'string', description: 'order | hotel | gym | salon | field | pool | event | show | cybercafe' },
                booking_id:      { type: 'string', format: 'uuid' },
                customer_phone:  { type: 'string' },
                notes:           { type: 'string' },
              },
            }}},
          },
          responses: {
            201: { description: 'Paiement créé', content: { 'application/json': { schema: {
              type: 'object', properties: {
                id:           { type: 'string' },
                reference:    { type: 'string' },
                status:       { type: 'string' },
                fee:          { type: 'integer' },
                total:        { type: 'integer' },
                instructions: { type: 'object', nullable: true },
              },
            }}}},
          },
        },
      },
      '/api/payments/my': {
        get: {
          tags: ['Payments'], summary: 'Historique paiements du client connecté',
          responses: { 200: { description: 'Liste des paiements', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } },
        },
      },
      '/api/payments/{id}/receipt': {
        get: {
          tags: ['Payments'], summary: 'Données facture / reçu (client connecté)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Données complètes pour générer la facture PDF' } },
        },
      },
      // ── LOYALTY ───────────────────────────────────────────────────────
      '/api/loyalty/me': {
        get: {
          tags: ['Loyalty'], summary: 'Solde et historique de points fidélité',
          responses: { 200: { description: 'Statut fidélité', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoyaltyStatus' } } } } },
        },
      },
      // ── PROMOS ────────────────────────────────────────────────────────
      '/api/promos/validate': {
        post: {
          tags: ['Promos'], summary: 'Valider un code promo avant paiement',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['code','amount'],
              properties: {
                code:   { type: 'string', example: 'BIENVENUE20' },
                amount: { type: 'integer', description: 'Montant avant remise' },
                module: { type: 'string' },
              },
            }}},
          },
          responses: {
            200: { description: 'Code valide + montant de la remise', content: { 'application/json': { schema: {
              type: 'object', properties: {
                valid:        { type: 'boolean' },
                code:         { type: 'string' },
                discount:     { type: 'integer' },
                final_amount: { type: 'integer' },
                description:  { type: 'string' },
              },
            }}}},
            404: { description: 'Code invalide' },
            400: { description: 'Expiré / épuisé / montant insuffisant' },
          },
        },
      },
      // ── REVIEWS ───────────────────────────────────────────────────────
      '/api/reviews/module/{module}': {
        get: {
          tags: ['Reviews'], summary: 'Note moyenne et avis pour un module',
          security: [],
          parameters: [{ in: 'path', name: 'module', required: true, schema: { type: 'string' }, example: 'hotel' }],
          responses: { 200: { description: 'Note + liste des 20 derniers avis' } },
        },
      },
      '/api/reviews': {
        post: {
          tags: ['Reviews'], summary: 'Soumettre un avis',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['module','rating'],
              properties: {
                module:       { type: 'string' },
                booking_type: { type: 'string' },
                booking_id:   { type: 'string' },
                rating:       { type: 'integer', minimum: 1, maximum: 5 },
                comment:      { type: 'string' },
              },
            }}},
          },
          responses: { 201: { description: 'Avis publié' }, 409: { description: 'Déjà noté' } },
        },
      },
      // ── WEBHOOKS ──────────────────────────────────────────────────────
      '/api/webhooks': {
        get:  { tags: ['Webhooks'], summary: 'Liste des webhooks (admin)', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: {
          tags: ['Webhooks'], summary: 'S\'abonner à des événements',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['url','events'],
              properties: {
                url:    { type: 'string', format: 'uri', example: 'https://mon-crm.mg/webhook' },
                events: { type: 'array', items: { type: 'string', enum: ['payment.confirmed','payment.failed','order.created','order.status_changed','booking.created'] } },
              },
            }}},
          },
          responses: {
            201: { description: 'Webhook créé — secret HMAC inclus (à sauvegarder)', content: { 'application/json': { schema: {
              type: 'object', properties: { id: { type: 'string' }, secret: { type: 'string' }, warning: { type: 'string' } },
            }}}},
          },
        },
      },
      // ── API KEYS ──────────────────────────────────────────────────────
      '/api/api-keys': {
        get:  { tags: ['API Keys'], summary: 'Liste des clés API (admin)', responses: { 200: { description: 'Liste' } } },
        post: {
          tags: ['API Keys'], summary: 'Créer une clé API pour POS ou intégration tierce',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['name'],
              properties: {
                name:        { type: 'string', example: 'POS Caissier Principal' },
                device_type: { type: 'string', enum: ['pos_desktop','pos_mobile','mobile_app','external'], example: 'pos_desktop' },
                permissions: { type: 'array', items: { type: 'string', enum: ['read','write','pos'] }, example: ['read','write','pos'] },
              },
            }}},
          },
          responses: {
            201: { description: 'Clé créée — visible UNE SEULE FOIS', content: { 'application/json': { schema: {
              type: 'object', properties: {
                key:         { type: 'string', example: 'ARN_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
                prefix:      { type: 'string' },
                device_type: { type: 'string' },
                warning:     { type: 'string' },
              },
            }}}},
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
