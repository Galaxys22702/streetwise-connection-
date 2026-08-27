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
| eSIM provider integration | In progress | eSIM Go adapter/tests exist; real credentials and catalogue validation remain |
| Live eSIM ordering | Blocked by design | Keep `ESIM_LIVE_ORDERS_ENABLED=false` |
| Unit economics | Not verified | Requires real wholesale catalogue and provider terms |
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

Current code includes an eSIM Go adapter and provider contract tests. Before any funding or live order:

1. Verify the business/provider account.
2. Obtain credentials and store them only in deployment secrets.
3. Pull the real catalogue.
4. Validate bundle coverage, duration, domestic usage rules, and wholesale cost.
5. Calculate Streetwise contribution margin.
6. Perform one controlled staging eSIM purchase only after the economics are acceptable.
7. Verify install details, persistence, idempotency, reconciliation, and usage sync.

### Backup provider

Maintain 1GLOBAL or another suitable wholesale platform as a comparison path so the product is not commercially dependent on one supplier before pricing, API quality, reseller rights, and support obligations are understood.

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
