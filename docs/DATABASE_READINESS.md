# Streetwise Connection — Database Readiness

Last reviewed: 2026-08-27

## Purpose

This document records the backend database state so the remaining work is limited to environment credentials, official owner/provider data, controlled migrations, and launch approval.

## Current database architecture

Streetwise uses two storage roles:

- **Supabase** for the public production waitlist and durable waitlist/rate-limit state.
- **PostgreSQL via `DATABASE_URL`** for future customer accounts, sessions, subscriptions, payments, eSIM orders, usage, provider webhooks, residential/commercial customer structure, and service lines.

The public launch remains waitlist-only. Customer, payment and live eSIM tables may exist before launch, but their public routes remain gated.

## Migration system

`npm run db:migrate` runs all SQL migrations in lexical order. The migration runner:

- requires `DATABASE_URL`;
- serialises concurrent migration attempts using a PostgreSQL advisory lock;
- records applied filenames in `schema_migrations`;
- wraps each migration in a transaction;
- rolls back a failed migration;
- skips migrations already recorded as applied.

## Schema prepared

Current migrations prepare:

1. `001_accounts_and_payments.sql`
   - users
   - sessions
   - subscriptions
   - payment event idempotency
2. `002_esim_orders_and_usage.sql`
   - eSIM order and usage persistence
3. `003_esim_order_idempotency.sql`
   - order idempotency controls
4. `004_esim_provider_webhooks.sql`
   - provider webhook event persistence
5. `005_waitlist_entries.sql`
   - PostgreSQL-compatible waitlist storage structure
6. `006_customer_segments_and_service_lines.sql`
   - residential/commercial customer type
   - commercial organisations and members
   - residential/commercial service lines
   - plan snapshots for preserving the commercial terms attached to an eventual sale

## Target plan model represented by the backend

- Streetwise Home — residential — $25/month target
- Streetwise Business Starter — commercial — $20/month per line target
- Streetwise Business Volume — commercial — $15/month per line for 3+ lines target
- Streetwise Business Pro — commercial — $30/month per line target

These are planning prices only until provider mapping, data/hotspot terms, taxes and contribution margin are approved.

## Required environment values before customer database use

- `DATABASE_URL`
- `DATABASE_SSL` as required by the selected PostgreSQL host
- `DATABASE_POOL_MAX` if the default pool size is not appropriate

Secrets must remain in deployment/environment secret storage and never be committed.

## Activation sequence

When owner/provider gates are complete:

1. Confirm production PostgreSQL is backed up and reachable.
2. Run `npm run db:migrate` against the intended production database.
3. Run the application verification suite.
4. Confirm database health reports configured + connected.
5. Map final approved provider bundles to the Streetwise plan IDs.
6. Insert plan snapshots only from approved commercial terms.
7. Complete one controlled account/payment/provisioning acceptance flow.
8. Keep live sales disabled until the final launch review explicitly passes.

## Safety state

Until the owner and commercial gates pass:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Database readiness does not itself authorise billing, service activation, provider funding or public sales.
