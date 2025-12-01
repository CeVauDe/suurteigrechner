# Multi-stage build for a minimal, secure production image

# ---------- BUILD STAGE ----------
FROM node:18-alpine AS builder

# Create app dir
WORKDIR /app

# Install build deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---------- RUN TIME STAGE ----------
FROM node:18-alpine AS runner

# Set working dir and copy built files and prod dependencies into the image
WORKDIR /home/node/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose runtime port
EXPOSE 3000

# Health-check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

# Use the non-root node user for runtime
USER node

CMD ["node", "dist/index.js"]
