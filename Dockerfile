# Imagem única: a API (NestJS) serve também o frontend (Vite). Ver skill cicd-deploy-backend › dockerfile-e-compose.
# Os testes rodam no CI, não aqui.

# ── Stage 1: frontend ────────────────────────────────────────────
FROM node:22-alpine AS web
WORKDIR /app/web

# Dependências em camada separada: só baixa de novo quando o package*.json muda.
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund

# VITE_* vão para o JavaScript do navegador NO BUILD (públicos por design, nunca segredo).
# Mudar qualquer um exige rebuild da stack, não só restart.
ARG VITE_API_BASE_URL=/api
ARG VITE_AUTH_ENABLED=true
ARG VITE_AUTH_HOSTED_DOMAIN=sebratel.com.br
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_APP_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED \
    VITE_AUTH_HOSTED_DOMAIN=$VITE_AUTH_HOSTED_DOMAIN \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

COPY web/ ./
RUN npm run build

# ── Stage 2: build da API ────────────────────────────────────────
FROM node:22-alpine AS api-build
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --no-audit --no-fund
COPY api/ ./
RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache wget tzdata          # wget para o healthcheck, tzdata para TZ
ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

WORKDIR /app/api

# Só dependências de produção: compilador, ESLint e Vitest ficam de fora.
COPY api/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY api/apm.cjs ./
COPY --from=api-build /app/api/dist ./dist
COPY --from=web /app/web/dist /app/web/dist

# /app/data: cópia dos certificados do Firebase e snapshot do AD. Volume nomeado no compose.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3180

# `-r ./apm.cjs` inicia o agente Elastic APM antes de qualquer import (observabilidade-backend › elastic-apm.md).
CMD ["node", "-r", "./apm.cjs", "dist/main.js"]
