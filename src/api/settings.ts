import { api } from './client';

export const ALL_MODULES = [
  'boutique', 'restaurant', 'hotel', 'gym', 'salon', 'field',
  'pool', 'event', 'spectacles', 'cybercafe', 'kids',
] as const;

export type ModuleName = typeof ALL_MODULES[number];

export const MODULE_LABELS: Record<ModuleName, string> = {
  boutique:   'Boutique',
  restaurant: 'Restaurant',
  hotel:      'Hôtel',
  gym:        'Gym & Sport',
  salon:      'Salon',
  field:      'Terrains',
  pool:       'Piscine',
  event:      'Événements',
  spectacles: 'Spectacles',
  cybercafe:  'Cybercafé',
  kids:       'Espace Kids',
};

export interface PlatformSettings {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  max_bookings_per_user: number;
  active_modules: string[];
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
}

export const settingsApi = {
  get:    ()                             => api.get<PlatformSettings>('/api/admin/platform-settings'),
  update: (patch: Partial<PlatformSettings>) => api.patch<PlatformSettings>('/api/admin/platform-settings', patch),
};
