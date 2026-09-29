-- ============================================================================
-- ARENAH — Patch v4 : colonnes utilisées par le code mais absentes du schéma
--
-- Sans elles :
--   - la page Salle de sport (liste des abonnements) et la page Cybercafé
--     (plan des postes) renvoient une erreur 500 ;
--   - l'admin ne peut ni créer ni retirer un pass piscine, un créneau terrain,
--     une salle ou une option d'événement, ni créer un spectacle ;
--   - « supprimer » une offre ne la retire pas du site (pas de colonne active).
-- Certaines n'étaient ajoutées que par le script de démo (seed.ts), donc
-- jamais en production.
--
-- Idempotent : rejouable sans risque.
-- ============================================================================

-- Offres désactivables par l'admin (retirées du site sans casser l'historique)
ALTER TABLE gym_plans        ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pool_pass_types  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE field_slots      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE event_halls      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE event_options    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Descriptions (auparavant ajoutées seulement par le script de démo)
ALTER TABLE event_halls ADD COLUMN IF NOT EXISTS "desc" TEXT;
ALTER TABLE shows       ADD COLUMN IF NOT EXISTS description TEXT;

-- Postes du cybercafé : nom, type (pc / ps4 / billard) et tarif horaire
ALTER TABLE cybercafe_stations ADD COLUMN IF NOT EXISTS label        TEXT;
ALTER TABLE cybercafe_stations ADD COLUMN IF NOT EXISTS station_type TEXT NOT NULL DEFAULT 'pc';
-- 8 000 Ar/h = tarif "1 heure" de cybercafe_durations. À ajuster par l'admin.
ALTER TABLE cybercafe_stations ADD COLUMN IF NOT EXISTS hourly_rate  INTEGER NOT NULL DEFAULT 8000;
UPDATE cybercafe_stations SET label = 'Poste ' || number WHERE label IS NULL;

-- Offres gérées depuis l'admin (catalogue) : désactivables sans suppression
ALTER TABLE salon_services       ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE cybercafe_durations  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE cybercafe_services   ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
