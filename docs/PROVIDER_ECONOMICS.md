# Streetwise Connection — Provider Economics Gate

This document defines how Streetwise evaluates wholesale eSIM bundles before any live checkout or provider-funded transaction is enabled.

## Decision rule

A $10 retail plan is not considered viable merely because the wholesale bundle costs less than $10.

Streetwise must account for at least:

- wholesale bundle/network cost
- payment processing fees
- support/fraud reserve
- infrastructure reserve
- telecom/tax reserve once the launch model is legally classified
- refunds, chargebacks, failed activations, and other provider-specific costs when known

The repository now includes a catalogue analyser that calculates contribution margin from exported provider catalogue JSON.

## Usage

Export or save an account-specific provider catalogue response as JSON outside the repository, then run:

```bash
npm run analyse:provider -- /secure/path/catalogue.json
```

Default assumptions:

- retail price: `$10.00`
- card processing estimate: `2.9% + $0.30`
- support reserve: `$0.50`
- infrastructure reserve: `$0.25`
- tax reserve: `0%` until an explicit estimate is supplied

Override planning assumptions without changing source code:

```bash
STREETWISE_RETAIL_PRICE=10 \
STREETWISE_SUPPORT_RESERVE=0.75 \
STREETWISE_INFRA_RESERVE=0.30 \
STREETWISE_TAX_RESERVE_RATE=0.08 \
npm run analyse:provider -- /secure/path/catalogue.json
```

## Interpretation

`Contribution` is the amount left after the configured cost assumptions. `Margin` is contribution divided by retail price.

A positive contribution is only a screening result. It is **not** commercial approval. Streetwise must still confirm provider terms, domestic-use restrictions, taxes/telecom fees, refund exposure, support obligations, and real account-specific pricing.

## Data handling

Do not commit account-specific catalogue exports if they contain confidential pricing or provider terms. Keep them in a secure working location and commit only sanitized examples or derived non-confidential conclusions.

## Commercial gate

Before enabling `ESIM_LIVE_ORDERS_ENABLED=true`, Streetwise should have:

1. verified provider credentials in staging;
2. retrieved real U.S. catalogue data;
3. ranked candidate bundles with this analyser;
4. validated at least one candidate order without executing a transaction;
5. confirmed long-term domestic-use permission in writing;
6. documented taxes, refunds, support and provider-of-record responsibility;
7. completed one controlled paid staging acceptance test only after approval.
