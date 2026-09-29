#!/bin/sh
# Démarrage du conteneur API :
#   1. crée / met à jour les tables (idempotent)
#   2. SEULEMENT si SEED_DEMO_DATA=true (développement) : charge les comptes,
#      le catalogue et les avis de démonstration, tant qu'un seed complet n'a
#      pas réussi. En production, rien de fictif n'est chargé.
#   3. lance le serveur
set -e

echo "🔧 Initialisation du schéma…"
node --import tsx/esm server/db/init.ts

if [ "$SEED_DEMO_DATA" = "true" ]; then
  if node scripts/docker-db-empty.mjs; then
    echo "🌱 Chargement des données de démo…"
    node --import tsx/esm server/db/seed.ts
    node --import tsx/esm server/db/seed-ai.ts
    node scripts/docker-db-empty.mjs --done
  else
    echo "✅ Données de démo déjà présentes."
  fi
else
  echo "ℹ️  SEED_DEMO_DATA différent de true : aucune donnée de démonstration chargée."
fi

echo "🚀 Démarrage de l'API sur le port ${PORT:-3001}"
exec node --import tsx/esm server/index.ts
