# Customer dashboard

Streetwise Connection MVP 0.4 adds durable customer eSIM records and a signed-in dashboard.

## What is stored

PostgreSQL stores each Streetwise eSIM order with the owning user, provider order reference, bundle, device/country metadata, status, install profile details, data allowance, data used, activation/expiration timestamps, and provider result state.

Usage snapshots are stored separately in `esim_usage_events` so provider usage updates can be audited over time.

## Dashboard API

Authenticated requests use the bearer session token returned by registration/login.

```http
GET /api/dashboard
Authorization: Bearer <session-token>
```

The response contains:

- customer account
- latest subscription state
- the customer's eSIM orders
- per-eSIM usage and installation details
- aggregate eSIM/usage summary

The individual eSIM list is also available at:

```http
GET /api/esims
Authorization: Bearer <session-token>
```

## Installation details

Customer-owned installation data is protected by order ownership checks:

```http
GET /api/esims/orders/{id}/install
Authorization: Bearer <session-token>
```

A different signed-in account cannot read another customer's stored profile.

## Usage testing

While `ESIM_PROVIDER=mock`, development usage can be simulated:

```http
POST /api/esims/orders/{id}/usage/simulate
Authorization: Bearer <session-token>
Content-Type: application/json

{"usedMegabytes":100}
```

This updates the persisted usage counters and creates a usage-history event. This endpoint is blocked for non-mock providers.

## Production next step

Replace mock usage simulation with the chosen wholesale provider's usage API/webhooks. Provider usage should update the same `esim_orders` counters and append immutable `esim_usage_events` snapshots. Add low-data thresholds, top-ups, expiration/renewal notifications, and provider reconciliation before public launch.
