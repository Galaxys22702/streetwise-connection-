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

## Primary technical test: eSIM Go

### Account setup

- [ ] Create the Streetwise business account in the eSIM Go portal
- [ ] Complete provider account verification
- [ ] Record the provider agreement/terms outside this public repository
- [ ] Obtain the API key from Account Settings → API Details
- [ ] Store the API key in staging deployment secrets only
- [ ] Do not enable live orders

### Commercial review before funding

- [ ] Confirm the current minimum account top-up directly in the provider portal
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
- [ ] Record candidate wholesale bundle SKUs and prices
- [ ] Validate one order with `validateOnly=true`
- [ ] Verify no provider balance was charged
- [ ] Confirm order persistence and idempotency behavior
- [ ] Configure V3 callback only after a persistent staging/production database is available
- [ ] Test callback signature verification
- [ ] Enable live ordering only for one controlled acceptance transaction
- [ ] Purchase one test eSIM
- [ ] Verify ICCID, SM-DP+ / matching ID or install URL, and QR/install flow
- [ ] Verify order refresh, failure handling, retry handling, and usage synchronization
- [ ] Disable live ordering again after the controlled test unless launch approval is complete

## Parallel provider path: 1GLOBAL Connect

- [ ] Request partner/reseller access
- [ ] Request API credentials for data-only eSIM connectivity
- [ ] Confirm sandbox or test-environment availability
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
| Long-term domestic use confirmed | Pending | Pending |
| $10 plan margin viable | Pending | Pending |
| Test eSIM provisioned | Pending | Pending |
| Usage synchronization verified | Pending | Pending |
| Refund/cancellation terms reviewed | Pending | Pending |
| Regulatory responsibility documented | Pending | Pending |

## Launch rule

Streetwise must remain waitlist-only until the selected provider is contractually approved, staging acceptance testing passes, pricing is viable, payments are tested, required business/regulatory steps are complete, and support/refund/privacy procedures are adopted.
