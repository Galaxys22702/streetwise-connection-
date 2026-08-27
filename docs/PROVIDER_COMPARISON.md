# Streetwise Connection — Provider Comparison

Last reviewed: 2026-08-27

This comparison is for provider selection only. It does not authorize live sales or eSIM transactions.

## eSIM Go

Current public developer documentation confirms:

- API authentication uses `X-API-Key`.
- API keys are generated under Account Settings → API Details.
- The catalogue is available through the v2.5 API.
- `type: validate` checks an order without charging the provider balance.
- The current standard minimum top-up documented by eSIM Go is $1,000, with a $5,000 default daily maximum; account managers can alter limits.

Primary sources:

- https://docs.esim-go.com/quick_start/
- https://docs.esim-go.com/guides/authentication/
- https://docs.esim-go.com/guides/setup_esimgo_account/

### Streetwise implications

Strengths:

- Existing Streetwise adapter is already implemented and contract-tested.
- Validation-only ordering lets Streetwise test a real account without spending provider balance.
- Catalogue access is straightforward once credentials are issued.

Open risks:

- $1,000 standard funding minimum is substantial for an early-stage validation exercise.
- Long-term same-country U.S. usage must be explicitly approved for the intended Streetwise product.
- Account-specific U.S. pricing is still unknown.

## 1GLOBAL Connect

Current 1GLOBAL Connect documentation confirms:

- Connect is designed for server-to-server partner integrations that sell eSIM-based cellular connectivity to end customers.
- Data-only plans are supported.
- A reseller role exists for product listing, orders, SIM/subscription management and usage data.
- The API uses OAuth2 and supports `Idempotency-Key` on applicable requests.
- Current API documentation is versioned `2026-02-05`.
- Product offerings can be cached locally and refreshed rather than fetched for every customer transaction.

Primary sources:

- https://docs.connect-api.1global.com/overview/whatisconnect
- https://docs.connect-api.1global.com/overview/getstarted/
- https://docs.connect-api.1global.com/api-reference
- https://docs.connect-api.1global.com/next/recipes/new-esim

### Streetwise implications

Strengths:

- Explicit reseller model aligns closely with Streetwise's intended architecture.
- Data-only connectivity is a documented use case.
- OAuth2 and documented idempotency support fit a production-grade provider integration.
- Product catalogue and lifecycle APIs appear suitable for recurring connectivity management.

Open risks:

- Streetwise does not yet have partner credentials or commercial pricing.
- Minimum commitments, U.S. domestic-use rules, reseller terms, support obligations and provider-of-record responsibilities must be confirmed directly.
- A Streetwise adapter has not yet been implemented.

## Current decision

Do not select a commercial provider yet.

The next evidence needed is:

1. eSIM Go account approval and account-specific U.S. catalogue pricing without funding the account first if possible.
2. Written clarification from eSIM Go on recurring U.S. domestic use.
3. 1GLOBAL partner/reseller response, credentials path and commercial minimums.
4. Real pricing from both providers run through `npm run analyse:provider`.
5. Comparison of contribution margin, product duration, U.S. network coverage, renewal behaviour, usage latency, support obligations and regulatory responsibility.

Until those facts are available, `PUBLIC_LAUNCH_MODE=waitlist` and `ESIM_LIVE_ORDERS_ENABLED=false` remain mandatory.
