# ============================================================
# Multi-stage Dockerfile — NestJS Backend Template
# ============================================================

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copy manifests only (maximizes layer cache)
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install ALL deps (including devDeps needed to build)
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .

# Generate Prisma client, then compile TypeScript
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate
RUN npm run build

# ── Stage 3: Production ────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Only copy production artifacts — NO .env, NO source, NO devDeps
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/templates ./templates

# Install ts-node (needed by prisma.config.ts at runtime) and remove npm cache
RUN npm install -g ts-node typescript --ignore-scripts && npm cache clean --force

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Run Prisma migrations then start the app
# Pass secrets via docker-compose env_file or environment variables — never bake .env into the image
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]