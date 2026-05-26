# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Install production deps fresh (ensures native modules like sharp
# are compiled for the correct architecture in the runtime layer)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist

# Data directory — will be overridden by a mounted volume in production
RUN mkdir -p /app/data/galleries

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
