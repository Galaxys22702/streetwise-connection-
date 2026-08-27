# Streetwise Connection - Provider Onboarding Runbook

Last evidence review: 2026-08-27

This runbook tracks the external provider work required before Streetwise can move beyond public waitlist mode. The governing comparison and outreach process is in `docs/PROVIDER_DECISION_PACKET.md`.

## Current safety state

Keep these values unchanged until provider selection, commercial review, compliance work, payment testing and controlled provider acceptance testing are complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
PAYMENT_PROVIDER=mock
STRIPE_LIVE_MODE_ENABLED=false
ESIM_PROVIDER=mock
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Provider credentials must be stored only as deployment secrets. Never commit a real API key, confidential catalogue, contract or account balance to GitHub.

## Current provider direction

- **No commercial provider is selected.**
- **1GLOBAL is the priority diligence path** for recurring U.S. service because its documented reseller/subscription architecture appears closer to the intended model.
- **eSIM Go is the technically proven conditional backup** for travel or short-duration use, or for recurring U.S. use only if a written exception or different domestic product resolves the published same-country restriction.
- No provider funding is authorised.
- No checkout, payment or live eSIM order may be enabled from this runbook.

## Repository readiness

The repository can evaluate providers without enabling a paid transaction.

- Provider status does not expose API keys.
- eSIM Go catalogue requests use the `X-API-Key` header and normalise country filters.
- eSIM Go order requests remain `type=validate` while `ESIM_LIVE_ORDERS_ENABLED=false`, even if a caller asks for a transaction.
- A real eSIM Go transaction requires both `ESIM_LIVE_ORDERS_ENABLED=true` and `validateOnly=false`.
- Install details use `/esims/assignments` with `additionalFields=installUrl`.
- Missing credentials fail closed.
- The normal Vercel build includes provider contract tests.
- A read-only 1GLOBAL OAuth2/catalogue client is prepared but is not wired to live provisioning.

## eSIM Go evidence and workstream

### Verified evidence

A controlled GitHub Actions provider run on 2026-08-27 established:

- API authentication succeeds with the stored deployment secret.
- The Streetwise account can access 29 U.S. catalogue bundles.
- Candidate `esim_3GB_30D_US_V2` is present.
- One unit currently produces a $4 USD quote.
- A validation-only request reached the provider.
- The result is `valid=false` because the account does not have enough positive balance to cover the quote.
- `ESIM_LIVE_ORDERS_ENABLED=false` remained enforced.
- No live order or top-up was executed.
- Exact balance and credentials were not written to public logs.

The failed validity result identifies a funding prerequisite. It is not evidence that Streetwise should fund the account.

### Account and credential status

- [x] Streetwise provider account exists
- [ ] Confirm full business-account verification in writing or in the provider portal
- [ ] Store the provider agreement and account-specific terms outside the public repository
- [x] Obtain a working API key
- [x] Store the key only in approved deployment secrets
- [x] Confirm the key is not committed to the repository
- [x] Keep live orders disabled

### Commercial review before funding

- [x] Review the currently published standard $1,000 minimum top-up
- [ ] Obtain the account-specific minimum, deposit, expiry and refund terms in writing
- [ ] Obtain a written exception permitting continuous same-country U.S. use beyond 60 days and repeated renewals, or identify a different domestic product
- [ ] Confirm exact commercial classification and provider-of-record allocation
- [ ] Confirm U.S. networks, throttling, tethering, fair-use and permanent-roaming rules
- [ ] Confirm support, escalation, refund and failed-activation responsibilities
- [ ] Confirm tax, surcharge, registration, reporting and customer-disclosure responsibilities
- [ ] Obtain account-specific price and fee schedules
- [ ] Run final economics, including tax/fee and refund reserves, through `npm run analyse:provider`
- [ ] Pass the mandatory gates in `docs/PROVIDER_DECISION_PACKET.md`
- [ ] Obtain separate approval for any provider spend

Do not fund the account merely to make validation return `valid=true`.

### Safe evaluation configuration

Provider diagnostics may use eSIM Go credentials only in a controlled staging or CI context while the public runtime remains non-transactional:

```env
PUBLIC_LAUNCH_MODE=waitlist
PAYMENT_PROVIDER=mock
STRIPE_LIVE_MODE_ENABLED=false
ESIM_PROVIDER=esim-go
ESIM_API_BASE_URL=
ESIM_API_KEY=<deployment-secret>
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Restore `ESIM_PROVIDER=mock` for the ordinary public runtime unless a separately reviewed diagnostic requires otherwise.

### Technical acceptance status

- [x] Verify API authentication without exposing the key
- [x] Pull the real U.S. catalogue
- [x] Record a current candidate SKU and price as a sanitised conclusion
- [x] Submit a validation-only request with live orders disabled
- [x] Verify that no provider transaction was executed
- [ ] Obtain a `valid=true` validation result, currently blocked by balance and commercial approval
- [ ] Confirm application order persistence and end-to-end idempotency against the selected provider
- [ ] Configure callbacks only after a persistent staging database and callback plan are approved
- [ ] Test callback signature verification, retry and deduplication
- [ ] Approve the exact SKU, maximum spend, operator, time window and rollback for one controlled test
- [ ] Purchase one controlled test eSIM
- [ ] Verify ICCID, install URL or SM-DP+/matching details and device installation
- [ ] Verify order refresh, failure handling, retry handling, reconciliation and usage synchronisation
- [ ] Disable the transaction path immediately after the controlled test unless a separate launch approval exists

## 1GLOBAL workstream

### Repository status

- [x] Prepare a read-only OAuth2/catalogue client
- [x] Keep the client disconnected from live provisioning
- [x] Define credential placeholders without storing secrets
- [ ] Submit the partnership/reseller request
- [ ] Obtain an authorised commercial contact
- [ ] Obtain sandbox or test credentials
- [ ] Verify authentication and account-specific catalogue access

### Commercial and product review

- [ ] Confirm continuous same-country U.S. use beyond 60 days and repeated renewals in writing
- [ ] Identify the exact reseller product, contract schedule and legal entity
- [ ] Confirm provider-of-record, telecom, tax, reporting and disclosure responsibilities
- [ ] Obtain U.S. networks, coverage, service limitations and lifecycle behaviour
- [ ] Obtain wholesale pricing, currency, fees, deposits, monthly minimums and volume commitments
- [ ] Confirm refund, failed-activation, support and escalation rules
- [ ] Confirm sandbox, proof-of-concept and maximum test cost
- [ ] Confirm usage latency, events, webhooks, idempotency, retries and reconciliation
- [ ] Review data-processing and security terms
- [ ] Run the same economics and decision gates used for eSIM Go

Use the matched 30-question request in `docs/PROVIDER_DECISION_PACKET.md` and the ready-to-send draft in `docs/PROVIDER_OUTREACH.md`.

## Provider decision gate

`PASS` requires written, account-specific evidence. `PARTIAL`, `BLOCKED` and `UNKNOWN` are not approvals.

| Requirement | eSIM Go | 1GLOBAL |
| --- | --- | --- |
| Account exists | PASS | UNKNOWN |
| Full commercial account approval | UNKNOWN | UNKNOWN |
| API credentials | PASS | UNKNOWN |
| U.S. catalogue | PASS: 29 bundles | UNKNOWN |
| Non-charging validation | PARTIAL: request works; `valid=false` due balance | UNKNOWN |
| Long-term domestic use | BLOCKED pending exception or different product | UNKNOWN |
| Final $10 economics | PARTIAL: $4 quote gives a 46.6% preliminary screen before unresolved costs | UNKNOWN |
| Cash commitment acceptable | BLOCKED: no funding approved; published standard top-up is $1,000 | UNKNOWN |
| Proof-of-concept path | PARTIAL | UNKNOWN |
| Usage and event behaviour verified | UNKNOWN | UNKNOWN |
| Refund and support allocation | UNKNOWN | UNKNOWN |
| Provider-of-record/regulatory allocation | UNKNOWN | UNKNOWN |
| Data and security terms reviewed | UNKNOWN | UNKNOWN |
| Controlled eSIM acceptance test | NOT STARTED | NOT STARTED |

## Launch rule

Streetwise must remain waitlist-only until:

1. one provider passes every mandatory commercial gate;
2. the provider is selected in a reviewable decision record;
3. a controlled staging purchase, provision, install, usage, retry and reconciliation test passes;
4. the $10 plan meets the final economics threshold;
5. provider-of-record, tax and U.S. regulatory duties are resolved;
6. payments, customer policies, support, security and operations are launch-ready; and
7. an explicit launch approval changes the safety controls.

Until then, checkout, live payments and live eSIM ordering remain disabled.
