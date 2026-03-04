# ── Stage 1: Install dependencies (with native build tools) ──────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files (including lock file for faster installs)
COPY package*.json ./

# Copy Prisma config and schema so postinstall (prisma generate) succeeds
COPY prisma.config.mjs ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Use npm ci if lock file exists, otherwise npm install
# Mount npm cache to speed up subsequent builds
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma files first (changes less frequently)
COPY prisma.config.mjs ./
COPY prisma ./prisma

# Copy application code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Set a dummy DATABASE_URL for build time only (actual URL set at runtime)
ENV DATABASE_URL="file:./prisma/dev.db"

# Generate Prisma client before building (cache mount for faster regeneration)
RUN --mount=type=cache,target=/root/.npm \
    npx prisma generate

# Build Next.js (cache mount for Next.js build cache)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Chromium for Puppeteer (LHDN scraper) — reuses same Alpine, no re-download
RUN apk add --no-cache chromium

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Tell Puppeteer to skip its own Chromium download and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
# Prisma config and schema (migrations use them)
COPY --from=builder /app/prisma.config.mjs ./
COPY --from=builder /app/prisma ./prisma
# Entrypoint: runs migrations then starts server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000

CMD ["./docker-entrypoint.sh"]
