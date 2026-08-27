# Project Status

Last reviewed: 2026-08-27

## Executive summary

Streetwise Connection has a production-backed public waitlist and a substantial commercial backend foundation for both residential and business connectivity. It is **not yet authorised for commercial eSIM sales** because several owner-, regulator-, and provider-gated items remain.

The current production posture is deliberately conservative:

- Public waitlist: enabled
- Customer accounts: built but disabled publicly
- Stripe live billing: disabled
- Live eSIM ordering: disabled
- Public waitlist storage: Supabase
- Future customer/order storage: PostgreSQL
- Provider commercial-readiness gate: merged and fail-closed

## Target retail structure

These are planning targets only. They are not approved sellable offers until real wholesale bundles, usage rules, taxes, and provider rights are mapped and accepted.

| Market | Plan | Target price |
| --- | --- | ---: |
| Residential | Streetwise Home | $25/month |
| Commercial | Business Starter | $20/month per line |
| Commercial | Business Volume | $15/month per line for 3+ lines |
| Commercial | Business Pro | $30/month per line |

Data and hotspot are intended to be included. Do not market any tier as unlimited until the selected provider confirms allowances, throttling, hotspot rules, recurring U.S. domestic-use rights, and residential/commercial resale permissions in writing.

## Readiness matrix

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Public site | Ready for waitlist | Production deployment remains waitlist-only |
| Waitlist validation | Ready | Server-side validation and consent checks exist |
| Waitlist production write path | Verified by smoke test | Direct Supabase row inspection remains the final administrative confirmation before closing the persistence issue |
| Waitlist abuse protection | Ready | Durable Supabase-backed rate limiting is configured |
| Customer accounts | Built, public access gated | Keep disabled until commercial launch approval |
| Stripe integration | Test-capable | Keep live billing disabled until provider/legal gates pass |
| eSIM Go API authentication | Verified | Stored API key authenticates successfully |
| eSIM Go U.S. catalogue | Verified | Real account returned 29 U.S.-relevant bundles during controlled validation |
| eSIM Go candidate quote | Verified | Candidate 3 GB / 30 day U.S. bundle returned a $4 USD validation quote |
| eSIM Go validation | Blocked externally | Current account balance is insufficient; do not fund merely to make validation pass |
| 1GLOBAL integration foundation | Ready for credentials | Read-only OAuth2/catalogue client exists; partner credentials and commercial offer are external dependencies |
| Provider commercial evidence gate | Ready | Fails closed unless domestic-use, commercial-role, pricing/support and launch-safety evidence is recorded |
| Target retail pricing | Configured | $15/$20/$25/$30 targets are in the plan configuration; no provider bundle is falsely mapped yet |
| Unit economics tooling | Ready | Catalogue analyser supports provider-specific wholesale comparison; final economics require real mapped bundles and taxes/fees |
| Nevada formation | Owner-gated | Filing, identity, signature, payment and EIN steps are outside code |
| Telecom compliance | External/owner-gated | Provider-of-record, Nevada PUCN and FCC/USAC responsibilities require final provider model and, where necessary, filings/advice |
| Customer legal policies | Drafted | Final Terms, Privacy and refund/support language must be reconciled to the signed provider contract and actual production vendors |
| Production observability | Partial | Monitoring/backups/audit/incident procedures need final pre-sales verification |

## Backend work completed or prepared

The repository now contains or supports:

- residential and commercial target plan configuration
- public plan API
- customer account and payment architecture
- Stripe test-mode integration foundations
- eSIM order and usage persistence models
- idempotency protections
- provider webhook infrastructure
- eSIM Go provider adapter and controlled diagnostics
- real eSIM Go U.S. catalogue access evidence
- provider economics normalisation and contribution-margin analysis
- read-only 1GLOBAL Connect OAuth2/catalogue integration
- provider comparison and outreach documentation
- machine-checkable provider commercial-readiness evidence gate
- production waitlist health and smoke checks
- business formation checklist and EIN worksheet
- draft operating agreement
- regulatory matrix
- draft Terms of Service, Privacy Policy, and refund/support policy
- launch-mode safety controls that keep payments and live provider orders disabled

## External / owner-gated work remaining

Only actions requiring the legal owner, payment, identity verification, signature, regulator interaction, or provider approval should remain as launch blockers:

1. Complete Nevada entity formation, Initial List and State Business Licence.
2. Obtain the IRS EIN.
3. Complete applicable Nevada/local licensing and tax registration.
4. Sign and retain the final operating agreement outside the public repository.
5. Complete provider business-account verification and commercial onboarding.
6. Obtain written recurring U.S. domestic-use and residential/commercial resale rights.
7. Confirm provider-of-record, telecom tax/surcharge, PUCN and FCC/USAC responsibilities.
8. Select the provider only after real commercial terms are compared.
9. Approve provider funding only after the provider decision is economically and legally acceptable.
10. Run one controlled paid staging eSIM acceptance test after approval.
11. Open the business bank account and configure live payment settlement only when legally ready.

See `docs/OWNER_ACTIONS.md` for the handoff checklist.

## Launch gates

Do not enable commercial service until all of the following are true:

- Wholesale provider agreement signed and responsibilities documented
- Real wholesale bundle mapped to every plan offered at launch
- Contribution margin verified at the intended $15/$20/$25/$30 retail tier as applicable
- Actual data, throttling and hotspot terms documented
- One full staging purchase/provision/install/usage/retry flow passes
- Stripe test checkout and signed webhook flow pass end to end
- Provider-of-record and telecom compliance responsibilities are resolved
- Taxes/surcharges and remittance responsibility are documented
- Privacy Policy, Terms, refunds/cancellations and support process are finalised
- Monitoring, backups, audit logging and incident-response procedures are verified
- Live-mode configuration receives a final explicit review

## Required safety configuration

Keep these values until every commercial gate is complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Only enable provider webhooks during controlled callback testing when the receiving endpoint and signature verification are intentionally being exercised.

## What not to claim yet

Do not publicly promise:

- unlimited data
- unlimited hotspot
- a specific carrier/network not guaranteed by the provider contract
- permanent or recurring U.S. service rights not confirmed in writing
- business SLA/support levels not contractually supported

The backend should be kept ready for those capabilities without advertising them before they are real.
