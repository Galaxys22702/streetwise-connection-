# Streetwise Connection — 90-Day Launch-Readiness Plan

Window: **2026-08-31 through 2026-11-30**

Target: reach a defensible go/no-go decision for commercial cellular launch by **2026-11-30** without bypassing provider, legal, regulatory, economics, security, support, or staging gates.

## Current checkpoint — 2026-09-15

Overall status: **RED / pre-launch**.

- Public waitlist only.
- Live Stripe billing remains disabled.
- Live SIM/eSIM ordering remains disabled.
- AT&T remains the primary domestic provider candidate, with 1GLOBAL as the fallback.
- The September 6 AT&T submission checkpoint passed without repository evidence of a completed submission.
- The September 13 Nevada formation target was missed. Nevada LLC formation remains incomplete.
- An official Nevada entity-search attempt on September 14 redirected to ORION sign-in and did not return an entity result; the legal name therefore remains unverified in the official state search.
- The September 20 fallback trigger remains active. If there is still no viable AT&T path, elevate 1GLOBAL to equal domestic priority.

No calendar date overrides a mandatory launch gate.

## Phase 1 — Foundation and provider qualification

### Aug 31–Sep 6

Goals:

- [x] establish the 90-day execution plan
- [x] prepare AT&T-first provider strategy and application materials
- [x] preserve 1GLOBAL fallback preparation
- [x] keep all production commercial gates fail-closed
- [ ] submit AT&T qualification/application inquiry or record the exact external blocker

Checkpoint: **2026-09-06** — missed; no submission evidence recorded in the repository.

### Sep 7–Sep 13

Goals:

- [x] maintain free formation preparation and signature-ready materials
- [x] confirm current official formation/licensing routes and costs in working documents
- [ ] complete a successful official Nevada entity-name search immediately before filing
- [ ] complete Nevada formation when funding and filing authority are available
- [ ] record every unfinished formation item with a specific external blocker

Checkpoint: **2026-09-13** — missed; formation remains incomplete.

### Sep 14–Sep 20

Goals:

- [x] attempt the official Nevada entity search; September 14 attempt redirected to ORION sign-in without an entity result
- [ ] complete the official entity search successfully before filing
- [ ] submit the free AT&T first-contact/qualification inquiry and record evidence
- [ ] keep the 1GLOBAL commercial path active in parallel
- [ ] review all launch blockers against current evidence

Hard trigger: **2026-09-20** — if no viable AT&T path is established, elevate 1GLOBAL to equal domestic priority.

## Phase 2 — Commercial and regulatory definition

### Sep 21–Sep 27

- [ ] obtain an AT&T program/path decision or explicit blocker report
- [ ] obtain equivalent 1GLOBAL commercial status if AT&T remains unresolved
- [ ] identify the most viable domestic-provider path using written evidence
- [ ] document provider-of-record responsibilities that are known and unknown

Checkpoint: **2026-09-27** — provisional provider decision or explicit blocker report.

### Sep 28–Oct 4

- [ ] obtain or document wholesale pricing/minimum commitments
- [ ] map candidate products to Streetwise target retail pricing
- [ ] calculate contribution margin including taxes/surcharges, support, fraud, payment and infrastructure reserve
- [ ] complete the first provider-of-record / FCC / USAC / Nevada PUCN / E911 responsibility map

Checkpoint: **2026-10-04** — commercial economics and responsibility map.

## Phase 3 — Contract-defined integration

### Oct 5–Oct 11

- [ ] freeze speculative provider integration work
- [ ] implement only contract/API-defined authentication, catalogue and capability mappings
- [ ] verify provider credentials without exposing secrets
- [ ] verify approved product mapping

Hard rule: **2026-10-11** — no speculative provider API code after this date.

### Oct 12–Oct 18

- [ ] controlled subscriber/service-line creation
- [ ] controlled SIM/eSIM provisioning
- [ ] activation lifecycle
- [ ] persistence and idempotency
- [ ] usage synchronisation
- [ ] retry/failure handling
- [ ] lifecycle events/webhooks

Checkpoint: **2026-10-18** — controlled staging lifecycle target.

### Oct 19–Nov 1

- [ ] strong account authentication and recovery
- [ ] SIM-swap and port-out protection workflow
- [ ] audit-event and privilege review
- [ ] secret-rotation procedure
- [ ] abuse/rate-limit review
- [ ] fraud escalation path
- [ ] incident-response procedure
- [ ] support and outage runbooks

Hard freeze: **2026-11-01** — non-essential feature freeze.

## Phase 4 — Customer readiness and pilot

### Nov 2–Nov 8

- [ ] finalise Privacy Policy
- [ ] finalise Terms of Service
- [ ] finalise Refund/Cancellation and Support policy
- [ ] publish accurate plan, data, throttling, hotspot, coverage, roaming, voice/SMS/number/porting/E911 disclosures as applicable
- [ ] ensure customer documents match the signed provider agreement and implemented product

Checkpoint: **2026-11-08** — customer policy adoption target.

### Nov 9–Nov 15

- [ ] complete controlled end-to-end staging
- [ ] test refunds/reconciliation
- [ ] test support escalation
- [ ] test voice/SMS/number/E911 only if in launch scope
- [ ] test provider-approved porting only if in launch scope
- [ ] complete a small non-public pilot if permitted by provider terms
- [ ] close every launch-blocking defect

Hard freeze: **2026-11-15** — launch-scope feature freeze and pilot target.

## Phase 5 — Final go/no-go

### Nov 16–Nov 30

Do not authorise public commercial launch unless every mandatory item is green:

- [ ] business formation/licensing
- [ ] active provider contract
- [ ] approved residential/commercial rights
- [ ] provider-of-record/regulatory allocation
- [ ] approved provider products and credentials
- [ ] acceptable contribution margin
- [ ] controlled staging/pilot evidence
- [ ] payment/refund acceptance
- [ ] final Terms/Privacy/Refund-Support disclosures
- [ ] security and incident readiness
- [ ] monitoring/backups/rollback
- [ ] support readiness
- [ ] production smoke test
- [ ] final owner launch authorisation

Decision date: **2026-11-30**.

If any mandatory gate remains red, production stays in waitlist mode and the blocker is recorded instead of forcing a launch.

## Permanent safety controls until launch approval

```text
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
ATT_COMMERCIAL_CONTRACT_APPROVED=false
ATT_LIVE_PROVISIONING_ENABLED=false
```

Do not claim AT&T, 1GLOBAL, or any other carrier partnership until written rights exist. Do not commit provider credentials, business identity documents, banking information, government identifiers, signatures, or private commercial terms to the public repository.
