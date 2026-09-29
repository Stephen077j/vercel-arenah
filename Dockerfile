# ============================================================================
# ARENAH — Image Docker (deux cibles)
#
#   docker build --target api -t arenah-api .   → serveur API Node (port 3001)
#   docker build --target web -t arenah-web .   → site React servi par Nginx (port 80)
#
# Normalement on ne lance pas ces commandes à la main : docker compose s'en charge.
# ============================================================================

# ─── Dépendances (partagées par les deux cibles) ────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Outils de compilation : filet de sécurité si un module natif
# (better-sqlite3, utilisé par la version Electron) n'a pas de binaire précompilé.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── Cible "api" : serveur Express ──────────────────────────────────────────
FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
# Réseau de neurones du chatbot intégré à l'image (~130 Mo) : en production,
# le serveur n'a jamais besoin de le télécharger. Couche mise en cache tant que
# les dépendances ne changent pas.
ENV AI_MODEL_DIR=/app/.cache/models
COPY scripts/download-model.mjs ./scripts/download-model.mjs
# Si le modèle est déjà sur la machine qui construit (npm run ai:model), on le
# reprend : pas de téléchargement. Sinon, téléchargement avec plusieurs essais.
RUN --mount=type=bind,target=/ctx \
    if [ -d /ctx/.cache/models ]; then mkdir -p "$AI_MODEL_DIR" && cp -r /ctx/.cache/models/. "$AI_MODEL_DIR"/; fi \
    && node scripts/download-model.mjs
COPY package.json tsconfig*.json ./
COPY server ./server
COPY scripts ./scripts
COPY public ./public
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
# Les fins de ligne Windows (CRLF) cassent les scripts shell sous Linux
RUN sed -i 's/\r$//' /usr/local/bin/api-entrypoint.sh && chmod +x /usr/local/bin/api-entrypoint.sh \
    && mkdir -p public/uploads
EXPOSE 3001
ENTRYPOINT ["api-entrypoint.sh"]

# ─── Construction du frontend ───────────────────────────────────────────────
FROM deps AS web-build
WORKDIR /app
# Les variables VITE_* sont figées dans le bundle au moment du build
# Vide = le site appelle l'API sur son propre domaine (/api relayé par Nginx)
ARG VITE_API_URL=""
ARG VITE_USE_SUPABASE=false
ENV VITE_API_URL=$VITE_API_URL VITE_USE_SUPABASE=$VITE_USE_SUPABASE
COPY . .
RUN npx vite build

# ─── Cible "web" : Nginx sert le site et relaie /api vers le serveur ────────
FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/dist /usr/share/nginx/html
EXPOSE 80
