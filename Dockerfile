FROM node:20-alpine AS builder
WORKDIR /app

# prisma schema + nuxt config を先にコピー
# (npm ci の postinstall で nuxt prepare && prisma generate が走るため)
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY nuxt.config.ts tsconfig.json ./
COPY app.vue ./

RUN npm ci

COPY . .
RUN npm run build

# --- Production image ---
FROM node:20-alpine AS runner
WORKDIR /app

# Prisma client + engine
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Migration files (for prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma
# Nuxt build output
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
