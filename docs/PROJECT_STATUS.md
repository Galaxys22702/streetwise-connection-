# Project Status

Last reviewed: **2026-09-08**

Target launch-readiness date: **2026-11-30**

Execution plan: `docs/90_DAY_LAUNCH_PLAN.md`

## Executive summary

Streetwise Connection℠ is being prepared as a broader **cellular/MVNO service company** rather than a data-only eSIM storefront.

The existing waitlist, account, payment, eSIM, provider, economics, compliance, database, security, and deployment work remains useful. It is now the foundation for a larger product that may eventually include data, hotspot, voice, SMS, local numbers, number portability, security controls, network-resilience options, emergency-connectivity features, and international service.

Streetwise is **not yet authorised or technically complete for commercial cellular sales**.

Current production posture:

- Public waitlist: enabled
- Customer accounts: built but disabled publicly
- Stripe live billing: disabled
- Live SIM/eSIM ordering: disabled
- Voice/SMS: not enabled
- Phone number assignment/porting: not enabled
- Multi-network/failover: not enabled
- Security suite: not enabled
- Emergency connectivity reserve: not enabled
- Public waitlist storage: Supabase
- Future customer/service/order storage: PostgreSQL
- Provider commercial-readiness gate: fail-closed
- Primary domestic commercial candidate: AT&T
- Domestic fallback candidate: 1GLOBAL
- Travel/data integration: eSIM Go
- Open5GS: isolated lab validation only, not production service

## September maintenance and branding state

The September repository/production pass includes:

- public branding updated to **Streetwise Connection℠**
- slogan usage updated to **Stay Connected. Stay Streetwise.℠**
- brand/IP evidence record added
- production waitlist redesign deployed
- Stripe dependency updated to 22.6.0 with live billing still disabled
- GitHub Actions/Node.js workflow maintenance updated while retaining Node.js 24
- Open5GS lab scaffold and validation workflow added in an isolated non-production path
- production safety model unchanged: waitlist only, no public payment, no live SIM/eSIM provisioning

The lab work must not be interpreted as Streetwise operating a live mobile core or carrier network. It is development/research infrastructure only.

## Product objective

Streetwise should compete on:

**affordability + security + resilience + clarity + practical support**

rather than attempting to win on price alone.

## Planning retail structure

These remain planning targets only:

| Market | Plan | Target price |
| --- | --- | ---: |
| Residential | Streetwise Home | $25/month |
| Commercial | Business Starter | $20/month per line |
| Commercial | Business Volume | $15/month per line for 3+ lines |
| Commercial | Business Pro | $30/month per line |

Final service features and prices require real provider mapping and economics.

## Cellular capability status

| Capability | Current status | Gate |
| --- | --- | --- |
| Public waitlist | Ready | Production-backed |
| Mobile data provisioning foundation | Built/test-capable | Provider approval and staging acceptance still required |
| Hotspot | Product intent only | Provider plan rules required |
| Voice | Planned | Full-cellular provider/API/contract required |
| SMS | Planned | Full-cellular provider/API/contract required |
| Local mobile number | Planned | Numbering capability and regulatory allocation required |
| Number portability | Planned | Provider porting capability/process required |
| 5G | Provider-dependent | Must be confirmed per product/network/device |
| VoLTE | Planned/provider-dependent | Must be confirmed and tested |
| Wi-Fi calling | Planned/provider-dependent | Must be confirmed and tested |
| SIM/eSIM lifecycle | eSIM foundation built | Full line-lifecycle expansion required |
| SIM-swap protection | Planned | Provider event/action support plus Streetwise security workflow |
| Port-out protection | Planned | Provider capability plus Streetwise security workflow |
| Scam/phishing filtering | Planned | Network/DNS/security implementation required |
| Multi-network/failover | Planned | Commercial/network/device/technical support required |
| Emergency connectivity reserve | Planned | Provider plan/billing mechanics required |
| International/travel data | Existing provider path available for evaluation | Commercial approval required |
| Commercial multi-line model | Database foundation built | Full cellular line lifecycle required |
| Open5GS lab | Isolated validation scaffold | Must remain disconnected from production/live subscriber provisioning |

## Provider direction

### Priority: AT&T

AT&T remains the primary domestic provider candidate.

The repo is prepared to evaluate two AT&T business paths:

- AT&T Partner Exchange
- AT&T Wholesale

Public AT&T materials are not an approval for Streetwise. Streetwise has not yet received an AT&T commercial approval, provider-of-record determination, account-specific pricing, API specification, branding right or live provisioning access.

Coding posture:

- AT&T primary domestic candidate: configured
- AT&T live provisioning: disabled
- AT&T public affiliation claim: disabled
- AT&T commercial evidence: required and fail-closed
- AT&T-specific support/billing/FRN/API/branding evidence: required
- AT&T API endpoints: not invented
- credentials: not present in GitHub

Prepared external packet:

- `docs/ATT_PROVIDER_APPLICATION_PACKET.md`
- `docs/business/AT&T-SIGNATURE-READY-PACKET.md`

### Fallback: 1GLOBAL

1GLOBAL remains the required domestic comparison candidate until AT&T's actual terms, qualification and technical access are accepted.

### Travel/data: eSIM Go

eSIM Go remains a separate travel/data integration. Its commercial evidence is optional for the domestic provider decision.

## Backend work completed or prepared

The repository contains or supports:

- residential/commercial planning configuration
- public plan API
- customer accounts and sessions
- Stripe test-mode integration foundations
- eSIM order and usage persistence
- idempotency protections
- provider webhooks
- eSIM Go provider adapter
- real eSIM Go catalogue/authentication evidence from earlier controlled validation
- provider economics normalisation
- AT&T commercial qualification strategy and fail-closed client gate
- AT&T-specific commercial evidence validation
- read-only 1GLOBAL fallback preparation
- provider comparison/outreach documentation
- provider commercial evidence gate
- public waitlist health and smoke checks
- formation/licensing/EIN working documents
- regulatory matrix
- draft customer policies
- launch safety controls
- isolated Open5GS lab validation infrastructure
- Streetwise brand/service-mark evidence documentation
- current dependency maintenance and CI compatibility work

## Important gaps

The current codebase does not yet implement a complete cellular line stack for:

- voice/SMS
- phone number inventory/assignment
- number portability
- E911-related lifecycle
- Wi-Fi calling/VoLTE entitlement
- SIM-swap/port-out security controls
- automatic network failover
- emergency connectivity reserve

That work should not be guessed into existence before the selected wholesale provider's real API, contract, and regulatory allocation are known.

## External / owner-gated work remaining

1. Complete Nevada entity formation, Initial List, State Business Licence, EIN, and applicable local/tax registration.
2. Submit the AT&T qualification/application packet and obtain the correct AT&T program path plus a written commercial offer.
3. Confirm AT&T residential and commercial resale rights, branding rights, Tier 1 support model, end-user billing model and FRN requirement/status.
4. Confirm recurring U.S. domestic use.
5. Confirm voice/SMS/number/porting/5G/VoLTE/Wi-Fi-calling capability.
6. Confirm networks and any multi-network/resilience options.
7. Confirm provider-of-record, E911, numbering/porting, taxes, PUCN, FCC/USAC, and other telecom responsibilities.
8. Obtain real wholesale pricing and minimum commitments.
9. Validate target retail contribution margin.
10. Run controlled staging line provisioning and lifecycle tests.
11. Reconcile Terms, Privacy, refund/support, security, and disclosures to the selected provider agreement.
12. Explicitly approve live billing and live service only after all gates pass.

## 90-day execution rule

Streetwise is targeting launch readiness by November 30, 2026. If provider, licensing, regulatory, economics, security, customer-policy, or controlled-staging gates remain incomplete on that date, the software can be considered prepared but public commercial launch remains blocked.

## Required safety configuration

Production remains:

```text
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

## Brand usage rule

Current public/common-law service-mark usage is:

- **Streetwise Connection℠**
- **Stay Connected. Stay Streetwise.℠**

Do not use the ® symbol unless and until a corresponding federal registration is issued and supports the specific use.

## What not to claim yet

Do not publicly promise:

- unlimited data
- unlimited hotspot
- voice/SMS
- a local mobile number
- number portability
- 5G, VoLTE, or Wi-Fi calling
- automatic network switching
- emergency reserve
- scam/phishing filtering
- a specific carrier/network
- permanent U.S. service rights
- international coverage
- business SLA/support levels

until each capability is contractually supported and technically verified.
