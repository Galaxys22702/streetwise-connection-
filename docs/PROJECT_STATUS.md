# Project Status

Last reviewed: 2026-08-27

## Executive summary

Streetwise Connection is technically capable of operating a production-backed public waitlist, but it is **not yet ready for commercial eSIM sales**.

The current production posture is deliberately conservative:

- Public waitlist: enabled
- Customer accounts: disabled publicly
- Stripe live billing: disabled
- Live eSIM ordering: disabled
- eSIM provider webhooks: disabled unless explicitly testing callbacks
- Public waitlist storage: Supabase
- Future customer/order storage: PostgreSQL

## Readiness matrix

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Public site | Ready for waitlist | Production deployment is live in waitlist mode |
| Waitlist validation | Ready | Server-side validation and consent checks exist |
| Waitlist storage | Ready, final acceptance pending | Supabase backend exists; one real production signup still needs persistence confirmation |
| Waitlist abuse protection | Ready | Durable Supabase-backed rate limiting is configured |
| Customer accounts | Built, public access gated | Keep disabled during waitlist launch |
| Stripe integration | Test-capable | Do not enable live billing yet |
| eSIM provider integration | Technical path verified; commercial selection blocked | eSIM Go authentication, 29 U.S. bundles and a $4 validation quote are verified; recurring U.S. rights and funding are unresolved; 1GLOBAL terms are pending |
| Live eSIM ordering | Blocked by design | Keep `ESIM_LIVE_ORDERS_ENABLED=false` |
| Unit economics | Preliminary screen only | The $4 eSIM Go quote gives 46.6% preliminary contribution before unresolved taxes, refunds, support and provider fees; final gate remains open |
| Nevada formation | In progress | Filing and identity-gated steps remain outside code |
| Telecom compliance | Not resolved | Provider-of-record, PUCN/FCC/USAC responsibilities must be determined |
| Customer legal policies | Draft/in progress | Finalise against actual provider contract and production data flows |
| Production observability | Partial | Expand monitoring, backups, audit logging, and incident procedures before sales |

## Immediate priority

Complete the final end-to-end public waitlist acceptance test:

1. Submit one dedicated test email through the production form.
2. Confirm the request returns success.
3. Confirm the normalised email is persisted in Supabase `waitlist_entries`.
4. Confirm no commercial route becomes available as a side effect.
5. Record the result and close the corresponding waitlist issue only after persistence is verified.

## Provider path

The next commercial dependency is wholesale connectivity, not more storefront features.

### eSIM Go

The eSIM Go technical route now authenticates, exposes 29 U.S. bundles and returns a $4 USD validation quote for `esim_3GB_30D_US_V2`. Validation remains `valid=false` because the available provider balance does not cover the quote. No top-up or live order was executed.

Published eSIM Go terms describe travel roaming and possible restriction after 60 days in one country. Therefore eSIM Go is not approved for recurring U.S. service unless a written exception or different domestic product resolves that conflict.

Do not make the standard $1,000 top-up merely to close validation.

### 1GLOBAL

1GLOBAL is now the priority commercial diligence path because its documented reseller and subscription architecture appears closer to Streetwise's intended model. A read-only client is prepared, but partner credentials, U.S. domestic rights, pricing, minimums and commercial responsibilities remain unknown.

Send both providers the matched request in `docs/PROVIDER_OUTREACH.md`, then apply the pass/fail gates and scorecard in `docs/PROVIDER_DECISION_PACKET.md`. No provider is selected until written account-specific evidence is complete.

## Launch gates

Do not enable commercial service until all of the following are true:

- Wholesale provider agreement signed and responsibilities documented
- Real catalogue imported and launch-plan margin verified
- One full staging purchase/provision/install/usage/retry flow passes
- Stripe test checkout and signed webhook flow pass end to end
- Provider-of-record and telecom compliance responsibilities are resolved
- Taxes/surcharges and remittance responsibility are documented
- Privacy Policy, Terms, refunds/cancellations, and support process are finalised
- Secure browser authentication and broader abuse controls are implemented
- Monitoring, backups, audit logging, and incident-response procedures are in place
- Live-mode configuration is reviewed before any production switch is changed

## Required safety configuration

Keep these values until the commercial gates are complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Only enable `ESIM_WEBHOOKS_ENABLED` during controlled callback testing when the receiving endpoint and signature verification are intentionally being exercised.

## What not to build yet

Avoid spending time on features that depend on unresolved provider economics or legal obligations, including:

- aggressive public checkout flows
- unlimited-data marketing promises
- broad plan expansion
- complex top-up UX
- production live-order automation

Those features become useful after provider pricing and launch obligations are known. Until then, the highest-value work is verification, provider onboarding, economics, and safety hardening.
