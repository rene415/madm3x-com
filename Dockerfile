# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Serve stage ──────────────────────────────────────────────
FROM caddy:2.8-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
