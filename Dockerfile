# Serviço `backend` da stack: a API (NestJS). As telas ficam no `frontend` (Dockerfile.frontend).
# Ver skill cicd-deploy-backend › dockerfile-e-compose. Os testes rodam no CI, não aqui.

# ── Stage 1: build da API ────────────────────────────────────────
FROM node:22-alpine AS api-build
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --no-audit --no-fund
COPY api/ ./
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────
FROM node:22-alpine

# Versão visível no Portainer (vem do compose: ${APP_VERSION:-X.Y.Z}). Ver validacoes-ci › versão.
ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=$APP_VERSION

RUN apk add --no-cache wget tzdata          # wget para o healthcheck, tzdata para TZ
ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

WORKDIR /app/api

# Só dependências de produção: compilador, ESLint e Vitest ficam de fora.
COPY api/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY api/apm.cjs ./
COPY --from=api-build /app/api/dist ./dist

# /app/data: cópia dos certificados do Firebase e snapshot do AD. Volume nomeado no compose.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3180

# `-r ./apm.cjs` inicia o agente Elastic APM antes de qualquer import (observabilidade-backend › elastic-apm.md).
CMD ["node", "-r", "./apm.cjs", "dist/main.js"]
