# eSIM Provisioning Target

Streetwise Connection now supports two eSIM provider modes:

- `mock` — local development only. No telecom service is purchased or activated.
- `esim-go` — live eSIM Go API integration.

## Safety model

Real transactions are disabled by default.

Even when `ESIM_PROVIDER=esim-go` and a valid API key is configured, Streetwise sends validation-only order requests unless:

```env
ESIM_LIVE_ORDERS_ENABLED=true
```

Do not enable that flag until catalogue mapping, pricing, checkout, refund handling, support procedures, and provider account funding have been verified.

## Environment

```env
PORT=3000
ESIM_PROVIDER=mock
ESIM_API_BASE_URL=
ESIM_API_KEY=
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

Streetwise order records currently use an in-memory `Map`. Restarting the Node process clears them.

Before production, replace the in-memory store with a durable database and persist at minimum:

- Streetwise order ID
- provider order reference
- customer ID
- bundle SKU
- amount/currency
- status
- ICCID
- installation metadata
- timestamps
- idempotency key

## Production work still required

1. Create and fund the wholesale provider account.
2. Map provider bundle SKUs to Streetwise retail plans.
3. Add a database.
4. Add authentication and customer accounts.
5. Add payment authorization before telecom purchase.
6. Add idempotency to prevent duplicate eSIM purchases.
7. Add provider webhooks for order/profile/usage status.
8. Add usage and top-up APIs.
9. Add refund/cancellation/support procedures.
10. Complete legal, tax, telecom, privacy, and consumer-disclosure review for each launch market.
