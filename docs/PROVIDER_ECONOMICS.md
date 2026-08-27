# Streetwise Connection - Provider Economics Gate

Last reviewed: 2026-08-27

This document defines how Streetwise evaluates wholesale eSIM bundles before any live checkout or provider-funded transaction is enabled. The overall provider decision method is in `docs/PROVIDER_DECISION_PACKET.md`.

## Decision rule

A $10 retail plan is not viable merely because the wholesale bundle costs less than $10.

Streetwise must account for at least:

- wholesale bundle and network cost;
- payment processing fees;
- support, fraud, refund and chargeback reserve;
- infrastructure reserve;
- telecom taxes and surcharges;
- failed activations and other provider-specific fees; and
- foreign-exchange exposure when provider and retail currencies differ.

The final internal economics gate requires:

1. at least **30% base contribution margin** after the configured costs; and
2. positive contribution after a **15% wholesale-cost stress test**.

These are configurable internal thresholds, not provider facts.

## Catalogue analyser

Export or save an account-specific provider catalogue response as JSON outside the repository, then run:

```bash
STREETWISE_PROVIDER_CURRENCY=USD \
  npm run analyse:provider -- /secure/path/catalogue.json
```

The analyser reports base contribution, base margin, stressed contribution, stressed margin and a commercial-gate result.

Default planning assumptions:

- retail price: `$10.00`;
- card processing estimate: `2.9% + $0.30`;
- support/fraud reserve: `$0.50`;
- infrastructure reserve: `$0.25`;
- tax reserve: `0%` until an approved launch-specific estimate is supplied;
- minimum base margin: `30%`; and
- wholesale-cost stress: `15%`.

Override assumptions without changing source code:

```bash
STREETWISE_RETAIL_PRICE=10 \
STREETWISE_RETAIL_CURRENCY=USD \
STREETWISE_PROVIDER_CURRENCY=USD \
STREETWISE_SUPPORT_RESERVE=0.75 \
STREETWISE_INFRA_RESERVE=0.30 \
STREETWISE_TAX_RESERVE_RATE=0.08 \
STREETWISE_MIN_MARGIN_PERCENT=30 \
STREETWISE_WHOLESALE_STRESS_RATE=0.15 \
npm run analyse:provider -- /secure/path/catalogue.json
```

## Currency gate

Set `STREETWISE_PROVIDER_CURRENCY` from the provider account or written price schedule. eSIM Go documents catalogue prices in the organisation currency, while the organisation endpoint reports the selected currency.

Catalogue rows that omit currency fail closed unless the provider currency is supplied. The analyser also rejects a provider currency that differs from `STREETWISE_RETAIL_CURRENCY` because it does not perform foreign-exchange conversion.

Convert and document cross-currency prices, including an exchange-rate buffer, before comparison.

## Output interpretation

- `Contribution` is retail revenue less the configured provider, payment, support, tax and infrastructure costs.
- `Margin` is contribution divided by retail price.
- `Stress Contribution` applies the configured wholesale-cost increase.
- `Gate=yes` means the row meets the configured base-margin and stress thresholds.
- A non-zero exit occurs when currency or assumptions are invalid, or when no bundle passes the configured gate.

Missing, blank, negative, malformed or cross-currency inputs never qualify.

`Gate=yes` is still only an economics result. It is **not provider selection or launch approval**. Domestic-use rights, contract terms, provider-of-record duties, support/refunds, security and controlled acceptance testing remain separate mandatory gates.

## Current eSIM Go screen

Using the 2026-08-27 account-verified $4 USD quote and the original planning assumptions:

| Item | Base | 15% wholesale stress |
| --- | ---: | ---: |
| Retail | $10.00 | $10.00 |
| Wholesale | $4.00 | $4.60 |
| Card processing | $0.59 | $0.59 |
| Support reserve | $0.50 | $0.50 |
| Infrastructure reserve | $0.25 | $0.25 |
| Tax reserve | $0.00 | $0.00 |
| Contribution | $4.66 | $4.06 |
| Margin | 46.6% | 40.6% |

The candidate clears the configured preliminary margin and stress thresholds. It does **not** close the final economics gate because launch-specific taxes/surcharges, refund and chargeback exposure, final support cost, all provider fees and long-term domestic-use rights remain unresolved.

## Final approval run

Before G3 in `docs/PROVIDER_DECISION_PACKET.md` can pass:

- use an effective, account-specific provider price schedule;
- identify the exact SKU, duration, allowance, networks and currency;
- supply an approved tax/surcharge reserve;
- include realistic support, fraud, refund and chargeback exposure;
- include every platform, activation, renewal, API, overage and other provider fee;
- document any foreign-exchange conversion and buffer;
- retain the analyser output in the private diligence record; and
- confirm the result remains at least 30% at base and contribution-positive under 15% wholesale stress.

## Data handling

Do not commit account-specific catalogue exports if they contain confidential pricing or provider terms. Keep them in secure private storage and commit only sanitised examples or non-confidential derived conclusions.

Primary provider references:

- https://docs.esim-go.com/api/v2_5/operations/catalogue/get/
- https://www.docs.esim-go.com/api/v2_5/operations/organisation/get/

## Relationship to live ordering

A passing economics result cannot change `ESIM_LIVE_ORDERS_ENABLED`.

Before any controlled paid staging test, Streetwise still needs:

1. an eligible provider that passes every mandatory gate;
2. a reviewable provider-selection record;
3. an exact test SKU and maximum spend;
4. explicit owner approval for the spend;
5. a test operator, time window, evidence checklist and rollback; and
6. immediate post-test disablement unless a separate launch approval exists.
