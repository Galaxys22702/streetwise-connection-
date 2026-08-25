# Streetwise Connection

Streetwise Connection is an early-stage global mobile-data platform concept focused on affordable eSIM-based internet access without requiring a separate hotspot device.

## MVP goal

Build the software layer needed to sell and manage data plans on eSIM-capable phones, tablets, and other compatible devices through licensed carrier/eSIM-provider partners.

> This repository does **not** create a cellular network by itself. Real service requires contracts/API access with an MVNO, carrier, eSIM aggregator, or other licensed connectivity provider.

## Current MVP — 0.4

- Responsive storefront and customer dashboard
- $10/month target retail plan
- PostgreSQL customer, subscription, eSIM-order, and usage schema
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
- Persistent eSIM order records and provider references
- Installation details stored with the customer order
- Customer-level order access controls
- Data allowance/usage fields and usage-event history
- Mock usage simulation for dashboard testing
- Separate live-payment and live-eSIM safety switches
- Docker builder and production targets
- GitHub Actions full-flow smoke tests

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
- [`docs/CUSTOMER_DASHBOARD.md`](docs/CUSTOMER_DASHBOARD.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Customer and payment API

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/account
GET  /api/dashboard

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
GET  /api/esims
GET  /api/esims/orders/{streetwiseOrderId}
GET  /api/esims/orders/{streetwiseOrderId}?refresh=true
GET  /api/esims/orders/{streetwiseOrderId}/install
POST /api/esims/orders/{streetwiseOrderId}/usage/simulate
```

The usage simulation route works only with the mock eSIM provider and exists for development/testing.

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

The database now persists customer eSIM orders and usage snapshots. Before a public launch, add real provider usage synchronization/webhooks, purchase idempotency keys, cancellation/refund workflows, secure HttpOnly cookie sessions, rate limiting, audit logs, monitoring/backups, and launch-market telecom/tax/privacy/consumer-disclosure review.

## Next milestones

1. Open/configure the wholesale eSIM provider account and test API credentials.
2. Create a Stripe test product/price and verify the webhook flow end to end.
3. Map wholesale bundle costs to Streetwise retail pricing and margins.
4. Add provider webhooks and usage synchronization.
5. Add idempotency protection against duplicate telecom purchases.
6. Add data top-ups and low-data notifications.
7. Add subscription cancellation, refunds, failed-payment handling, and customer support tools.
8. Move browser authentication to secure HttpOnly cookies and add CSRF/rate-limit controls.
9. Deploy PostgreSQL and the application to a managed production environment with secrets, backups, monitoring, and logging.
10. Complete launch-market telecom, tax, privacy, and consumer-disclosure review.
