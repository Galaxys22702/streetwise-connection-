# Streetwise Connection

Streetwise Connection is an early-stage connectivity storefront and control plane for affordable residential and small-business connectivity using approved wholesale eSIM/network providers. The product is designed to combine plan access with compatibility guidance, setup help and practical support. It does **not** create or own a cellular network by itself.

**Positioning:** Connection without the confusion.

## Current launch state

**Public mode:** waitlist only  
**Commercial sales:** disabled  
**Live Stripe billing:** disabled  
**Live eSIM ordering:** disabled  
**Production waitlist backend:** Supabase  
**Application database for future customer/accounts/orders/compliance:** PostgreSQL

The production deployment is intentionally constrained so public visitors can join the waitlist while registration, sign-in, checkout and eSIM activation remain unavailable until provider, legal, regulatory, support and production-readiness gates are complete.

See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for the current readiness snapshot and [`docs/OWNER_ACTIONS.md`](docs/OWNER_ACTIONS.md) for the work that genuinely requires the legal owner or an outside authority/provider.

## Product direction

Streetwise is being prepared for two customer groups:

- **Residential:** simple plan choice, compatibility guidance, setup assistance and clear service terms.
- **Commercial / small business:** multi-line planning, deployment guidance and support for small teams that may not have dedicated IT staff.

Planned target pricing:

- Streetwise Home — **$25/month** residential
- Business Starter — **$20/month per line**
- Business Volume — **$15/month per line for 3+ lines**
- Business Pro — **$30/month per line**

These are target prices, not approved sellable offers. They must pass provider mapping, taxes, support/refund exposure and contribution-margin validation before checkout can be enabled.

A planned **Streetwise Connection Check** will help customers assess device compatibility, intended usage, hotspot needs, customer type and line count before purchase. It is specified in [`docs/CONNECTION_CHECK.md`](docs/CONNECTION_CHECK.md).

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

- Customer registration, login, logout and sessions
- Scrypt password hashing
- PostgreSQL schema for customers, subscriptions, eSIM orders, usage and payments
- Residential/commercial customer structure
- Commercial organisations, members and service-line schema
- Customer dashboard APIs
- Mock payment provider for safe development
- Stripe Checkout subscription adapter
- Signed Stripe webhook handling and event deduplication

### Business/compliance platform

- Business formation and licensing packet
- EIN worksheet
- Operating agreement draft
- Privacy, terms and refund/support drafts
- Regulatory matrix
- Database records for licences, registrations and renewal dates
- Database records for provider commercial approvals and provider-of-record responsibilities
- Database records for launch-plan approval, provider mapping and economics
- Owner-only action checklist

### Connectivity platform

- Provider abstraction layer
- Mock eSIM provider
- eSIM Go v2.5 provider adapter
- Working eSIM Go authentication
- Real U.S. catalogue access demonstrated
- Read-only 1GLOBAL preparation
- Wholesale catalogue lookup and economics tooling
- Coverage-check API
- Persistent order/provider references
- Installation details associated with customer orders
- Usage history and mock usage simulation
- Purchase idempotency protection
- Provider commercial evidence gate
- Separate live-payment and live-eSIM safety switches

### Delivery and verification

- Docker support
- GitHub Actions validation flows
- Production smoke checks
- Launch-readiness guardrails
- Vercel deployment compatibility
- Serialized database migration runner with migration history

## Repository map

```text
api/                  Vercel API entry points
src/                  Application/server code
db/migrations/        PostgreSQL schema migrations
scripts/              Verification, migration, and smoke-check scripts
public/               Public web assets
docs/                 Architecture, product and technical documentation
docs/business/        Formation, policy, licensing and regulatory working documents
.github/workflows/    CI and provider/payment validation workflows
```

## Safety model

Keep these values disabled until the corresponding commercial and compliance work is complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

`ESIM_WEBHOOKS_ENABLED` may be enabled separately for controlled callback testing without enabling live eSIM purchases.

Never commit provider API keys, Stripe secrets, database passwords, Supabase service-role keys, SSNs/ITINs, identity documents, banking information or private licence paperwork. See [`SECURITY.md`](SECURITY.md).

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

Set `SMOKE_TEST_EMAIL` only when intentionally exercising a real production waitlist write.

## Core configuration

Copy `.env.example` and keep production secrets in the deployment platform, not in Git.

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

Streetwise should compete on **clarity + affordability + support**, not price alone.

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

Do not advertise unlimited data, unlimited hotspot, guaranteed speeds or guaranteed coverage unless those claims are supported by the selected provider contract and final approved launch plan.

## Current production limitations

The public waitlist is production-backed, but commercial service remains intentionally disabled. Before enabling paid service, the project still requires:

1. A selected wholesale provider with written recurring U.S. domestic-use and residential/commercial resale rights
2. Final mapping of real provider bundles to the $15/$20/$25/$30 target tiers
3. One controlled staging purchase/provision/install/usage/retry test
4. Confirmed contribution margin for each launch plan
5. Provider-of-record and telecom regulatory determination
6. Final privacy, terms, refund and support policies reconciled to the provider agreement
7. Production monitoring, backups, audit logging and incident procedures appropriate for commercial service
8. Final owner approval before enabling live billing or live eSIM orders

## Documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)
- [`docs/PRODUCT_POSITIONING.md`](docs/PRODUCT_POSITIONING.md)
- [`docs/CONNECTION_CHECK.md`](docs/CONNECTION_CHECK.md)
- [`docs/OWNER_ACTIONS.md`](docs/OWNER_ACTIONS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ACCOUNTS_AND_PAYMENTS.md`](docs/ACCOUNTS_AND_PAYMENTS.md)
- [`docs/ESIM_PROVISIONING.md`](docs/ESIM_PROVISIONING.md)
- [`docs/PROVIDER_ONBOARDING.md`](docs/PROVIDER_ONBOARDING.md)
- [`docs/PROVIDER_ECONOMICS.md`](docs/PROVIDER_ECONOMICS.md)
- [`docs/PROVIDER_COMPARISON.md`](docs/PROVIDER_COMPARISON.md)
- [`docs/business/LICENSE_APPLICATION_PACKET.md`](docs/business/LICENSE_APPLICATION_PACKET.md)
- [`docs/business/README.md`](docs/business/README.md)

## Next concrete milestones

1. Complete owner formation/licensing/EIN tasks using the prepared packet.
2. Obtain written provider commercial terms and compare eSIM Go against 1GLOBAL/other suitable providers.
3. Map real provider bundles to the residential and commercial pricing structure.
4. Run contribution-margin validation for each proposed launch tier.
5. Provision one controlled staging eSIM and validate retries/idempotency/usage.
6. Resolve provider-of-record, PUCN/FCC/USAC and tax responsibilities.
7. Finalise customer policies and support procedures against the selected provider agreement.
8. Enable Stripe/eSIM live modes only after every launch gate passes and the owner explicitly authorises commercial launch.
