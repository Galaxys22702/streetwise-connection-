# Streetwise Connection — Provider Comparison

Last reviewed: 2026-08-27

This comparison is for provider selection only. It does not authorize live sales or eSIM transactions.

## eSIM Go

Current public developer documentation and the live Streetwise provider check confirm:

- API authentication uses `X-API-Key`.
- The stored Streetwise API key authenticates successfully.
- The account currently exposes 29 U.S. catalogue bundles.
- `type: validate` checks an order without charging the provider balance, but the account must still satisfy the checks a transaction would require.
- `esim_3GB_30D_US_V2` currently quotes at $4 USD for this account.
- The current account balance does not cover that quote, so validation remains `valid=false`. No top-up was attempted.
- The current standard minimum top-up documented by eSIM Go is $1,000, with a $5,000 default daily maximum; account managers can alter limits.
- eSIM Go states its travel eSIMs are used in roaming mode, has permanent-roaming detection, and reserves the right to restrict a SIM used in the same country for more than 60 days.
- eSIM Go states first-line end-customer support is handled by the commercial partner, with eSIM Go providing second- and third-line technical support.

Primary sources:

- https://docs.esim-go.com/quick_start/
- https://docs.esim-go.com/guides/authentication/
- https://docs.esim-go.com/guides/setup_esimgo_account/
- https://docs.esim-go.com/guides/getting_started/

### Streetwise implications

Strengths:

- Existing Streetwise adapter is implemented and contract-tested.
- Working credentials and real U.S. catalogue access are already verified.
- The $4 candidate quote passes the initial $6 wholesale screening guardrail.
- Validation-only ordering lets Streetwise test without executing a transaction.

Material constraint:

The published 60-day same-country restriction conflicts with Streetwise's intended recurring U.S. home-market service if customers are expected to keep using the same connectivity continuously. Therefore eSIM Go should **not** be treated as the default long-term U.S. provider unless eSIM Go provides a written contractual exception or a different non-travel product that permits the intended domestic usage.

Open risks:

- $1,000 standard funding minimum is substantial for an early-stage validation exercise.
- A fully valid order check still requires enough provider balance to cover the quote.
- Written clarification or exception is needed for recurring U.S. domestic use beyond 60 days.
- Final taxes, refund exposure, support cost and provider-of-record responsibilities remain unresolved.

Best current fit: travel/short-duration product evaluation, or a controlled technical test after commercial approval. Not approved as the recurring U.S. connectivity foundation.

## 1GLOBAL Connect

Current 1GLOBAL Connect documentation confirms:

- Connect is designed for server-to-server partner integrations that sell eSIM-based cellular connectivity to end customers.
- Data-only plans are supported.
- A reseller role exists for product listing, orders, SIM/subscription management and usage data.
- The API uses OAuth2 and supports `Idempotency-Key` on applicable requests.
- Current API documentation is versioned `2026-02-05`.
- The API includes accounts, subscribers, contracts, subscriptions, product offerings, coverage areas and service lifecycle resources.
- Product offerings can be cached locally and refreshed rather than fetched for every customer transaction.
- Contract resources explicitly include the United States as a supported legal-entity country in the current API reference.

Primary sources:

- https://docs.connect-api.1global.com/overview/whatisconnect
- https://docs.connect-api.1global.com/overview/getstarted/
- https://docs.connect-api.1global.com/api-reference
- https://docs.connect-api.1global.com/api/idempotency

### Streetwise implications

Strengths:

- Explicit reseller and subscription architecture aligns more closely with Streetwise's intended recurring-service model.
- Data-only connectivity is a documented use case.
- OAuth2 and documented idempotency support fit a production-grade provider integration.
- Account/subscriber/contract/subscription APIs suggest a deeper telco-as-a-service model than a travel-bundle-only integration.
- A read-only Streetwise OAuth2/catalogue client is now prepared for credentials.

Open risks:

- Streetwise does not yet have partner credentials or commercial pricing.
- Public documentation alone does not prove that the specific U.S. product Streetwise needs permits indefinite domestic use.
- Minimum commitments, U.S. network terms, reseller obligations, support duties and provider-of-record responsibilities must be confirmed directly.

## Current decision

**Provider priority has changed.**

For the intended recurring U.S. product, pursue 1GLOBAL or another provider with explicit domestic/MVNO-style rights **before** committing $1,000 to eSIM Go. Keep eSIM Go available as a technically proven backup for short-duration/travel use or if a written domestic-use exception is offered.

Next evidence required:

1. Obtain 1GLOBAL partner/reseller commercial terms, credentials path and minimum commitments.
2. Obtain written confirmation that the intended U.S. data-only service can be used continuously in-market, not merely as travel roaming.
3. Obtain real U.S. pricing and run it through `npm run analyse:provider`.
4. Ask eSIM Go whether Streetwise can receive an explicit contractual exception or alternative product for continuous U.S. use beyond 60 days.
5. Compare contribution margin, network coverage, renewal behaviour, usage latency, refunds, support obligations, taxes and provider-of-record responsibility.

Until those facts are available, `PUBLIC_LAUNCH_MODE=waitlist` and `ESIM_LIVE_ORDERS_ENABLED=false` remain mandatory.

## Machine-checkable evidence gate

Copy `docs/provider-commercial-evidence.example.json` to a private working location and replace only facts supported by a written provider response, account-specific catalogue, written quote, signed terms, or completed test evidence. Store confidential source material outside this public repository and use `evidenceRecordId` only as a private record reference.

Check whether the two-provider comparison is complete:

```bash
npm run check:provider-commercial -- /secure/path/provider-evidence.json
```

After a provider is selected, check the stricter pre-activation evidence set:

```bash
npm run check:provider-commercial -- \
  /secure/path/provider-evidence.json \
  --stage=activation
```

The command fails closed when commercial facts are missing. It also refuses to pass while waitlist mode, disabled checkout, disabled payments, and disabled live provider ordering are not explicitly recorded.
