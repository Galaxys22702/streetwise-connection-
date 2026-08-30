# Streetwise Connection — Cellular Capability Roadmap

Last reviewed: 2026-08-30

This file separates the long-term product vision from what is actually enabled.

## Rule

A capability can be planned before it exists, but it cannot be sold, advertised as available, or enabled in production until:

1. the provider contract supports it;
2. the API/network/device path supports it;
3. the feature is implemented and tested;
4. economics are acceptable;
5. regulatory and customer-disclosure responsibilities are resolved;
6. the owner explicitly approves launch.

## Phase 0 — current production

Enabled:

- public waitlist
- waitlist privacy/consent
- production waitlist persistence
- health/status checks

Built but public-gated:

- customer accounts
- payment architecture
- eSIM/data provisioning foundation
- provider abstraction
- commercial evidence/economics tooling

Disabled:

- live billing
- live SIM/eSIM orders
- public customer accounts
- cellular line activation

## Current provider strategy

- Primary domestic commercial candidate: AT&T
- Domestic fallback: 1GLOBAL
- Travel/data path: eSIM Go
- Runtime order provider before approval: mock
- Public carrier-brand claim: disabled
- Live AT&T provisioning: disabled

The provider strategy may change if the written commercial evidence changes. The architecture remains provider-agnostic.

## Phase 1 — domestic cellular foundation

Target:

- recurring U.S. domestic service
- approved mobile-data plan
- hotspot where provider permits
- subscriber/service-line lifecycle
- SIM/eSIM provisioning
- usage retrieval
- suspend/resume
- support escalation
- clear network/data/hotspot disclosures

Provider decision and economics must pass before implementation is treated as launch-ready.

## Phase 2 — full phone service

Target where provider supports it:

- native voice
- SMS
- U.S. local mobile number
- number assignment
- number portability
- 5G
- VoLTE
- Wi-Fi calling
- required E911 address/lifecycle
- SIM replacement/swap
- port status and failure recovery

## Phase 3 — Streetwise security layer

Target:

- strong account authentication
- secure recovery
- SIM-swap approval/lock workflow
- SIM-swap alerts
- port-out protection
- line-change security events
- customer-visible security history
- fraud/support escalation
- malicious-domain/scam/phishing protection where technically and contractually supportable

Security claims must be specific. Do not use vague language such as "unhackable" or "fraud proof."

## Phase 4 — resilience

Target:

- provider/network eligibility model
- alternate network/profile options where available
- manual or automatic failover only if supported
- device capability validation
- outage/recovery workflow
- business multi-line resilience options

Do not promise automatic carrier switching until it is proven on supported devices and provider products.

## Phase 5 — emergency connectivity reserve

Goal:

Preserve limited essential connectivity after the ordinary high-speed allowance is exhausted.

Possible provider-dependent mechanisms:

- protected data bucket
- low-speed reserve
- secondary connectivity profile
- limited emergency top-up credit
- other provider-supported allowance policy

The exact implementation, allowed traffic, speed, duration, cost and customer disclosure must be defined and tested before launch.

## Phase 6 — international

Target:

- travel data
- roaming
- international add-ons
- same domestic identity/number while travelling where supported
- clear country/network pricing
- travel-specific provider routing without weakening the recurring U.S. domestic product

The existing eSIM Go integration may remain useful in this layer even if another provider powers the primary domestic cellular service.

## Product decision framework

Every proposed feature should be scored on:

- customer value
- provider availability
- implementation complexity
- security impact
- regulatory impact
- support burden
- fraud exposure
- unit economics
- competitive differentiation
- ability to explain the feature clearly

The objective is not to collect the largest feature list. It is to ship a small number of cellular capabilities that customers can trust.
