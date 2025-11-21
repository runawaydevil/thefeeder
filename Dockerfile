# ============================================
# Base stage - shared by both web and worker
# ============================================
FROM node:20-alpine AS base
WORKDIR /app

# ============================================
# Web App Dependencies
# ============================================
FROM base AS deps-web
# Copy package files
COPY apps/web/package*.json ./
# Use npm ci if package-lock.json exists, otherwise npm install
RUN test -f package-lock.json && npm ci || npm install

# ============================================
# Worker Dependencies
# ============================================
FROM base AS deps-worker
WORKDIR /worker
# Copy package files
COPY apps/worker/package*.json ./
# Use npm ci if package-lock.json exists, otherwise npm install
RUN test -f package-lock.json && npm ci || npm install

# ============================================
# Web App Build
# ============================================
FROM base AS build-web
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

# Copy node_modules from deps
COPY --from=deps-web /app/node_modules ./node_modules

# Copy package-lock.json from deps (generated if it didn't exist)
COPY --from=deps-web /app/package-lock.json* ./package-lock.json

# Copy web app files
COPY apps/web/package.json ./package.json
COPY apps/web/next.config.mjs ./next.config.mjs
COPY apps/web/tsconfig.json ./tsconfig.json
COPY apps/web/postcss.config.mjs ./postcss.config.mjs
COPY apps/web/tailwind.config.ts ./tailwind.config.ts
COPY apps/web/middleware.ts ./middleware.ts
COPY apps/web/next-env.d.ts ./next-env.d.ts
COPY apps/web/prisma ./prisma
COPY apps/web/src ./src
COPY apps/web/app ./app
COPY apps/web/public ./public

# Generate Prisma Client and build
RUN npx prisma generate
RUN npm run build

# ============================================
# Worker Build
# ============================================
FROM base AS build-worker
WORKDIR /worker

# Install OpenSSL for Prisma and Chromium dependencies for Puppeteer
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy node_modules from deps
COPY --from=deps-worker /worker/node_modules ./node_modules

# Copy package-lock.json from deps (generated if it didn't exist)
COPY --from=deps-worker /worker/package-lock.json* ./package-lock.json

# Copy worker files
COPY apps/worker/package.json ./package.json
COPY apps/worker/src ./src
COPY apps/worker/tsconfig.json ./tsconfig.json

# Copy prisma schema from web app
COPY apps/web/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# ============================================
# Web App Production Image
# ============================================
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime, postgresql-client for pg_isready, and wget for healthcheck
RUN apk add --no-cache openssl postgresql-client wget

# Copy package files
COPY --from=build-web /app/package.json ./package.json
COPY --from=build-web /app/package-lock.json* ./package-lock.json

# Copy node_modules from build-web (includes generated Prisma Client)
COPY --from=build-web /app/node_modules ./node_modules

# Remove dev dependencies but keep Prisma Client
# Install tsx as production dependency (needed for seed) BEFORE prune
# This ensures tsx is available and accessible via npx
RUN npm install --save-prod --no-audit tsx && \
    npm prune --production --omit=dev --no-audit && \
    npm cache clean --force

# Copy build artifacts and runtime files
COPY --from=build-web /app/.next ./.next
COPY --from=build-web /app/public ./public
COPY --from=build-web /app/next.config.mjs ./next.config.mjs
COPY --from=build-web /app/prisma ./prisma
COPY --from=build-web /app/src ./src
COPY --from=build-web /app/middleware.ts ./middleware.ts

# Copy entrypoint script and fix line endings (CRLF to LF for Windows compatibility)
COPY docker-entrypoint-web.sh /docker-entrypoint-web.sh
RUN sed -i.bak 's/\r$//' /docker-entrypoint-web.sh && \
    rm -f /docker-entrypoint-web.sh.bak && \
    chmod +x /docker-entrypoint-web.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint-web.sh"]

# ============================================
# Worker Production Image
# ============================================
FROM node:20-alpine AS worker
WORKDIR /worker
ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime, postgresql-client for pg_isready, and Chromium for Puppeteer
RUN apk add --no-cache \
    openssl \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY --from=build-worker /worker/package.json ./package.json
COPY --from=build-worker /worker/package-lock.json* ./package-lock.json

# Copy node_modules from build-worker (includes generated Prisma Client)
COPY --from=build-worker /worker/node_modules ./node_modules

# Remove dev dependencies but keep Prisma Client
RUN npm prune --production && npm cache clean --force

# Copy runtime files
COPY --from=build-worker /worker/prisma ./prisma
COPY --from=build-worker /worker/src ./src

# Copy entrypoint script and fix line endings (CRLF to LF for Windows compatibility)
COPY docker-entrypoint-worker.sh /docker-entrypoint-worker.sh
RUN sed -i.bak 's/\r$//' /docker-entrypoint-worker.sh && \
    rm -f /docker-entrypoint-worker.sh.bak && \
    chmod +x /docker-entrypoint-worker.sh

EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint-worker.sh"]
