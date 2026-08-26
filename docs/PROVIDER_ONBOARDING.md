# Streetwise Connection — Provider Onboarding Runbook

This runbook tracks the external provider work required before Streetwise can move beyond public waitlist mode.

## Current safety state

Keep these values unchanged until provider acceptance testing, pricing review, business compliance, and payment testing are complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
ESIM_PROVIDER=mock
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Provider credentials must be stored only as deployment secrets. Never commit a real API key to GitHub.

## Repository readiness

The repository is ready to accept an eSIM Go test key without enabling a paid transaction.

- Provider status does not expose the API key.
- Catalogue requests use the `X-API-Key` header and normalize country filters.
- Order requests remain `type=validate` while `ESIM_LIVE_ORDERS_ENABLED=false`, even if a caller asks for a transaction.
- A real transaction requires both `ESIM_LIVE_ORDERS_ENABLED=true` and `validateOnly=false`.
- Install details use `/esims/assignments` with `additionalFields=installUrl`.
- Missing credentials fail closed.
- The normal Vercel build runs these provider contract tests along with the rest of the repository tests.

## Primary technical test: eSIM Go

### Verified external constraints — 2026-08-26

Before funding or selecting eSIM Go as the initial commercial provider, resolve these points directly with the provider:

- eSIM Go describes its Travel API eSIMs as roaming products and states that it may restrict eSIMs used in the same country for more than 60 days. That is a material risk for a recurring U.S. domestic-internet product.
- Current eSIM Go setup/API documentation shows a standard first card top-up of $1,000, while newer balance guidance says limits can vary by account. Confirm the exact Streetwise minimum in the portal or with the account manager before funding.
- First-line customer support belongs to the commercial partner, so Streetwise needs its own customer-support process before launch.
- The provider API is rate-limited at the account level; catalogue data should be cached rather than polled continuously.

Do not fund the account until eSIM Go confirms in writing that the intended Streetwise U.S. usage pattern is permitted and the economics fit the target retail price.

### Account setup

- [ ] Create the Streetwise business account in the eSIM Go portal
- [ ] Complete provider account verification
- [ ] Record the provider agreement/terms outside this public repository
- [ ] Obtain the API key from Account Settings → API Details
- [ ] Store the API key in staging deployment secrets only
- [ ] Do not enable live orders

### Commercial review before funding

- [ ] Confirm the current minimum account top-up directly in the provider portal
- [ ] Obtain written clarification on the 60-day same-country/permanent-roaming restriction for the intended U.S. use case
- [ ] Review U.S. bundle pricing, duration, allowance, network coverage, and usage restrictions
- [ ] Confirm whether intended long-term U.S. domestic use is permitted
- [ ] Calculate Streetwise gross margin at the proposed $10 retail price
- [ ] Do not fund the provider account until the commercial fit is acceptable

### Safe staging configuration

After credentials are issued, use:

```env
PUBLIC_LAUNCH_MODE=waitlist
ESIM_PROVIDER=esim-go
ESIM_API_BASE_URL=
ESIM_API_KEY=<deployment-secret>
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

With live ordering disabled, Streetwise should use validation-only order behavior.

### Technical acceptance test

- [ ] Confirm `GET /api/provider/status` reports configured provider without exposing the API key
- [ ] Pull `GET /api/provider/catalogue?country=US`
- [ ] Record candidate wholesale bundle SKUs and prices from the account-specific catalogue
- [ ] Validate one current catalogue SKU with `validateOnly=true`
- [ ] Verify no provider balance was charged
- [ ] Confirm order persistence and idempotency behavior
- [ ] Configure V3 callback only after a persistent staging/production database is available
- [ ] Test callback signature verification
- [ ] Enable live ordering only for one controlled acceptance transaction after commercial approval
- [ ] Purchase one test eSIM
- [ ] Verify ICCID, SM-DP+ / matching ID or install URL, and QR/install flow
- [ ] Verify order refresh, failure handling, retry handling, and usage synchronization
- [ ] Disable live ordering again after the controlled test unless launch approval is complete

## Parallel provider path: 1GLOBAL Connect

Because long-term U.S. domestic use is a core Streetwise requirement, keep an alternative provider path active until that requirement is contractually resolved.

- [ ] Request partner/reseller access
- [ ] Request API credentials for data-only eSIM connectivity
- [ ] Confirm sandbox or test-environment availability
- [ ] Ask explicitly whether recurring same-country U.S. use is permitted and under what roaming/permanent-roaming limits
- [ ] Compare U.S. coverage and product duration with eSIM Go
- [ ] Compare wholesale pricing and commercial minimums
- [ ] Compare subscription/renewal behavior
- [ ] Compare webhook/events and usage APIs
- [ ] Compare customer/account responsibilities and provider-of-record terms

## Provider decision gate

Choose the initial commercial provider only after documenting:

| Requirement | eSIM Go | 1GLOBAL |
| --- | --- | --- |
| Account approved | Pending | Pending |
| API credentials | Pending | Pending |
| U.S. catalogue tested | Pending | Pending |
| Long-term domestic use confirmed | **At risk — written clarification required** | Pending |
| $10 plan margin viable | Pending | Pending |
| Test eSIM provisioned | Pending | Pending |
| Usage synchronization verified | Pending | Pending |
| Refund/cancellation terms reviewed | Pending | Pending |
| Regulatory responsibility documented | Pending | Pending |

## Launch rule

Streetwise must remain waitlist-only until the selected provider is contractually approved, staging acceptance testing passes, long-term domestic use is explicitly permitted, pricing is viable, payments are tested, required business/regulatory steps are complete, and support/refund/privacy procedures are adopted.
