# Accounts, PostgreSQL, and Payments

Streetwise Connection 0.3 adds the minimum account and payment foundation required before live eSIM provisioning.

## 1. PostgreSQL

For local development:

```bash
docker compose up -d postgres
```

Set:

```env
DATABASE_URL=postgres://streetwise:streetwise_dev@localhost:5432/streetwise
DATABASE_SSL=false
```

Then install dependencies and apply migrations:

```bash
npm install
npm run db:migrate
```

The first migration creates:

- `users`
- `sessions`
- `subscriptions`
- `payment_events`

Passwords are hashed with Node's `scrypt`. Session bearer tokens are random values; only their SHA-256 hashes are stored in PostgreSQL.

## 2. Customer API

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "a-long-password"
}
```

Login:

```http
POST /api/auth/login
```

Authenticated requests use:

```http
Authorization: Bearer SESSION_TOKEN
```

Account state:

```http
GET /api/account
```

Logout:

```http
POST /api/auth/logout
```

The storefront keeps the MVP bearer token in `sessionStorage`, so it is cleared when the browser session ends. Before a public production launch, move browser authentication to secure HttpOnly, Secure, SameSite cookies and add CSRF protections where required.

## 3. Payment modes

The default is safe mock mode:

```env
PAYMENT_PROVIDER=mock
```

Mock mode lets the application exercise the checkout route without contacting a payment processor.

For Stripe test mode:

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=
STRIPE_LIVE_MODE_ENABLED=false
APP_BASE_URL=http://localhost:3000
```

`STRIPE_PRICE_ID` is optional. When omitted, the app creates recurring Checkout price data from the Streetwise retail plan. For production, a pre-created Stripe Price ID is preferred so pricing is controlled in Stripe and deployment configuration rather than generated on each Checkout Session.

If an `sk_live_` key is supplied while `STRIPE_LIVE_MODE_ENABLED=false`, the application refuses to initialize live Stripe transactions.

## 4. Checkout

Authenticated customers start checkout with:

```http
POST /api/payments/checkout
Authorization: Bearer SESSION_TOKEN
Content-Type: application/json

{
  "planId": "starter-10"
}
```

The server returns a hosted Checkout URL.

## 5. Stripe webhook

Configure the Stripe webhook destination as:

```text
https://YOUR_DOMAIN/api/payments/webhook
```

The application verifies Stripe's webhook signature before processing the event. Processed Stripe event IDs are stored in `payment_events` to prevent duplicate event handling.

The current handlers reconcile:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 6. eSIM purchase gate

When:

```env
ESIM_LIVE_ORDERS_ENABLED=true
```

`POST /api/esims/order` requires an authenticated customer with an `active` or `trialing` subscription before a telecom purchase is attempted.

Keep both payment live mode and eSIM live mode disabled until test-mode checkout, webhook handling, refunds/cancellations, taxes, provider pricing, and duplicate-order protection are verified.
