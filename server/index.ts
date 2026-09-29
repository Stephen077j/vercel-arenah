import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { testConnection } from './db/database.js';
import { describeDb } from './config/env.js';
import { warnIfEphemeral } from './services/storage.js';
import { getSettings } from './services/settings.js';
import { readToken, requireSuperAdmin } from './middleware/auth.js';

import authRoutes         from './routes/auth.js';
import productsRoutes     from './routes/products.js';
import cartRoutes         from './routes/cart.js';
import ordersRoutes       from './routes/orders.js';
import notifRoutes        from './routes/notifications.js';
import adminRoutes        from './routes/admin.js';
import hotelRoutes        from './routes/bookings/hotel.js';
import gymRoutes          from './routes/bookings/gym.js';
import salonRoutes        from './routes/bookings/salon.js';
import fieldRoutes        from './routes/bookings/field.js';
import eventRoutes        from './routes/bookings/event.js';
import poolRoutes         from './routes/bookings/pool.js';
import cybercafeRoutes    from './routes/bookings/cybercafe.js';
import showRoutes         from './routes/bookings/show.js';
import restaurantRoutes   from './routes/bookings/restaurant.js';
import kidsRoutes         from './routes/bookings/kids.js';
import homeRoutes          from './routes/home.js';
import aiRoutes            from './routes/ai.js';
import { initLearning }     from './ai/learning.js';
import { initSemantic }     from './ai/semantic.js';
import { semanticExamples } from './ai/chatbot.js';
import paymentsRoutes     from './routes/payments.js';
import loyaltyRoutes      from './routes/loyalty.js';
import promosRoutes       from './routes/promos.js';
import reviewsRoutes      from './routes/reviews.js';
import pushRoutes         from './routes/push.js';
import posRoutes          from './routes/pos.js';
import webhooksRoutes     from './routes/webhooks.js';
import apiKeysRoutes      from './routes/apiKeys.js';
import swaggerUi          from 'swagger-ui-express';
import { swaggerSpec }    from './swagger.js';
import analyticsRoutes    from './routes/analytics.js';
import saAnalyticsRoutes  from './routes/sa-analytics.js';
import otpRoutes          from './routes/otp.js';
import newsletterRoutes   from './routes/newsletter.js';
import uploadRoutes       from './routes/upload.js';
import proprietaireRoutes from './routes/proprietaire.js';
import adminConfigRoutes  from './routes/admin/config.js';
import adminCatalogRoutes from './routes/admin/catalog.js';
import tableBookingRoutes from './routes/bookings/tableBooking.js';
import showSeatsRoutes    from './routes/bookings/showSeats.js';
import cron               from 'node-cron';
import cronRoutes         from './routes/cron.js';
import { JOBS }           from './jobs/index.js';
import {
  PORT, IS_PRODUCTION, CLIENT_ORIGINS, ENABLE_CRON, integrationsSummary,
} from './config/env.js';

const isDev = !IS_PRODUCTION;

const app = express();

// Derrière un proxy (Nginx du docker-compose, Render…), l'IP du visiteur est
// dans X-Forwarded-For : sans ce réglage, la limite de débit verrait tous les
// visiteurs comme une seule adresse. TRUST_PROXY = nombre de proxys devant l'API.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Sécurité HTTP
app.use(helmet());
// Origines autorisées : CLIENT_ORIGIN (liste séparée par des virgules).
// En production, c'est le domaine réel du frontend — Vercel ou autre.
app.use(cors({
  origin: (origin, cb) => {
    // Pas d'origine = appel serveur à serveur (curl, ordonnanceur cron, webhook opérateur)
    if (!origin || CLIENT_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error(`CORS bloqué: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Rate limiting global
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// Rate limiting strict sur l'auth (brute-force protection)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Trop de tentatives, réessayez dans 15 minutes' } });
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// Tester la connexion PostgreSQL au démarrage
testConnection()
  .then(() => initLearning()) // recharge ce que l'IA a appris des corrections des admins
  // Réseau de neurones chargé en arrière-plan : le chatbot répond (Naive Bayes) pendant ce temps
  .then(() => { void initSemantic(semanticExamples); })
  .catch(err => { console.error('❌ PostgreSQL:', err.message); process.exit(1); });

// ── Mode maintenance ────────────────────────────────────────────────────
// Réglable depuis /super-admin/platform-settings. Quand il est actif, l'API
// reste lisible mais toute écriture est refusée, sauf pour les super admins
// (qui doivent pouvoir désactiver le mode) et l'authentification (qui doit
// rester ouverte pour qu'ils puissent se connecter).
const MAINTENANCE_EXEMPT = ['/api/auth/login', '/api/auth/me', '/api/health'];

app.use('/api/', async (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  if (MAINTENANCE_EXEMPT.includes(req.path)) { next(); return; }

  try {
    const { maintenance_mode } = await getSettings();
    if (!maintenance_mode) { next(); return; }

    // Super admin : on le laisse passer pour qu'il garde la main sur la plateforme
    if (readToken(req)?.role === 'super_admin') { next(); return; }

    res.status(503).json({ error: 'Plateforme en maintenance, réessayez dans quelques instants' });
  } catch {
    next(); // en cas d'erreur de lecture des réglages, on ne bloque pas le trafic
  }
});

// Routes
app.use('/api/auth',                authRoutes);
app.use('/api/products',            productsRoutes);
app.use('/api/cart',                cartRoutes);
app.use('/api/orders',              ordersRoutes);
app.use('/api/notifications',       notifRoutes);
app.use('/api/admin/config',        adminConfigRoutes);
app.use('/api/admin/catalog',       adminCatalogRoutes);
app.use('/api/admin',               adminRoutes);
app.use('/api/bookings/hotel',      hotelRoutes);
app.use('/api/bookings/gym',        gymRoutes);
app.use('/api/bookings/salon',      salonRoutes);
app.use('/api/bookings/field',      fieldRoutes);
app.use('/api/bookings/event',      eventRoutes);
app.use('/api/bookings/pool',       poolRoutes);
app.use('/api/bookings/cybercafe',    cybercafeRoutes);
app.use('/api/bookings/show',         showRoutes);
app.use('/api/bookings/restaurant',   restaurantRoutes);
app.use('/api/bookings/kids',         kidsRoutes);
app.use('/api/home',                  homeRoutes);
app.use('/api/ai',                    aiRoutes);
app.use('/api/payments',            paymentsRoutes);
app.use('/api/loyalty',             loyaltyRoutes);
app.use('/api/promos',              promosRoutes);
app.use('/api/reviews',             reviewsRoutes);
app.use('/api/push',                pushRoutes);
app.use('/api/pos',                 posRoutes);
app.use('/api/webhooks',            webhooksRoutes);
app.use('/api/api-keys',            apiKeysRoutes);
app.use('/api/analytics',           analyticsRoutes);
app.use('/api/sa/analytics',        requireSuperAdmin, saAnalyticsRoutes);
app.use('/api/otp',                 otpRoutes);
app.use('/api/newsletter',          newsletterRoutes);
app.use('/api/upload',              uploadRoutes);
app.use('/api/proprietaire',        proprietaireRoutes);
app.use('/api/bookings/tables',     tableBookingRoutes);
app.use('/api/bookings/shows',      showSeatsRoutes);
app.use('/api/cron',                cronRoutes);

// ── Tâches planifiées ───────────────────────────────────────────────────
// Le corps des tâches vit dans server/jobs/index.ts. Ici on ne fait que les
// enregistrer auprès de node-cron, ce qui suppose un processus qui reste vivant.
// Sur un hébergement serverless ou mis en veille, poser ENABLE_CRON=false et
// laisser un ordonnanceur externe appeler POST /api/cron/:job.
if (ENABLE_CRON) {
  for (const [name, job] of Object.entries(JOBS)) {
    cron.schedule(job.schedule, async () => {
      const r = await job.run();
      console.log(`[CRON] ${r.job} — ${r.ok ? 'OK' : 'ÉCHEC'} — ${r.detail} (${r.durationMs} ms)`);
    });
    console.log(`   ⏰ ${name} planifié : ${job.schedule}`);
  }
} else {
  console.log('   ⏰ Ordonnanceur interne désactivé (ENABLE_CRON=false) — déclenchement HTTP attendu');
}

// Fichiers uploadés (avatars, etc.)
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname2 = dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname2, '..', 'public', 'uploads')));

// ── Swagger UI ──────────────────────────────────────────────────────────
const swaggerUiOpts = { customSiteTitle: 'ARENAH API Docs', customCss: '.swagger-ui .topbar { background: #07070f } .swagger-ui .topbar .download-url-wrapper { display:none }' };
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOpts));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', ts: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Erreur serveur', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ARENAH API démarrée sur le port ${PORT}`);
  console.log(`   Base         : ${describeDb()}`);
  console.log(`   Mode         : ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log(`   Origines CORS: ${CLIENT_ORIGINS.join(', ') || '(aucune)'}`);
  console.log(`   Intégrations : ${integrationsSummary()}\n`);
  warnIfEphemeral(IS_PRODUCTION);
});

export default app;
