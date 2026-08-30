# Streetwise Connection — Provider Comparison

Last reviewed: 2026-08-30

This comparison is for provider selection only. It does not authorise live sales, payments, SIM/eSIM activation, phone-number assignment, or number porting.

## Decision standard after the cellular pivot

Streetwise is no longer selecting a provider only for data-only eSIM delivery. The preferred long-term provider should support a recurring U.S. cellular product and should be evaluated for:

- recurring same-country U.S. service rights
- mobile data
- hotspot/tethering rules
- voice
- SMS
- local mobile numbers
- number portability
- eSIM and, if useful, physical SIM
- 5G
- VoLTE
- Wi-Fi calling
- line suspension/reactivation
- SIM swap/replacement lifecycle
- roaming/international options
- network footprint and resilience options
- usage and lifecycle events
- API idempotency
- support/SLA
- wholesale pricing and minimum commitments
- provider-of-record/regulatory allocation
- taxes/surcharges
- E911/numbering responsibilities
- customer data and fraud/security responsibilities

A public marketing page is not a Streetwise commercial agreement. Every launch-critical capability still requires account-specific confirmation.

## 1GLOBAL — priority full-cellular candidate

Current public 1GLOBAL Telco-as-a-Service materials describe:

- domestic mobile plans
- data, texts and calls
- local phone numbers
- number porting
- SIM/eSIM
- voice and SMS APIs/capabilities
- roaming
- 5G
- VoLTE
- Wi-Fi calling
- full-MVNO/core-network infrastructure
- branded mobile-service enablement

Public source reviewed:

- https://www.1global.com/telco-as-a-service

### Streetwise implications

Strengths:

- The published capability set is much closer to the new Streetwise cellular/MVNO direction than a travel-data-only product.
- Domestic mobile plans, phone numbers, voice/SMS and porting are directly relevant to the intended service.
- A full-stack provider architecture could reduce the amount of telecom infrastructure Streetwise must own while still allowing Streetwise to control the brand and customer experience.
- International/travel capability can sit alongside domestic service instead of forcing the domestic product to use a travel-eSIM model.

Open risks and required evidence:

- Streetwise does not yet have an account-specific commercial offer for the intended U.S. product.
- Streetwise does not yet have production credentials for the full cellular capability set.
- Public material does not prove which U.S. networks, prices, minimum commitments, voice/SMS terms, number ranges, porting processes, hotspot rules, or resilience options would apply to Streetwise.
- Provider-of-record, E911, numbering/porting, taxes/surcharges, FCC/USAC, Nevada PUCN, fraud and customer-support responsibilities must be confirmed.
- Any security or network-failover differentiator must be mapped to actual provider capabilities.

Best current fit: **primary commercial evaluation path for the recurring U.S. cellular product**.

## eSIM Go — secondary travel/data path

Current public eSIM Go Travel API documentation confirms:

- API authentication with X-API-Key
- consumer travel eSIM products
- roaming-mode use for travel bundles
- permanent-roaming detection
- a reserved right to restrict a SIM used in the same country for more than 60 days
- first-line customer support handled by the commercial partner
- pre-paid wholesale model

Public source reviewed:

- https://docs.esim-go.com/guides/getting_started/

Streetwise also already has:

- implemented eSIM Go adapter
- working authentication from earlier controlled validation
- U.S. catalogue access from earlier controlled validation
- validation-only order behaviour
- idempotency and persistence foundations

### Streetwise implications

Strengths:

- Existing code is useful and should not be discarded.
- Good fit for travel/short-duration data products or a controlled data/eSIM technical path.
- Existing provider abstraction gives Streetwise a working integration baseline.

Material constraint:

The documented same-country/permanent-roaming restriction is a poor default match for a recurring U.S. domestic cellular plan. eSIM Go should not become the assumed U.S. cellular foundation without a written exception or a different provider product designed for that use.

Open risks:

- recurring U.S. domestic-service fit
- voice/SMS/phone-number/porting scope for the intended product
- minimum funding/wholesale terms
- provider-of-record and telecom responsibility allocation
- final support/refund obligations

Best current fit: **secondary travel/data product path or controlled technical fallback**, not the assumed full-cellular foundation.

## Current decision

1. Pursue 1GLOBAL or an equivalent full-stack MVNO/MVNE/Telco-as-a-Service partner first.
2. Keep eSIM Go integrated as a travel/data option and technical backup.
3. Do not fund or commit to a provider merely because an API works.
4. Require written U.S. domestic-service, resale, capability, economics and regulatory evidence before mapping a provider to a Streetwise launch plan.
5. Keep all live customer sales and activation disabled during comparison.

## Evidence required from the priority provider

Obtain written answers for:

1. commercial role Streetwise would hold;
2. recurring U.S. domestic-use rights;
3. residential and commercial resale rights;
4. supported U.S. networks;
5. data and hotspot terms;
6. voice and SMS terms;
7. local-number capability;
8. number-porting process and costs;
9. 5G/VoLTE/Wi-Fi-calling support;
10. eSIM/physical-SIM lifecycle;
11. SIM-swap/replacement/port-out events and controls;
12. roaming/international products;
13. network-selection/failover options, if any;
14. usage/event latency and webhooks;
15. sandbox/test path;
16. minimum commitment, deposit, funding and wholesale pricing;
17. refunds/credits/failed activations;
18. support/SLA;
19. provider-of-record, E911, numbering, taxes, FCC/USAC and Nevada responsibilities;
20. exit/termination treatment for active customers and numbers.

Until those facts are complete, PUBLIC_LAUNCH_MODE=waitlist and ESIM_LIVE_ORDERS_ENABLED=false remain mandatory.
