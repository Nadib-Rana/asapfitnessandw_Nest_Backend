# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g bun
RUN bun install
COPY . .
RUN bunx prisma generate
RUN bun run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/.env ./.env
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/src/main.js"]