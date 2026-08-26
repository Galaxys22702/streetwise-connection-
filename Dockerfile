# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY db ./db
COPY scripts ./scripts
COPY test ./test
RUN node --check src/server.js \
 && node --check src/services/authService.js \
 && node --check src/services/paymentService.js \
 && node --check src/services/esimService.js \
 && node --check src/services/esimWebhookService.js \
 && node --check src/providers/stripePaymentProvider.js \
 && node --check src/providers/esimGoWebhook.js \
 && npm test

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "scripts/start.js"]
