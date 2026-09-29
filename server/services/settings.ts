/**
 * ARENAH – Paramètres plateforme
 *
 * platform_settings est une table clé/valeur (key TEXT, value TEXT). Les valeurs
 * sont encodées en JSON pour que booléens, nombres et listes fassent l'aller-retour
 * sans perte. Les valeurs historiques écrites en texte brut ('true', '10') restent
 * lisibles : JSON.parse les décode correctement.
 */
import { query, execute } from '../db/database.js';

export const ALL_MODULES = [
  'boutique', 'restaurant', 'hotel', 'gym', 'salon', 'field',
  'pool', 'event', 'spectacles', 'cybercafe', 'kids',
] as const;

export interface PlatformSettings {
  /** Coupe l'accès en écriture à l'API pour tous sauf les super admins. */
  maintenance_mode: boolean;
  /** Autorise la création de nouveaux comptes client. */
  registration_enabled: boolean;
  /** Plafond de réservations actives par client. Non appliqué pour l'instant. */
  max_bookings_per_user: number;
  /** Modules ouverts au public. */
  active_modules: string[];
  /** Canaux de notification autorisés. */
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  maintenance_mode:            false,
  registration_enabled:        true,
  max_bookings_per_user:       10,
  active_modules:              [...ALL_MODULES],
  email_notifications_enabled: true,
  push_notifications_enabled:  true,
  sms_notifications_enabled:   false,
};

// Cache court : ces réglages sont lus à chaque requête par le middleware
// de maintenance, on évite un aller-retour SQL systématique.
let cache: { value: PlatformSettings; expires: number } | null = null;
const TTL_MS = 10_000;

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // valeur texte libre (ex. un domaine)
  }
}

export async function getSettings(): Promise<PlatformSettings> {
  if (cache && cache.expires > Date.now()) return cache.value;

  const rows = await query<{ key: string; value: string }>(
    'SELECT key, value FROM platform_settings'
  );

  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = decode(r.value);

  // On repart des défauts pour qu'une clé absente ne casse rien, et on ne garde
  // la valeur stockée que si son type correspond à celui attendu.
  const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    const v = stored[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(fallback)) {
      if (Array.isArray(v)) merged[key] = v;
    } else if (typeof v === typeof fallback) {
      merged[key] = v;
    }
  }

  const value = merged as unknown as PlatformSettings;
  cache = { value, expires: Date.now() + TTL_MS };
  return value;
}

export async function updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue; // on ignore les clés inconnues
    await execute(
      `INSERT INTO platform_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
  }
  cache = null;
  return getSettings();
}

/** À appeler après toute écriture directe en base sur platform_settings. */
export function invalidateSettingsCache(): void {
  cache = null;
}
