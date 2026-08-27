# Streetwise Connection

Streetwise Connection is an early-stage connectivity storefront and control plane for affordable eSIM-based mobile data. The product is designed to work through licensed carriers, MVNO platforms, or eSIM aggregators. It does **not** create a cellular network by itself.

## Current launch state

**Public mode:** waitlist only  
**Commercial sales:** disabled  
**Live Stripe billing:** disabled  
**Live eSIM ordering:** disabled  
**Production waitlist backend:** Supabase  
**Application database for future customer accounts/orders:** PostgreSQL

The production deployment is intentionally constrained so that public visitors can join the waitlist, while registration, sign-in, checkout, coverage ordering, and eSIM activation remain unavailable until provider, legal, regulatory, support, and production-readiness gates are complete.

See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for the current readiness snapshot and next concrete milestones.

## What exists today

### Public waitlist

- Dedicated Supabase-backed waitlist storage
- Supabase Edge Function for public submissions
- Server-side validation
- Durable rate limiting
- Consent notice/version tracking
- Production health/status endpoints
- Emergency waitlist shutdown switch

### Customer/account platform

- Customer registration, login, logout, and sessions
- Scrypt password hashing
- PostgreSQL schema for customers, subscriptions, eSIM orders, usage, and payments
- Customer dashboard APIs
- Mock payment provider for safe development
- Stripe Checkout subscription adapter
- Signed Stripe webhook handling and event deduplication

### Connectivity platform

- Provider abstraction layer
- Mock eSIM provider
- eSIM Go v2.5 provider adapter
- Wholesale catalogue lookup
- Coverage-check API
- Persistent order/provider references
- Installation details associated with customer orders
- Usage history and mock usage simulation
- Purchase idempotency protection
- Separate live-payment and live-eSIM safety switches

### Delivery and verification

- Docker support
- GitHub Actions validation flows
- Production smoke checks
- Launch-readiness guardrails
- Vercel deployment compatibility

## Repository map

```text
api/                  Vercel API entry points
src/                  Application/server code
db/migrations/        PostgreSQL schema migrations
scripts/              Verification, migration, and smoke-check scripts
public/               Public web assets
docs/                 Architecture and technical documentation
docs/business/        Formation, policy, and regulatory working documents
.github/workflows/    CI and provider/payment validation workflows
```

## Safety model

The repository is built around explicit launch gates. Keep these values disabled until the corresponding commercial and compliance work is complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

`ESIM_WEBHOOKS_ENABLED` may be enabled separately for controlled callback testing without enabling live eSIM purchases.

Never commit provider API keys, Stripe secrets, database passwords, Supabase service-role keys, or other credentials. See [`SECURITY.md`](SECURITY.md).

## Local development

Requires Node.js 24.x and Docker for the local PostgreSQL service.

```bash
docker compose up -d postgres
npm install
npm run db:migrate
npm start
```

Open `http://localhost:3000`.

The default payment and eSIM providers are mocks, so local development does not charge a card or purchase carrier service.

## Verification

Run the repository verification suite before merging changes:

```bash
npm run verify
```

This runs test coverage plus Vercel configuration and launch-readiness checks.

Run the deployed production smoke check with:

```bash
npm run check:production
```

Set `SMOKE_TEST_EMAIL` only when you intentionally want the smoke check to exercise a real production waitlist write. Validation and consent error handling can be tested without inserting a row.

## Core configuration

Copy `.env.example` and keep production secrets in your deployment platform, not in Git.

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
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

## Important API surfaces

### Public/system

```http
GET  /health
GET  /api/public-status
GET  /api/plans
```

### Customer and payments

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

### Connectivity

```http
GET  /api/provider/status
GET  /api/provider/catalogue?country=US
POST /api/coverage/check
POST /api/esims/order
POST /api/providers/esim-go/webhook
GET  /api/esims
GET  /api/esims/orders/{streetwiseOrderId}
GET  /api/esims/orders/{streetwiseOrderId}?refresh=true
GET  /api/esims/orders/{streetwiseOrderId}/install
POST /api/esims/orders/{streetwiseOrderId}/usage/simulate
```

Authenticated endpoints use a bearer session token. The mock usage-simulation route exists only for development/testing.

## Commercial reality

The target retail concept is approximately **$10/month**, but the final plan cannot be set until real wholesale pricing is known.

Contribution margin must account for:

```text
retail price
- wholesale connectivity cost
- payment fees
- telecom taxes/surcharges
- support and fraud reserve
- infrastructure
= contribution margin
```

Do not advertise unlimited service or enable billing until provider terms, coverage, economics, regulatory responsibilities, refund rules, and support obligations are verified.

## Current production limitations

The public waitlist is production-backed, but commercial service remains intentionally disabled. Before enabling paid service, the project still needs:

1. Verified wholesale provider credentials and real catalogue pricing
2. One controlled staging purchase/provision/install/usage test
3. Confirmed unit economics for the launch plan
4. Provider-of-record and telecom regulatory determination
5. Final privacy, terms, refund, and support policies
6. Secure HttpOnly browser sessions plus CSRF/rate-limit controls
7. Production monitoring, backups, audit logging, and incident procedures
8. Cancellation, failed-payment, refund, retry, and reconciliation workflows

## Documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ACCOUNTS_AND_PAYMENTS.md`](docs/ACCOUNTS_AND_PAYMENTS.md)
- [`docs/ESIM_PROVISIONING.md`](docs/ESIM_PROVISIONING.md)
- [`docs/PROVIDER_ONBOARDING.md`](docs/PROVIDER_ONBOARDING.md)
- [`docs/CUSTOMER_DASHBOARD.md`](docs/CUSTOMER_DASHBOARD.md)
- [`docs/business/README.md`](docs/business/README.md)

## Next concrete milestones

1. Complete the final production waitlist persistence smoke test.
2. Obtain provider credentials without committing secrets.
3. Pull and evaluate the real wholesale catalogue.
4. Calculate retail margin from actual provider costs.
5. Provision one controlled staging eSIM and validate retries/idempotency/usage.
6. Resolve telecom and provider-of-record obligations before sales.
7. Finalise customer policies and support procedures.
8. Enable Stripe/eSIM live modes only after every launch gate passes.
