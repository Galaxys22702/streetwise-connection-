# Streetwise Connection — MVP Architecture

## Product boundary

Streetwise Connection should be designed as a **connectivity control plane and storefront**, not as a fictional replacement for cellular radio infrastructure.

An eSIM is a secure subscriber identity/provisioning mechanism. It still connects through licensed mobile networks. The commercially realistic path is to buy wholesale connectivity from a carrier, MVNO enablement platform, or eSIM aggregator and expose it under the Streetwise customer experience.

## MVP components

### 1. Web storefront

Customer-facing interface for:

- plan selection
- device/country compatibility
- checkout
- eSIM installation instructions
- account/usage management

### 2. Streetwise API

Owns the product-facing business rules:

- plan catalog
- coverage lookup
- customer/account state
- order lifecycle
- provider abstraction
- billing integration
- usage/top-up workflows

### 3. Provider adapter

A boundary between Streetwise and whichever wholesale partner is selected.

The rest of the application should call a stable internal interface such as:

- `checkCoverage()`
- `listWholesalePlans()`
- `createEsimOrder()`
- `getEsimStatus()`
- `getUsage()`
- `topUp()`
- `cancelOrExpire()`

This prevents the product from being locked to one provider API.

### 4. Payment processor

A production launch needs a compliant processor and webhook-driven order state. Do not provision paid connectivity solely from browser success redirects.

### 5. Persistence

Recommended first production database: PostgreSQL.

Core tables/entities:

- users
- devices
- plans
- orders
- esim_profiles
- provider_accounts
- usage_snapshots
- payments
- topups
- audit_events

## Order state machine

Suggested flow:

`draft -> payment_pending -> paid -> provisioning -> active -> exhausted/expired -> renewed`

Failure states should include:

`payment_failed`, `provisioning_failed`, `refunded`, `cancelled`.

## Security requirements before real provisioning

- Never commit provider API keys to GitHub.
- Store secrets in deployment secret management.
- Verify payment and provider webhooks cryptographically.
- Encrypt sensitive subscriber/order data at rest where appropriate.
- Keep immutable audit records for order/provisioning transitions.
- Add rate limiting and abuse controls.
- Minimize storage of eSIM activation data.
- Define retention and deletion policies.

## $10/month economics

The $10 target cannot be finalized until wholesale costs are known. Unit economics should include:

`retail price - wholesale data/network cost - payment fees - taxes/telecom fees - support/fraud reserve - infrastructure = contribution margin`

The system should therefore keep pricing and data allowance configurable rather than hard-code a promise of unlimited data.

## Phase 1 integration decision

Evaluate providers on:

1. Wholesale cost per GB / bundle
2. U.S. + international footprint
3. API quality and sandbox access
4. eSIM provisioning model
5. Usage latency
6. Top-up support
7. Branding/reseller rules
8. Minimum commitments
9. Regulatory/compliance responsibilities
10. Support/SLA quality
