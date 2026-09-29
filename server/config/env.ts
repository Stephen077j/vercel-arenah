/**
 * ARENAH – Configuration d'environnement centralisée
 *
 * Règle : aucun secret n'a de valeur par défaut. Si une variable obligatoire
 * manque, le processus s'arrête avec un message explicite plutôt que de
 * démarrer silencieusement avec un secret de développement.
 *
 * Les intégrations externes (paiement, e-mail, SMS, push) restent facultatives :
 * elles s'annoncent comme non configurées et le code appelant se dégrade
 * proprement, au lieu d'empêcher le serveur de démarrer.
 */

// Charge .env.local en développement (les variables déjà définies par
// l'hébergeur restent prioritaires). Absent en production : ignoré.
try { process.loadEnvFile('.env.local'); } catch { /* fichier absent */ }

class MissingEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `\n❌ Variables d'environnement obligatoires manquantes :\n` +
      missing.map(m => `   - ${m}`).join('\n') +
      `\n\n   Renseignez-les dans .env.local (développement) ou dans les variables\n` +
      `   d'environnement de votre hébergeur (production).\n` +
      `   Voir .env.example pour la liste complète.\n`
    );
    this.name = 'MissingEnvError';
  }
}

const missing: string[] = [];

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) { missing.push(name); return ''; }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

function optionalInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/* ─── Base de données ──────────────────────────────────────────────────────
 * Deux modes :
 *   - DATABASE_URL (fourni par Neon, Render, Railway, Supabase…) → prioritaire
 *   - variables séparées DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
 * Le mot de passe n'a aucune valeur par défaut dans les deux cas.
 */
const DATABASE_URL = optional('DATABASE_URL');

export const db = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      // Les PostgreSQL managés imposent TLS ; leurs certificats ne sont pas
      // toujours dans le magasin système, d'où rejectUnauthorized: false.
      // Désactivable par DB_SSL=false pour une base cloud sans TLS.
      ssl: optional('DB_SSL', 'true') === 'false'
        ? undefined
        : { rejectUnauthorized: false },
    }
  : {
      host:     optional('DB_HOST', 'localhost'),
      port:     optionalInt('DB_PORT', 5432),
      database: optional('DB_NAME', 'arenah'),
      user:     optional('DB_USER', 'postgres'),
      password: required('DB_PASSWORD'),
      ssl: optional('DB_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
    };

/** Décrit la cible de connexion sans jamais exposer le mot de passe. */
export function describeDb(): string {
  if (DATABASE_URL) {
    try {
      const u = new URL(DATABASE_URL);
      return `${u.hostname}:${u.port || 5432}${u.pathname} (DATABASE_URL)`;
    } catch {
      return '(DATABASE_URL illisible)';
    }
  }
  const d = db as { host: string; port: number; database: string };
  return `${d.host}:${d.port}/${d.database}`;
}

/* ─── Authentification ─────────────────────────────────────────────────── */
export const JWT_SECRET = required('JWT_SECRET');
export const JWT_EXPIRES_IN = optional('JWT_EXPIRES_IN', '7d');

/* ─── Serveur & CORS ───────────────────────────────────────────────────── */
export const PORT = optionalInt('PORT', 3001);

/**
 * Origines autorisées à appeler l'API, séparées par des virgules.
 * En production, la valeur doit contenir le domaine réel du frontend
 * (ex. https://mon-app.vercel.app) — aucune URL n'est devinée ici.
 */
export const CLIENT_ORIGINS = optional(
  'CLIENT_ORIGIN',
  IS_PRODUCTION ? '' : 'http://localhost:8080,http://localhost:8081,http://localhost:5173'
).split(',').map(s => s.trim()).filter(Boolean);

if (IS_PRODUCTION && CLIENT_ORIGINS.length === 0) missing.push('CLIENT_ORIGIN');

/** URL publique du frontend, utilisée dans les e-mails et les liens de paiement. */
export const FRONTEND_URL = optional('FRONTEND_URL', CLIENT_ORIGINS[0] ?? '');
/** URL publique de cette API, utilisée pour les callbacks des opérateurs. */
export const API_BASE_URL = optional('API_BASE_URL', '');

/* ─── Tâches planifiées ────────────────────────────────────────────────────
 * Les hébergements serverless ne gardent pas de processus vivant : node-cron
 * n'y déclenche jamais rien. ENABLE_CRON=false désactive l'ordonnanceur interne,
 * et CRON_TRIGGER_SECRET permet à un ordonnanceur externe d'appeler les tâches
 * via HTTP. Voir server/routes/cron.ts.
 */
export const ENABLE_CRON = optional('ENABLE_CRON', 'true') !== 'false';
export const CRON_TRIGGER_SECRET = optional('CRON_TRIGGER_SECRET');

/** Conservation des questions posées au chatbot (données personnelles), en jours. */
export const AI_LOG_RETENTION_DAYS = Math.max(1, optionalInt('AI_LOG_RETENTION_DAYS', 90));

/* ─── Stockage des fichiers envoyés ────────────────────────────────────── */
export const STORAGE_DRIVER = optional('STORAGE_DRIVER', 'local');
export const STORAGE_PUBLIC_URL = optional('STORAGE_PUBLIC_URL', '');

/* ─── Intégrations facultatives ────────────────────────────────────────────
 * Absentes → la fonctionnalité s'annonce non configurée, sans bloquer le boot.
 */
export const integrations = {
  smtp: {
    host:     optional('SMTP_HOST'),
    port:     optionalInt('SMTP_PORT', 465),
    secure:   optional('SMTP_SECURE', 'true') !== 'false',
    user:     optional('SMTP_USER'),
    pass:     optional('SMTP_PASS'),
    from:     optional('EMAIL_FROM'),
    get configured() { return !!(this.host && this.user && this.pass); },
  },
  sms: {
    baseUrl: optional('INFOBIP_BASE_URL'),
    apiKey:  optional('INFOBIP_API_KEY'),
    sender:  optional('SMS_SENDER', 'ARENAH'),
    get configured() { return !!(this.baseUrl && this.apiKey); },
  },
  push: {
    publicKey:  optional('VAPID_PUBLIC_KEY'),
    privateKey: optional('VAPID_PRIVATE_KEY'),
    subject:    optional('VAPID_SUBJECT'),
    get configured() { return !!(this.publicKey && this.privateKey); },
  },
  mvola: {
    get configured() {
      return !!(optional('MVOLA_CONSUMER_KEY') && optional('MVOLA_CONSUMER_SECRET'));
    },
  },
  orange: {
    get configured() {
      return !!(optional('ORANGE_CLIENT_ID') && optional('ORANGE_CLIENT_SECRET'));
    },
  },
  airtel: {
    get configured() {
      return !!(optional('AIRTEL_CLIENT_ID') && optional('AIRTEL_CLIENT_SECRET'));
    },
  },
};

/* ─── Validation finale ────────────────────────────────────────────────── */

if (missing.length) throw new MissingEnvError(missing);

// Un secret JWT trop court ou laissé à une valeur de démonstration annule
// la protection des sessions : on refuse de démarrer en production.
const WEAK_SECRETS = ['arenah_dev_secret_change_in_prod', 'arenah_dev_secret_change_before_production', 'secret', 'changeme'];
if (IS_PRODUCTION) {
  if (JWT_SECRET.length < 32) {
    throw new Error('❌ JWT_SECRET doit faire au moins 32 caractères en production.');
  }
  if (WEAK_SECRETS.includes(JWT_SECRET)) {
    throw new Error('❌ JWT_SECRET est une valeur de développement connue. Générez-en un nouveau.');
  }
} else if (JWT_SECRET.length < 32 || WEAK_SECRETS.includes(JWT_SECRET)) {
  console.warn('⚠️  JWT_SECRET faible — acceptable en développement, refusé en production.');
}

/** Récapitulatif des intégrations, affiché au démarrage. */
export function integrationsSummary(): string {
  const state = (ok: boolean) => (ok ? '✅' : '—');
  return [
    `${state(integrations.smtp.configured)} e-mail`,
    `${state(integrations.sms.configured)} SMS`,
    `${state(integrations.push.configured)} push`,
    `${state(integrations.mvola.configured)} MVola`,
    `${state(integrations.orange.configured)} Orange`,
    `${state(integrations.airtel.configured)} Airtel`,
  ].join('   ');
}
