# Streetwise Connection

Streetwise Connection is an early-stage global mobile-data platform concept focused on affordable eSIM-based internet access without requiring a separate hotspot device.

## MVP goal

Build the software layer needed to sell and manage data plans on eSIM-capable phones, tablets, and other compatible devices through licensed carrier/eSIM-provider partners.

> This repository does **not** create a cellular network by itself. Real service requires contracts/API access with an MVNO, carrier, eSIM aggregator, or other licensed connectivity provider.

## Current MVP — 0.3

- Responsive storefront
- $10/month target retail plan
- PostgreSQL customer and subscription schema
- Customer registration/login/logout
- Scrypt password hashing and expiring sessions
- Mock payment mode for safe testing
- Stripe Checkout subscription adapter
- Signed Stripe webhook processing and event deduplication
- Active-subscription gate before live eSIM purchase
- Provider-aware coverage-check API
- Mock eSIM provider for safe development
- eSIM Go v2.5 provider adapter
- Wholesale catalogue lookup
- Order validation and transaction workflow
- eSIM installation-detail endpoint
- Separate live-payment and live-eSIM safety switches
- Docker builder and production targets
- GitHub Actions integration smoke tests

## Run locally

Requires Node.js 20+ and Docker for the local PostgreSQL service.

```bash
docker compose up -d postgres
npm install
npm run db:migrate
npm start
```

Open `http://localhost:3000`.

The default eSIM and payment providers are `mock`, so local development does not charge a card or purchase carrier service.

## Core configuration

```env
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgres://streetwise:streetwise_dev@localhost:5432/streetwise
DATABASE_SSL=false

PAYMENT_PROVIDER=mock
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
STRIPE_LIVE_MODE_ENABLED=false

ESIM_PROVIDER=mock
ESIM_API_BASE_URL=
ESIM_API_KEY=
ESIM_LIVE_ORDERS_ENABLED=false
```

Never commit real API keys or database credentials.

See:

- [`docs/ACCOUNTS_AND_PAYMENTS.md`](docs/ACCOUNTS_AND_PAYMENTS.md)
- [`docs/ESIM_PROVISIONING.md`](docs/ESIM_PROVISIONING.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Customer and payment API

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/account

GET  /api/payments/status
POST /api/payments/checkout
GET  /api/payments/subscription
POST /api/payments/webhook
```

Authenticated endpoints use a bearer session token.

## Connectivity API

```http
GET  /health
GET  /api/plans
GET  /api/provider/status
GET  /api/provider/catalogue?country=US
POST /api/coverage/check
POST /api/esims/order
GET  /api/esims/orders/{streetwiseOrderId}
GET  /api/esims/orders/{streetwiseOrderId}?refresh=true
GET  /api/esims/orders/{streetwiseOrderId}/install
```

## Safety model

Stripe test keys can be used with `PAYMENT_PROVIDER=stripe`. An `sk_live_` key is rejected unless:

```env
STRIPE_LIVE_MODE_ENABLED=true
```

Live eSIM transactions remain blocked unless:

```env
ESIM_LIVE_ORDERS_ENABLED=true
```

When live eSIM ordering is enabled, the order route also requires an authenticated account with an active or trialing subscription.

## Current production limitations

The Streetwise eSIM order store is still in memory, so application restarts clear those order records. Before a public launch, move eSIM orders and usage records into PostgreSQL, add provider webhooks and idempotency keys, implement cancellation/refund workflows, harden browser auth with secure HttpOnly cookies, add rate limiting and audit logs, and complete telecom/tax/privacy/consumer-disclosure review.

## Next milestones

1. Open/configure the wholesale eSIM provider account and test API credentials.
2. Create a Stripe test account/product/price and verify the webhook flow end to end.
3. Move eSIM orders and installed profiles into PostgreSQL.
4. Map wholesale bundle costs to Streetwise retail pricing and margins.
5. Add idempotency protection against duplicate telecom purchases.
6. Add provider webhooks for order, profile, and usage state changes.
7. Add usage tracking and top-ups.
8. Add subscription cancellation, refunds, failed-payment handling, and customer support tools.
9. Deploy PostgreSQL and the application to a managed production environment with secrets, backups, monitoring, and logging.
10. Complete launch-market telecom, tax, privacy, and consumer-disclosure review.
