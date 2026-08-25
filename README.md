# Streetwise Connection

Streetwise Connection is an early-stage global mobile-data platform concept focused on affordable eSIM-based internet access without requiring a separate hotspot device.

## MVP goal

Build the software layer needed to sell and manage data plans on eSIM-capable phones, tablets, and other compatible devices through licensed carrier/eSIM-provider partners.

> This repository does **not** create a cellular network by itself. Real service requires contracts/API access with an MVNO, carrier, eSIM aggregator, or other licensed connectivity provider.

## Included in this starter

- Responsive web landing page
- Prototype plan catalog
- Coverage-check API
- Mock eSIM-provider adapter
- Real provisioning endpoint intentionally disabled until a provider is connected
- Architecture notes for moving to production

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:3000`.

## API

### Health

```http
GET /health
```

### Plans

```http
GET /api/plans
```

### Coverage prototype

```http
POST /api/coverage/check
Content-Type: application/json

{
  "country": "US",
  "device": "iPhone 13"
}
```

### eSIM order

```http
POST /api/esims/order
```

Currently returns `501` by design until a licensed wholesale provider is integrated.

## Next milestones

1. Choose an eSIM wholesale/API partner.
2. Connect a sandbox API.
3. Add PostgreSQL and user accounts.
4. Add payment processing and verified webhooks.
5. Build eSIM provisioning/order state machine.
6. Add usage tracking and top-ups.
7. Deploy a production environment with secrets, logging, monitoring, and rate limiting.
