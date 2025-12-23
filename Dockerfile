# Multi-stage Dockerfile for Next.js production build

# ---------- DEPENDENCIES ----------
FROM node:24-alpine3.23 AS deps
# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- BUILDER ----------
FROM node:24-alpine3.23 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry; disable it
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- RUNNER ----------
FROM node:24-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js build artifacts (standalone mode)
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Ensure /data directory exists with proper permissions for the mounted volume
# Run as root to set up the directory, then switch to node user
RUN mkdir -p /data && chmod 777 /data

EXPOSE 3000

ENV PORT=3000
ENV SQLITE_DB_PATH=/data/db.sqlite

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/hello || exit 1

CMD ["node", "server.js"]
