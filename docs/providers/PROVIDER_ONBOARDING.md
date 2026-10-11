# Streetwise Connection — AT&T-First Provider Onboarding Runbook

Last reviewed: 2026-08-30

Streetwise remains waitlist-only while AT&T commercial qualification, legal/regulatory allocation, pricing, API access and controlled technical acceptance are incomplete.

## Required safety state

PUBLIC_LAUNCH_MODE=waitlist  
PAYMENT_PROVIDER=mock  
STRIPE_LIVE_MODE_ENABLED=false  
ESIM_PROVIDER=mock  
ESIM_WEBHOOKS_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false  
ATT_COMMERCIAL_CONTRACT_APPROVED=false  
ATT_LIVE_PROVISIONING_ENABLED=false

AT&T credentials must never be committed to GitHub.

## Provider order

### Primary: AT&T

Evaluate both applicable AT&T routes:

1. AT&T Partner Exchange
2. AT&T Wholesale

The final program path must come from AT&T. The repo uses the internal provider ID att-wholesale as the commercial candidate name; that internal label does not claim Streetwise already has a wholesale or MVNO contract.

### Fallback: 1GLOBAL

Keep 1GLOBAL commercially active as the fallback until AT&T terms and technical access are fully accepted.

### Travel/data: eSIM Go

Keep eSIM Go for travel/short-duration data. It does not block domestic provider selection.

## Phase 1 — AT&T qualification packet

Prepare before submission:

- legal/company name;
- DBA;
- company website;
- business address;
- company phone;
- primary contact name/title/email/phone;
- total employee bracket;
- answer to whether Streetwise operates a 24/7/365 Tier 1 NOC;
- answer to whether Streetwise currently bills end users;
- FRN status;
- current AT&T contract/customer relationship status;
- business description;
- intended residential/commercial wireless resale model;
- support model;
- projected launch geography and scale.

The repo contains a prepared transfer sheet in docs/ATT_PROVIDER_APPLICATION_PACKET.md.

## Phase 2 — AT&T written commercial gate

Obtain written answers for:

- [ ] program/path accepted;
- [ ] exact contractual role;
- [ ] provider of record;
- [ ] recurring U.S. domestic service;
- [ ] residential resale;
- [ ] small-business/commercial resale;
- [ ] wireless voice;
- [ ] SMS;
- [ ] mobile data;
- [ ] hotspot/tethering;
- [ ] local U.S. phone numbers;
- [ ] number portability;
- [ ] eSIM and/or physical SIM;
- [ ] 5G;
- [ ] VoLTE;
- [ ] Wi-Fi calling;
- [ ] suspend/resume;
- [ ] SIM replacement/swap;
- [ ] port-out controls/events;
- [ ] roaming/international;
- [ ] exact network/product disclosure requirements;
- [ ] API access and authentication;
- [ ] sandbox/test environment;
- [ ] webhook/lifecycle events;
- [ ] Tier 1 support requirement;
- [ ] escalation/SLA;
- [ ] end-user billing responsibility;
- [ ] branding/co-branding rights;
- [ ] minimum spend/deposit/commitment;
- [ ] wholesale price schedule;
- [ ] refund/failed-activation rules;
- [ ] fraud/KYC responsibilities;
- [ ] taxes/surcharges;
- [ ] FRN/FCC/USAC responsibility;
- [ ] Nevada PUCN/state responsibility;
- [ ] E911 responsibility;
- [ ] number administration/porting responsibility;
- [ ] treatment of active lines/numbers on termination.

Do not enable AT&T credentials or code-path provisioning before this phase produces a contract-defined technical specification.

## Phase 3 — technical contract mapping

After AT&T supplies approved API/portal documentation:

| Streetwise capability | AT&T resource/API | Status |
| --- | --- | --- |
| Subscriber/customer | Pending contract | Blocked |
| Plan/product catalogue | Pending contract | Blocked |
| SIM/eSIM issue | Pending contract | Blocked |
| Line activation | Pending contract | Blocked |
| Usage | Pending contract | Blocked |
| Voice | Pending contract | Blocked |
| SMS | Pending contract | Blocked |
| Number assignment | Pending contract | Blocked |
| Porting | Pending contract | Blocked |
| Suspend/resume | Pending contract | Blocked |
| SIM swap/replacement | Pending contract | Blocked |
| Roaming | Pending contract | Blocked |
| Lifecycle events | Pending contract | Blocked |
| Fraud/security events | Pending contract | Blocked |

Do not invent URLs, payloads, SKU IDs or authentication schemes.

## Phase 4 — controlled AT&T staging

Only after written approval and technical mapping:

- [ ] store credentials in deployment secrets;
- [ ] set ATT_PARTNER_PATH to the approved path;
- [ ] set ATT_COMMERCIAL_CONTRACT_APPROVED=true only after evidence is recorded;
- [ ] keep ATT_LIVE_PROVISIONING_ENABLED=false;
- [ ] verify authentication without logging secrets;
- [ ] retrieve only approved test/catalogue resources;
- [ ] map one Streetwise test plan;
- [ ] run validation/sandbox checks;
- [ ] verify persistence and idempotency;
- [ ] verify lifecycle events;
- [ ] test one controlled line only when AT&T authorises it;
- [ ] verify voice/SMS/number/E911/porting if part of the launch scope;
- [ ] test SIM replacement and support escalation;
- [ ] set ATT_LIVE_PROVISIONING_ENABLED=true only for the explicitly authorised production phase.

## Phase 5 — fallback verification

Do not abandon 1GLOBAL until:

- AT&T contract is signed;
- AT&T technical access works;
- economics pass;
- staged lifecycle passes;
- launch responsibilities are resolved.

## Definition of coding complete

The code is considered pre-provider complete when:

- AT&T is the primary commercial candidate in configuration;
- AT&T live provisioning fails closed;
- commercial evidence requires AT&T-specific qualification facts;
- 1GLOBAL remains fallback;
- eSIM Go is optional/travel;
- tests prove missing contracts/credentials cannot accidentally enable AT&T;
- paperwork and signature templates are prepared;
- production sales remain disabled.

## Definition of commercial launch ready

Commercial launch requires external facts the repository cannot manufacture:

- accepted business entity/licences;
- accepted AT&T or fallback provider agreement;
- account-specific pricing;
- approved API/product access;
- regulatory allocation;
- controlled technical acceptance;
- final policies;
- owner authorisation.

Until then, waitlist mode stays on.
