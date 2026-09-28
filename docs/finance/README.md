# Streetwise Connection — Finance

Last reviewed: **2026-09-25**

This folder is the source of truth for project financial readiness. It contains planning economics and payment architecture, not personal banking records or confidential provider pricing.

## Documents

- [Financial Readiness](./FINANCIAL_READINESS.md) — launch-capital, cost-evidence and financial approval gate.
- [Provider Economics](./PROVIDER_ECONOMICS.md) — per-plan contribution-margin analysis against real wholesale catalogue data.
- [Accounts & Payments](./ACCOUNTS_AND_PAYMENTS.md) — PostgreSQL subscription state, Stripe test-mode architecture and checkout controls.

## Current planning prices

| Plan | Audience | Planning price |
| --- | --- | ---: |
| Streetwise Home | Residential | $25/month |
| Business Starter | Commercial | $20/line/month |
| Business Volume | Commercial, 3+ lines | $15/line/month |
| Business Pro | Commercial | $30/line/month |

These are planning targets only. They are not approved public offers.

## Financial state

| Area | State |
| --- | --- |
| Retail planning prices | Documented |
| Live billing | Disabled |
| Live provider orders | Disabled |
| Account-specific wholesale costs | Unverified |
| Provider deposits/minimums | Unverified |
| Telecom taxes/surcharges | Unresolved |
| Fixed operating budget | Incomplete |
| Per-plan contribution margin | Not validated |
| Launch working capital | Not quantified |
| Financial launch approval | Not passed |

## Evidence rule

Do not commit bank details, tax identifiers, payment credentials, confidential provider rate cards or customer payment data. Store sensitive evidence in an approved private system and record only sanitised, dated conclusions in this repository.

## Approval sequence

1. Obtain written provider pricing and commercial terms.
2. Record fixed and variable operating costs.
3. Resolve applicable taxes, telecom fees and payment costs.
4. Run the provider economics analyser for every sellable tier.
5. Quantify launch working capital and reserves.
6. Validate Stripe test-mode lifecycle and refunds.
7. Complete controlled provider staging.
8. Record financial approval before enabling live billing or provider-funded orders.
