# Streetwise Connection — Provider Economics Gate

This document defines how Streetwise evaluates wholesale connectivity bundles before any live checkout or provider-funded transaction is enabled.

## Target retail pricing

Streetwise's current target retail structure is:

- Residential — Streetwise Home: `$25/month`
- Commercial — Business Starter: `$20/month per line`
- Commercial — Business Volume: `$15/month per line` for `3+ lines`
- Commercial — Business Pro: `$30/month per line`

These are target retail prices, not approved sellable offers. Data and hotspot are intended to be included, but Streetwise must not market any plan as unlimited until written provider terms confirm the actual allowance, throttling, hotspot rules, recurring U.S. usage rights, and commercial resale permissions.

## Decision rule

A plan is not considered viable merely because its retail price exceeds the wholesale bundle cost.

Streetwise must account for at least:

- wholesale bundle/network cost
- payment processing fees
- support/fraud reserve
- infrastructure reserve
- telecom/tax reserve once the launch model is legally classified
- refunds, chargebacks, failed activations, and other provider-specific costs when known

The repository includes a catalogue analyser that calculates contribution margin from exported provider catalogue JSON.

## Usage

Export or save an account-specific provider catalogue response as JSON outside the repository, then run the analyser separately for each target retail price.

```bash
STREETWISE_RETAIL_PRICE=25 \
STREETWISE_RETAIL_CURRENCY=USD \
STREETWISE_PROVIDER_CURRENCY=USD \
npm run analyse:provider -- /secure/path/catalogue.json
```

Repeat with `20`, `15`, and `30` for the commercial tiers.

Set `STREETWISE_PROVIDER_CURRENCY` from the provider account itself. Catalogue rows that omit currency fail the economics gate unless this value is supplied.

Do not compare different currencies directly. The analyser rejects a provider currency that differs from `STREETWISE_RETAIL_CURRENCY` because no foreign-exchange conversion or exchange-rate buffer has been applied.

Planning inputs should include:

- target retail price for the tier being tested
- card processing estimate
- support/fraud reserve
- infrastructure reserve
- launch-specific telecom/tax reserve when known

Example:

```bash
STREETWISE_RETAIL_PRICE=20 \
STREETWISE_RETAIL_CURRENCY=USD \
STREETWISE_PROVIDER_CURRENCY=USD \
STREETWISE_SUPPORT_RESERVE=0.75 \
STREETWISE_INFRA_RESERVE=0.30 \
STREETWISE_TAX_RESERVE_RATE=0.08 \
npm run analyse:provider -- /secure/path/catalogue.json
```

## Interpretation

`Contribution` is the amount left after the configured cost assumptions. `Margin` is contribution divided by retail price.

Missing, blank, negative, or cross-currency inputs never qualify as viable. Invalid assumptions also fail closed rather than silently reverting to defaults.

A positive contribution is only a screening result. It is **not** commercial approval. Streetwise must still confirm provider terms, domestic-use restrictions, taxes/telecom fees, refund exposure, support obligations, actual data/hotspot limits, and real account-specific pricing.

## Data handling

Do not commit account-specific catalogue exports if they contain confidential pricing or provider terms. Keep them in a secure working location and commit only sanitised examples or derived non-confidential conclusions.

## Commercial gate

Before enabling `ESIM_LIVE_ORDERS_ENABLED=true`, Streetwise should have:

1. verified provider credentials in staging;
2. retrieved real U.S. catalogue data;
3. mapped provider bundles to each proposed Streetwise tier;
4. validated contribution margin for `$15`, `$20`, `$25`, and `$30` targets using launch-specific costs;
5. validated at least one candidate order without executing a transaction;
6. confirmed recurring U.S. domestic-use and consumer/commercial resale permission in writing;
7. documented taxes, refunds, hotspot/data limits, support and provider-of-record responsibility;
8. completed one controlled paid staging acceptance test only after approval.

Checkout, payments, and live provider orders remain disabled until these gates pass.
