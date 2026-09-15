# Project Status

Last reviewed: **2026-09-15**  
Target launch-readiness date: **2026-11-30**  
Execution plan: `docs/90_DAY_LAUNCH_PLAN.md`

## Executive status

Streetwise Connection℠ remains **RED / pre-launch** for commercial cellular service.

The public waitlist is available, but commercial service must remain disabled until provider, formation, regulatory, economics, security, customer-policy, support and controlled-staging gates are complete.

### Production safety state

```text
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
ATT_COMMERCIAL_CONTRACT_APPROVED=false
ATT_LIVE_PROVISIONING_ENABLED=false
```

Current production posture:

- Public waitlist: enabled
- Customer accounts: built but disabled publicly
- Live Stripe billing: disabled
- Live SIM/eSIM ordering: disabled
- Voice/SMS: not enabled
- Phone numbers/porting: not enabled
- Multi-network/failover: not enabled
- Security suite: not enabled
- Emergency-connectivity reserve: not enabled
- Public waitlist storage: Supabase
- Future customer/service/order storage: PostgreSQL
- Primary domestic commercial candidate: AT&T
- Domestic fallback candidate: 1GLOBAL
- Travel/data integration: eSIM Go
- Open5GS: isolated non-production lab only

## Current blockers

1. **Provider onboarding — RED.** There is no repository evidence that the AT&T qualification/application inquiry has been submitted or accepted. The September 20 fallback trigger remains active: without a viable AT&T path, elevate 1GLOBAL to equal domestic priority.
2. **Nevada formation — RED.** The September 13 target was missed. Nevada LLC formation, Initial List, State Business Licence, EIN and applicable local/tax registrations remain incomplete.
3. **Nevada name verification — RED.** The September 14 official search attempt redirected to ORION and did not produce an entity-search result. `Streetwise Connection LLC` remains unverified and must be checked successfully immediately before filing.
4. **Regulatory allocation — RED.** Provider-of-record, Nevada PUCN, FCC/USAC, E911, taxes/surcharges, numbering/porting and related responsibilities must be resolved from the selected provider model before launch.

## Engineering health

- `Build targets`: green after the PostgreSQL startup race was fixed on 2026-09-15.
- Docker smoke testing now waits for a real SQL query against the target PostgreSQL database before migrations run; it no longer relies only on `pg_isready`.
- Unit tests, builder image, production image, database/migration smoke, application health, mock-provider status and security-header checks passed on the corrected workflow.
- Vercel compatibility passed on the corrected workflow.
- Dependabot is configured weekly for npm, Docker and GitHub Actions.
- No open pull requests were present during the 2026-09-15 repository cleanup pass.
- Repository code search found no `TODO`, `FIXME`, `HACK` or `XXX` markers during that pass.
- A coarse repository search found no obvious committed API-key/password/live-Stripe/service-role patterns during that pass; this is not a substitute for GitHub secret scanning.

### Repository administration cleanup still needed

- There are 34 non-`main` branches. They should be pruned only after each branch is proven merged or obsolete.
- `main` is currently reported as unprotected. Branch protection/ruleset administration is not available through the connected GitHub integration, so this remains a repository-owner administration task.
- Recommended protection: require successful `Build targets` and `Vercel compatibility` checks before merge, block force-pushes and branch deletion, and prefer pull requests for future code changes.

These repository-administration items are engineering hygiene concerns, not permission to bypass any launch gate.

## Product direction

Streetwise is being prepared as a provider-agnostic cellular/MVNO control plane rather than a data-only eSIM storefront. The existing account, payment, provider, database, waitlist, compliance and eSIM work remains the foundation.

Planning prices remain targets only:

| Market | Plan | Target price |
| --- | --- | ---: |
| Residential | Streetwise Home | $25/month |
| Commercial | Business Starter | $20/month per line |
| Commercial | Business Volume | $15/month per line for 3+ lines |
| Commercial | Business Pro | $30/month per line |

Final features and prices require real provider mapping and contribution-margin validation.

## Provider status

### AT&T — primary domestic candidate

AT&T remains commercially targeted but fail-closed technically. Streetwise has no recorded AT&T commercial approval, branding right, provider-of-record determination, account-specific pricing, API specification or live provisioning access.

Do not advertise Streetwise as an AT&T reseller, MVNO, partner or AT&T-powered service unless those rights are granted in writing.

### 1GLOBAL — domestic fallback

1GLOBAL remains the full-stack fallback/comparison path until a viable domestic provider agreement is selected.

### eSIM Go — travel/data path

The existing eSIM Go integration remains useful for travel/data evaluation and controlled technical validation. It does not establish domestic cellular launch readiness.

## Important implementation gaps

Do not invent these capabilities before the selected wholesale provider contract/API supports them:

- voice/SMS lifecycle
- mobile number inventory/assignment
- number portability
- E911 lifecycle
- Wi-Fi calling/VoLTE entitlement
- SIM-swap and port-out controls
- automatic network failover
- emergency-connectivity reserve

## External / owner-gated work

1. Complete the official Nevada entity-name check immediately before filing.
2. Complete Nevada formation and required business registrations when authorised.
3. Submit the AT&T qualification packet and obtain a written program/commercial response.
4. If required by the September 20 trigger, elevate 1GLOBAL to equal domestic priority.
5. Confirm resale, voice/SMS, numbering/porting, SIM/eSIM, network, roaming, support and branding rights.
6. Resolve provider-of-record and telecom regulatory responsibilities.
7. Obtain real wholesale pricing and minimum commitments.
8. Validate contribution margin against target retail pricing.
9. Run controlled staging provisioning/lifecycle tests.
10. Finalise customer policies, security disclosures and support procedures.
11. Enable live billing/service only after every mandatory launch gate passes and the owner explicitly authorises launch.

## Brand usage

Current repository source of truth:

- **Streetwise Connection℠**
- **Stay Connected. Stay Streetwise.℠**

Do not use ® unless and until a corresponding federal registration is issued and supports the specific use.

## Public claims that remain prohibited

Do not publicly promise unlimited data/hotspot, voice/SMS, a local number, number portability, 5G/VoLTE/Wi-Fi calling, automatic network switching, emergency reserve, security filtering, a specific carrier/network, permanent U.S. service rights, international coverage or business SLA levels until the applicable capability is contractually supported and technically verified.
