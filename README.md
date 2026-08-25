# Streetwise Connection

Streetwise Connection is an early-stage global mobile-data platform concept focused on affordable eSIM-based internet access without requiring a separate hotspot device.

## MVP goal

Build the software layer needed to sell and manage data plans on eSIM-capable phones, tablets, and other compatible devices through licensed carrier/eSIM-provider partners.

> This repository does **not** create a cellular network by itself. Real service requires contracts/API access with an MVNO, carrier, eSIM aggregator, or other licensed connectivity provider.

## Current MVP

- Responsive web landing page
- Prototype retail plan catalog
- Provider-aware coverage-check API
- Mock eSIM provider for safe development
- eSIM Go v2.5 provider adapter
- Wholesale catalogue lookup
- Order validation and transaction workflow
- Streetwise order IDs and provider order references
- eSIM installation-detail endpoint
- Live-purchase safety switch
- Docker builder and production targets
- GitHub Actions build and provisioning smoke tests
- Architecture and provisioning documentation

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:3000`.

The default provider is `mock`, so local development does not purchase or activate carrier service.

## Provider configuration

Copy `.env.example` into your deployment environment and configure secrets there. Never commit API keys.

```env
ESIM_PROVIDER=mock
ESIM_API_BASE_URL=
ESIM_API_KEY=
ESIM_LIVE_ORDERS_ENABLED=false
```

Supported provider values:

- `mock`
- `esim-go`

When using `esim-go`, real transactions remain disabled unless `ESIM_LIVE_ORDERS_ENABLED=true` is explicitly set. With the flag disabled, order requests are validation-only.

See [`docs/ESIM_PROVISIONING.md`](docs/ESIM_PROVISIONING.md) for the complete workflow.

## API

### Health and provider state

```http
GET /health
GET /api/provider/status
```

### Plans

```http
GET /api/plans
```

### Wholesale provider catalogue

```http
GET /api/provider/catalogue?country=US
```

### Coverage check

```http
POST /api/coverage/check
Content-Type: application/json

{
  "country": "US",
  "device": "iPhone 15"
}
```

### Validate or provision an eSIM

```http
POST /api/esims/order
Content-Type: application/json

{
  "bundleName": "PROVIDER_BUNDLE_NAME",
  "quantity": 1,
  "country": "US",
  "device": "iPhone 15",
  "customerEmail": "customer@example.com",
  "validateOnly": true
}
```

### Read order state

```http
GET /api/esims/orders/{streetwiseOrderId}
GET /api/esims/orders/{streetwiseOrderId}?refresh=true
```

### Installation details

```http
GET /api/esims/orders/{streetwiseOrderId}/install
```

## Current production limitations

The order store is currently in-memory. Restarting the service clears Streetwise order records. Production requires durable storage, authentication, payment authorization, idempotency, provider webhooks, and usage accounting before real customers should be provisioned.

## Next milestones

1. Open and configure the wholesale provider account.
2. Add PostgreSQL for customers, orders, eSIMs, and usage records.
3. Map wholesale bundle SKUs to Streetwise retail plans and margins.
4. Add customer authentication.
5. Add payment authorization before telecom purchase.
6. Add idempotency protection against duplicate orders.
7. Add provider webhooks for order, profile, and usage state changes.
8. Add usage tracking and top-ups.
9. Add support/refund workflows.
10. Complete launch-market telecom, tax, privacy, and consumer-disclosure review.
