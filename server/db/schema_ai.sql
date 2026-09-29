-- ============================================================================
-- ARENAH IA — Apprentissage continu
--
-- ai_chat_logs          : chaque question posée au chatbot (ce qu'il a compris,
--                         avec quelle confiance, avis du client 👍/👎).
--                         Anonyme (pas de lien avec le compte), e-mails et
--                         numéros masqués, purgée après AI_LOG_RETENTION_DAYS.
-- ai_training_examples  : exemples ajoutés par les admins en corrigeant l'IA ;
--                         ajoutés aux données de base à chaque réentraînement
-- ai_model_versions     : historique des réentraînements et de la précision
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message          TEXT NOT NULL,
  predicted_intent TEXT,
  confidence       REAL NOT NULL DEFAULT 0,
  understood       BOOLEAN NOT NULL DEFAULT false,
  feedback         TEXT CHECK (feedback IN ('up', 'down')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'learned', 'ignored', 'ok')),
  corrected_intent TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ
);

-- Minimisation des données : on n'associe PAS la question au compte client.
-- (colonne présente dans une première version, retirée)
ALTER TABLE ai_chat_logs DROP COLUMN IF EXISTS user_id;

-- Modèle qui a compris la question : memory | naive_bayes | neural | context
ALTER TABLE ai_chat_logs ADD COLUMN IF NOT EXISTS engine TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created ON ai_chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_status  ON ai_chat_logs(status);

CREATE TABLE IF NOT EXISTS ai_training_examples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model       TEXT NOT NULL CHECK (model IN ('chatbot', 'sentiment')),
  text        TEXT NOT NULL,
  label       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'admin', -- 'chat_log' | 'review' | 'admin'
  review_id   UUID REFERENCES reviews(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model, text)
);

CREATE TABLE IF NOT EXISTS ai_model_versions (
  id          SERIAL PRIMARY KEY,
  model       TEXT NOT NULL,
  examples    INTEGER NOT NULL,
  learned     INTEGER NOT NULL,       -- dont exemples appris des admins
  accuracy    REAL,                   -- validation croisée
  test_accuracy REAL,                 -- jeu de test fixe (chatbot)
  reason      TEXT,
  trained_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_versions_model ON ai_model_versions(model, trained_at);
