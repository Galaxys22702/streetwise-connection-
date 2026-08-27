# eSIM Provisioning Target

Streetwise Connection now supports two eSIM provider modes:

- `mock` — local development only. No telecom service is purchased or activated.
- `esim-go` - eSIM Go API adapter. It remains validation-only unless the separate live-order safety switch is explicitly enabled.

## Safety model

Real transactions are disabled by default.

Even when `ESIM_PROVIDER=esim-go` and a valid API key is configured, Streetwise sends validation-only order requests unless:

```env
ESIM_LIVE_ORDERS_ENABLED=true
```

Do not enable that flag until a provider passes every commercial gate, a controlled test plan and maximum spend are separately approved, and pricing, checkout, refunds, support, security and regulatory responsibilities have been verified.

## Environment

```env
PORT=3000
ESIM_PROVIDER=mock
ESIM_API_BASE_URL=
ESIM_API_KEY=
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

For eSIM Go, the adapter defaults to:

```text
https://api.esim-go.com/v2.5
```

Never commit API keys to GitHub.

## API flow

### 1. Provider status

```http
GET /api/provider/status
```

This reports the selected provider and whether credentials are configured. It never returns the API key.

### 2. Browse wholesale catalogue

```http
GET /api/provider/catalogue?country=US
```

Use the returned provider bundle name when creating an order.

### 3. Coverage check

```http
POST /api/coverage/check
Content-Type: application/json

{
  "country": "US",
  "device": "iPhone 15"
}
```

This is a pre-flight check, not a carrier guarantee. The exact device must support eSIM and the selected bundle must cover the required destination.

### 4. Validate an order without purchasing

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

Streetwise stores an in-process order record and returns wholesale price/status information.

### 5. Request a transaction

```http
POST /api/esims/order
Content-Type: application/json

{
  "bundleName": "PROVIDER_BUNDLE_NAME",
  "quantity": 1,
  "country": "US",
  "device": "iPhone 15",
  "customerEmail": "customer@example.com",
  "validateOnly": false
}
```

With `ESIM_LIVE_ORDERS_ENABLED=false`, the eSIM Go adapter still converts this to validation-only mode. With the safety flag enabled, it can execute a provider transaction and auto-assign the purchased bundle to a new eSIM.

### 6. Read Streetwise order status

```http
GET /api/esims/orders/{streetwiseOrderId}
```

To ask the provider for a fresh order state when a provider reference exists:

```http
GET /api/esims/orders/{streetwiseOrderId}?refresh=true
```

### 7. Retrieve installation details

```http
GET /api/esims/orders/{streetwiseOrderId}/install
```

For a completed live eSIM Go order, the provider can return ICCID, SM-DP+ address, Matching ID, profile status, and direct install URLs when available.

## Important MVP limitation

When `DATABASE_URL` is configured, Streetwise persists orders, installation metadata, provider ICCIDs, usage snapshots, and idempotency keys in PostgreSQL. The in-memory `Map` is only a local-development fallback and must not be used for live connectivity.

## Provider callbacks and usage synchronization

eSIM Go V3 callbacks update the matching Streetwise order using its ICCID and append an immutable usage snapshot. Callbacks are authenticated with `X-Signature-SHA256` over the **raw** request body; duplicate delivery bodies are acknowledged without creating a second usage event.

The current MVP permits one live eSIM per order. This keeps one provider ICCID tied to one customer order until a dedicated multi-profile data model is added.

Enable this separately from live orders so it can be tested safely:

```env
ESIM_PROVIDER=esim-go
ESIM_API_KEY=your_provider_key
ESIM_WEBHOOKS_ENABLED=true
ESIM_LIVE_ORDERS_ENABLED=false
```

Configure this HTTPS endpoint in eSIM Go Portal → Account Settings → API Details, with Callback Version set to V3:

```text
https://YOUR_DOMAIN/api/providers/esim-go/webhook
```

Do not enable callbacks before the application has a production PostgreSQL database. The provider key is also the callback HMAC key, so keep it only in deployment secrets.

## Production work still required

1. Obtain matched written commercial responses from eSIM Go and 1GLOBAL.
2. Select a provider only through `docs/PROVIDER_DECISION_PACKET.md`.
3. Do not fund either candidate until domestic rights, economics, minimums and responsibilities pass review.
4. Map the selected provider SKU to an approved Streetwise retail plan.
5. Approve one exact controlled test SKU, operator, maximum spend, time window and rollback.
6. Test provisioning, installation, persistence, idempotency, callbacks, reconciliation and usage against that single test eSIM.
7. Create a Stripe test product/price and verify checkout plus webhooks end to end without live billing.
8. Add final usage, renewal, refund, cancellation and support procedures.
9. Complete legal, tax, telecom, privacy, security and consumer-disclosure review for the U.S. launch.
