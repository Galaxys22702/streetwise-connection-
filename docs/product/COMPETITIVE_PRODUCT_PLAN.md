# Streetwise Connection — Competitive Product Plan

Last updated: 2026-09-13

## Objective

Build Streetwise Connection into a differentiated U.S. cellular/MVNO brand rather than another low-cost unlimited plan. The product should win on simple pricing, eSIM activation, hotspot usefulness, transparent throttling, security, support, and eventually multi-network resilience.

This document defines **planning targets**, not live customer offers. Nothing here should be advertised as available until the selected wholesale provider, contract, network capabilities, economics, legal/compliance requirements, billing, support, and end-to-end provisioning tests are complete.

## Competitive position

Streetwise should not try to beat Verizon, AT&T, T-Mobile, Spectrum, Visible, US Mobile, Mint, Metro, Cricket, Boost, Google Fi, and Total Wireless solely on headline price.

The intended differentiation is:

1. Standalone service with no home-internet bundle requirement.
2. Fast digital eSIM activation on compatible devices.
3. Clear high-speed allowances and clearly disclosed post-threshold speeds.
4. Hotspot treated as a core feature rather than an afterthought.
5. Security-first account controls, SIM-swap and port-out protection where the provider supports them.
6. Human support and clear escalation paths.
7. Provider-agnostic architecture with a long-term path to multi-network resilience.
8. Business controls for multiple lines, pooled usage, suspension/reactivation, alerts, and administration.
9. Separate domestic and travel products so domestic customers are not forced into travel-eSIM limitations.
10. Transparent terms before payment: network, priority/deprioritisation, hotspot, throttling, roaming, taxes, fees, cancellation, and support.

## Target retail product ladder

These figures are negotiation and economics targets only.

### Streetwise Lite

Target retail price: **$10–$15/month**

Intended use:
- secondary devices
- tablets
- navigation
- delivery/gig-work devices
- backup connectivity
- low-usage customers

Target characteristics:
- fixed high-speed data allowance
- eSIM-first activation
- hotspot permitted where contractually allowed
- no contract
- taxes/fees included where commercially feasible

### Streetwise Unlimited

Target retail price: **$25/month all-in**

Wholesale negotiation target:
- up to **100 GB high-speed data**
- **50 GB high-speed hotspot**
- continued data after the high-speed threshold at a clearly stated, still-usable reduced speed
- eSIM activation
- BYOD support
- no home-internet prerequisite
- no activation fee if wholesale economics permit
- simple monthly pricing
- multi-year price stability where sustainable

The public product must not use the word `unlimited` unless the actual provider contract and implemented controls support the advertised behaviour.

### Streetwise Max

Target retail price: **$35–$40/month**

Target characteristics:
- higher priority data where commercially obtainable
- substantially larger hotspot allowance
- expanded roaming/travel options
- multi-network capability if supported
- stronger support SLA
- advanced security controls where technically possible

### Streetwise Business

Target structure:
- multi-line pricing
- pooled or assignable data where available
- central line administration
- activate/suspend/reactivate controls
- usage alerts
- downloadable billing records
- role-based account access
- eventual API access for larger customers

## Throttling policy target

Streetwise should prefer a customer-friendly model:

1. Large high-speed allowance.
2. Clearly disclosed threshold.
3. Continued service after the threshold at a stated reduced speed.
4. No hidden hard cut-off unless the plan is explicitly sold as capped.
5. Separate disclosure of network deprioritisation versus deliberate throttling.

Wholesale evaluation must capture:
- high-speed allowance
- post-threshold speed
- hotspot high-speed allowance
- hotspot post-threshold behaviour
- video optimisation restrictions
- deprioritisation/QCI or equivalent priority treatment
- network-management rules
- hard caps or overage charges

## Wholesale provider requirements

No provider should be selected on marketing copy alone. Streetwise needs written commercial answers for:

- U.S. domestic resale rights
- consumer and business resale permissions
- branding/white-label rights
- eSIM lifecycle API
- physical SIM support if required later
- voice/SMS/local-number support
- number portability
- hotspot/tethering rules
- high-speed data allowance
- post-threshold speeds
- network priority/deprioritisation
- domestic roaming
- international roaming
- Wi-Fi calling/VoLTE support
- device/BYOD compatibility process
- per-line wholesale cost
- data overage/excess usage cost
- activation/replacement costs
- platform/API fees
- minimum monthly commitment
- prepaid balance/credit requirements
- taxes/surcharges responsibilities
- fraud/chargeback allocation
- support SLA and escalation
- termination rights
- customer-data handling and security obligations

## Provider shortlist

### Tier 1 — investigate first

**Gigs**

Reason: Telco-as-a-Service model, branded cellular programme support, eSIM/API capabilities, and a structure aligned with launching a consumer-facing mobile brand.

Required verification: U.S. network options, pricing, minimum commitments, plan catalogue, priority levels, hotspot rules, voice/SMS/number support, porting, taxes, branding rights, and API capabilities.

### Tier 1 — compare directly

**1GLOBAL**

Reason: full-stack connectivity/eSIM platform and a credible alternative to reduce provider lock-in.

Required verification: permanent U.S. domestic-use rights, network options, hotspot terms, voice/SMS/number capabilities, pricing, API access, and commercial minimums.

### Direct carrier route

**AT&T wholesale/partner path**

Reason: potential direct domestic carrier relationship.

Status: commercially targeted only. Streetwise must not claim AT&T affiliation until written rights exist.

### Travel/data path

**eSIM Go**

Use for travel/short-duration data products and technical testing unless commercial terms explicitly support the intended permanent domestic use case.

## Streetwise AutoConnect concept

Long-term target: a customer experience that can use more than one approved underlying network and make switching/failover simple.

Possible stages:

1. Manual network selection during activation.
2. Customer-triggered network switch from the Streetwise dashboard.
3. Secondary backup profile.
4. Policy-driven failover when the primary network is unavailable.
5. Automatic resilience where provider contracts, device behaviour, eSIM architecture, and economics permit it.

Do not advertise automatic switching until it has been proven end to end on supported devices and provider agreements permit it.

## Go/no-go economics

Before a plan becomes public, calculate:

```text
retail price
- wholesale line/network cost
- expected data cost
- voice/SMS/number cost
- eSIM/SIM lifecycle cost
- payment processing
- telecom taxes and surcharges
- support allocation
- fraud/chargeback reserve
- infrastructure/security cost
= contribution margin
```

A plan does not launch if normal customer usage can make the expected contribution margin negative.

## Public-site rule

Until the wholesale contract is signed and validated, the website may show **launch targets** but must say that final price, network, data allowance, hotspot, throttling, voice/SMS, number features, roaming, and activation details remain subject to provider approval and testing.

Public checkout, payment, line activation, number porting, and live Streetwise eSIM ordering remain disabled until existing launch gates pass.

## Immediate owner/provider actions

1. Request written wholesale proposals from Gigs, 1GLOBAL, and the AT&T wholesale/partner route.
2. Send the same requirements matrix to each provider so quotes are comparable.
3. Obtain actual plan SKUs, network names, wholesale pricing, hotspot rules, throttle speeds, minimum commitments, and API documentation.
4. Run provider economics against Lite, Unlimited, Max, and Business targets.
5. Reject any provider whose normal-use economics cannot sustain the retail plan.
6. Test eSIM activation, replacement, suspension, reactivation, usage reporting, hotspot, throttle behaviour, and cancellation in staging.
7. Only after validation, convert planning targets into approved public plans and enable checkout.