# Streetwise Connection - Provider Comparison

Last reviewed: 2026-08-27

This comparison supports provider selection only. It does not authorise funding, checkout, payments or eSIM transactions. The binding internal decision method and matched questionnaire are in `docs/PROVIDER_DECISION_PACKET.md`.

## Current conclusion

**No commercial provider is selected.**

- Pursue **1GLOBAL first for commercial diligence** because its documented reseller and subscription architecture appears closer to Streetwise's intended recurring U.S. service.
- Keep **eSIM Go as a technically proven conditional backup** for travel/short-duration service, or for recurring U.S. use only if a written contractual exception or a different domestic product resolves its published same-country restriction.
- Do not make eSIM Go's standard $1,000 top-up simply to produce a valid validation response.
- Keep `PUBLIC_LAUNCH_MODE=waitlist`, `STRIPE_LIVE_MODE_ENABLED=false` and `ESIM_LIVE_ORDERS_ENABLED=false`.

## Evidence rules

- Account observations prove only what the controlled check actually exercised.
- Public provider documentation identifies capabilities and risks but does not establish account-specific commercial rights.
- A written provider reply closes a gate only if it identifies the exact product and comes from an authorised representative.
- Unknown or silent terms remain unapproved.

## eSIM Go

### Account-verified Streetwise evidence

A controlled provider run established:

- the stored API key authenticates;
- the account exposes 29 U.S. bundles;
- `esim_3GB_30D_US_V2` is present;
- one unit currently quotes at $4 USD;
- a live-order-disabled validation request reaches the provider;
- validation currently returns `valid=false` because available balance does not cover the quote;
- no top-up or live order was executed; and
- exact balance and credentials were not exposed in public logs.

### Current public provider facts

Current eSIM Go documentation states:

- API authentication uses `X-API-Key`;
- catalogue and validation-before-order capabilities are available;
- the operating model is prepaid;
- the standard top-up minimum is $1,000 and the default daily maximum is $5,000, with account-manager adjustment possible;
- Travel API eSIMs operate in roaming mode;
- eSIM Go has permanent-roaming detection and reserves the right to restrict a SIM used in the same country for more than 60 days;
- the commercial partner handles first-line customer support, while eSIM Go provides second- and third-line technical support; and
- no dedicated sandbox is currently offered, with a second UAT organisation described as the workaround.

Primary sources:

- https://docs.esim-go.com/guides/getting_started/
- https://docs.esim-go.com/guides/setup_esimgo_account/
- https://docs.esim-go.com/quick_start/
- https://help.esim-go.com/hc/en-gb/articles/19946520545937-Is-There-A-Sandbox-Test-Environment
- https://help.esim-go.com/hc/en-gb/articles/14668061743121-First-Line-Troubleshooting-Guide

### Economics screen

At the current $10 retail planning price:

| Item | Amount |
| --- | ---: |
| Retail | $10.00 |
| Current provider quote | -$4.00 |
| Estimated card processing | -$0.59 |
| Support reserve | -$0.50 |
| Infrastructure reserve | -$0.25 |
| Preliminary contribution | $4.66 |
| Preliminary margin | 46.6% |

This is only a first screen. It excludes unresolved telecom taxes/surcharges, refund and chargeback exposure, fraud, final support cost and any other provider/account fees. It does not pass the final economics gate.

### Strengths

- Existing Streetwise adapter is implemented and contract-tested.
- Working credentials and real U.S. catalogue access are verified.
- The $4 candidate quote passes the existing $6 wholesale screen.
- Validation-only behaviour reached the provider while the transaction switch stayed off.

### Blocking risks

- Published same-country restrictions conflict with the intended recurring U.S. model.
- The standard $1,000 top-up is not approved and is disproportionate to merely closing a validation check.
- The validation request cannot currently return `valid=true` without sufficient balance.
- The published UAT workaround does not prove that an installable eSIM can be tested without funded production service.
- Provider-of-record, telecom/tax, support, refund, security and final fee allocation remain unresolved.

### Current fit

Technically proven for further evaluation. Commercially unapproved for recurring U.S. service. Potential fit for short-duration/travel use or if an explicit domestic exception or alternative product is incorporated into the contract.

## 1GLOBAL Connect

### Repository evidence

- A read-only OAuth2/catalogue client is prepared.
- Credential placeholders exist without storing secrets.
- The client is not wired to live provisioning.
- No partner credential, account catalogue, wholesale quote or order has been tested.

### Current public provider facts

Current 1GLOBAL material states:

- Connect supports server-to-server partner integrations;
- data-only and reseller use cases exist;
- account, subscriber, contract, subscription, product offering, coverage and lifecycle resources are documented;
- OAuth2 is used;
- idempotency is documented for applicable requests;
- connectivity resellers are an explicit partnership category; and
- the sales/partnership route accepts business enquiries.

Primary sources:

- https://docs.connect-api.1global.com/overview/whatisconnect
- https://docs.connect-api.1global.com/overview/getstarted/
- https://docs.connect-api.1global.com/api-reference
- https://docs.connect-api.1global.com/api/idempotency
- https://www.1global.com/partnerships
- https://www.1global.com/contact/

### Strengths

- Reseller and subscription architecture appears closer to recurring service than a travel-bundle-only model.
- Data-only connectivity is a documented use case.
- OAuth2 and documented idempotency fit a production integration.
- Product offering and lifecycle resources could support catalogue caching and subscription management.
- The repository can begin read-only evaluation when credentials arrive.

### Blocking risks

- No Streetwise partner approval or credentials.
- No account-specific U.S. product, price or network schedule.
- Public documentation does not prove indefinite same-country U.S. use for the proposed product.
- Commercial minimums, contract term, proof-of-concept cost, support/refunds, provider-of-record, telecom/tax and data/security duties are unknown.
- No staging catalogue, provisioning, installation, usage or retry evidence exists.

### Current fit

Higher-priority commercial candidate, but entirely unapproved until written product rights, commercial terms and account-specific technical evidence are received.

## Side-by-side gate status

`PASS` requires written account-specific evidence. `PARTIAL`, `BLOCKED` and `UNKNOWN` do not qualify.

| Gate | eSIM Go | 1GLOBAL |
| --- | --- | --- |
| Working credentials | PASS | UNKNOWN |
| Account-specific U.S. catalogue | PASS | UNKNOWN |
| Candidate wholesale quote | PASS: $4 USD screen | UNKNOWN |
| Recurring U.S. domestic rights | BLOCKED | UNKNOWN |
| Commercial/provider-of-record role | UNKNOWN | UNKNOWN |
| Final economics with all reserves | PARTIAL | UNKNOWN |
| Acceptable deposit/minimum commitment | BLOCKED pending alternative; no funding approved | UNKNOWN |
| Networks and service specification | UNKNOWN | UNKNOWN |
| Support and refund remedies | UNKNOWN | UNKNOWN |
| Safe proof-of-concept path | PARTIAL | UNKNOWN |
| Usage/events/reconciliation | PARTIAL | PARTIAL from public docs only |
| Data/security terms | UNKNOWN | UNKNOWN |
| Controlled installable eSIM test | NOT STARTED | NOT STARTED |

## Decision sequence

1. Send the matched requests in `docs/PROVIDER_OUTREACH.md`.
2. Capture both providers' written answers and private commercial artefacts.
3. Apply every pass/fail gate in `docs/PROVIDER_DECISION_PACKET.md`.
4. Run account-specific prices through `npm run analyse:provider`.
5. Score only candidates that pass every mandatory gate.
6. Create a separate provider-selection record.
7. Approve a single controlled test plan and maximum spend only after selection.
8. Keep transaction controls disabled until a later explicit launch approval.

The immediate next action is provider outreach, not funding or live-order testing.
