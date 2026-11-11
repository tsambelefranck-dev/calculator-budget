# NexaFi — image de production (Next.js standalone)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nexafi && adduser -S nexafi -G nexafi
COPY --from=build --chown=nexafi:nexafi /app/.next/standalone ./
COPY --from=build --chown=nexafi:nexafi /app/.next/static ./.next/static
COPY --from=build --chown=nexafi:nexafi /app/public ./public
# Migrations exécutées au démarrage (scripts + schéma + drizzle)
COPY --from=build --chown=nexafi:nexafi /app/drizzle ./drizzle
USER nexafi
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
