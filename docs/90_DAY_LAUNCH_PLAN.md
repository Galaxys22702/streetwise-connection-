# Streetwise Connection — 90-Day Launch-Readiness Plan

Start: 2026-08-31  
Target readiness date: 2026-11-30  
Goal: Make Streetwise technically, operationally, commercially, and compliance-ready for a controlled cellular launch, while keeping public sales disabled until every mandatory external approval is complete.

## Definition of success on 2026-11-30

Streetwise is considered launch-ready only when all mandatory gates below are complete:

- legal entity, state business licence, EIN, and applicable local licensing are complete;
- AT&T or the approved fallback provider has supplied written commercial rights;
- provider-of-record and regulatory responsibilities are documented;
- approved wholesale products are mapped to Streetwise plans;
- contribution margin is acceptable;
- provider API/portal credentials are configured securely;
- subscriber/line/SIM/eSIM lifecycle has passed controlled staging;
- voice/SMS/number/porting/E911 workflows have passed if included in launch scope;
- payments and refunds have passed controlled testing;
- customer Terms, Privacy, Refund/Support, and material plan disclosures are final;
- fraud, SIM-swap, port-out, account-recovery, incident, and support procedures are ready;
- monitoring, backups, audit logging, and rollback procedures pass;
- final production launch authorisation is signed.

If provider or regulator approval is still pending on November 30, the software/operations target remains complete but public commercial launch stays locked. No calendar date overrides a failed launch gate.

## Non-negotiable production lock during the 90 days

PUBLIC_LAUNCH_MODE=waitlist  
STRIPE_LIVE_MODE_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false  
ATT_COMMERCIAL_CONTRACT_APPROVED=false until written approval exists  
ATT_LIVE_PROVISIONING_ENABLED=false until controlled acceptance is complete

## Phase 1 — Formation + provider qualification
### August 31 to September 20

### Week 1: August 31 to September 6

Owner/external:
- submit or complete Nevada LLC formation package;
- complete Initial List and State Business Licence;
- submit AT&T qualification/application using the prepared packet;
- confirm truthful AT&T qualification answers: employee count, NOC status, end-user billing status, FRN status, and current AT&T relationship.

Repository:
- keep AT&T primary, 1GLOBAL fallback, eSIM Go travel/data;
- maintain the provider evidence gate;
- keep all production commerce locked;
- establish this 90-day roadmap as the project source of truth.

Exit condition:
- formation is submitted or the exact filing blocker is documented;
- AT&T request is submitted or the exact submission blocker is documented.

### Week 2: September 7 to September 13

Owner/external:
- obtain EIN after entity acceptance;
- determine local licence jurisdiction;
- start applicable local/tax registration;
- follow up with AT&T if acknowledgement has not arrived.

Repository / operations:
- document Tier 1 support model;
- document current NOC capability truthfully;
- prepare escalation/contact matrix;
- define subscriber support categories: activation, billing, voice/SMS, number/porting, SIM swap, outage, security, refund.

Exit condition:
- business identity package is materially complete;
- AT&T qualification status is known;
- support responsibility model is drafted.

### Week 3: September 14 to September 20

Provider:
- obtain AT&T programme/path decision if possible;
- request written commercial scope, pricing, minimums, support obligations, branding rights, API/portal access, and regulatory allocation;
- keep 1GLOBAL fallback active in parallel.

Hard fallback trigger:
- If AT&T has not provided a viable qualification/commercial path by **September 20**, treat 1GLOBAL as an equal domestic candidate and push the fallback process immediately. AT&T remains preferred but no longer controls the schedule.

Exit condition:
- provider decision evidence is recorded;
- unknown provider facts are explicit rather than assumed.

## Phase 2 — Commercial selection + contract-defined integration
### September 21 to October 18

### Week 4: September 21 to September 27

Commercial:
- compare AT&T and 1GLOBAL using written/account-specific evidence;
- resolve recurring U.S. use;
- resolve residential/commercial resale;
- resolve provider-of-record;
- resolve network/product scope;
- resolve voice/SMS/numbers/porting/SIM/eSIM capability;
- resolve support, refunds, fraud, taxes, minimums, and termination treatment.

Exit condition:
- one provider is provisionally selected or both remain explicitly blocked with written reasons.

### Week 5: September 28 to October 4

Economics:
- import or record approved wholesale product pricing;
- run contribution-margin analysis at $15, $20, $25, and $30 retail targets;
- map viable wholesale products to Streetwise Home and Business tiers;
- reject any tier with unclear wholesale cost, tax treatment, or unacceptable margin.

Exit condition:
- provisional launch plans and economics are documented;
- pricing remains non-public until provider and legal gates pass.

### Week 6: October 5 to October 11

Engineering:
- implement only the selected provider's documented API/portal contract;
- configure authentication in secret storage;
- implement catalogue/product mapping;
- implement subscriber/service-line lifecycle;
- implement SIM/eSIM provisioning;
- implement usage retrieval;
- implement lifecycle events/webhooks if provided;
- keep live provisioning disabled.

Exit condition:
- provider authentication and read-only/test catalogue access pass without exposing secrets.

### Week 7: October 12 to October 18

Engineering acceptance:
- controlled subscriber creation;
- controlled SIM/eSIM issue/activation path;
- persistence and idempotency;
- usage synchronisation;
- suspend/resume if supported;
- retry and failure handling;
- provider webhook/event verification;
- refund/reconciliation path.

If first launch includes full phone service:
- test number assignment;
- voice;
- SMS;
- E911 workflow;
- provider-approved number porting;
- SIM replacement/swap.

Exit condition:
- controlled staging lifecycle either passes or has a bounded blocker list.

## Phase 3 — Security, support, policy, and pilot
### October 19 to November 15

### Week 8: October 19 to October 25

Security:
- strong authentication;
- secure recovery;
- SIM-swap approval/alert workflow;
- port-out protection;
- audit events;
- privilege review;
- secret rotation procedure;
- abuse/rate limits;
- fraud escalation;
- incident response.

Exit condition:
- security checklist passes for launch scope.

### Week 9: October 26 to November 1

Operations:
- support runbooks;
- provider escalation paths;
- outage handling;
- activation-failure runbook;
- lost/stolen-device handling;
- SIM replacement;
- number-port failure;
- billing dispute/refund;
- security incident escalation;
- service termination/migration procedure.

Exit condition:
- one operator can follow the runbooks without relying on undocumented knowledge.

### Week 10: November 2 to November 8

Customer/legal:
- reconcile Terms to signed provider contract;
- reconcile Privacy to actual production data flows;
- reconcile Refund/Support to provider rules;
- prepare actual plan disclosures;
- prepare network/coverage limitations;
- prepare data/throttling/hotspot/roaming disclosures;
- prepare number/porting and E911 disclosures if applicable;
- confirm telecom tax/surcharge treatment.

Exit condition:
- customer-facing policy package is final pending only signatures/publication.

### Week 11: November 9 to November 15

Controlled pilot:
- run a small non-public test cohort permitted by provider terms;
- verify activation;
- verify usage;
- verify billing in controlled mode;
- verify support;
- verify refund/reconciliation;
- verify security alerts;
- verify cancellation/suspension;
- collect defects and close critical ones.

Exit condition:
- no unresolved launch-blocking defect.

## Phase 4 — Launch decision
### November 16 to November 30

### Week 12: November 16 to November 22

Production hardening:
- full CI green;
- Docker/Vercel production build green;
- database migration rehearsal;
- backup/restore test;
- monitoring/alert test;
- secret/config audit;
- security regression;
- rate-limit/abuse test;
- rollback rehearsal;
- production smoke test.

Exit condition:
- technical launch-readiness report is green.

### Final week: November 23 to November 30

Commercial go/no-go:
- verify all licences and registrations;
- verify active provider contract;
- verify provider/API credentials;
- verify provider product mapping;
- verify pricing/margin;
- verify legal/customer documents;
- verify banking/payment settlement;
- verify support staffing/process;
- verify regulatory evidence;
- verify controlled pilot evidence;
- sign internal production launch authorisation.

Target decision date: **November 30, 2026**.

## Schedule protection / fallback rules

- September 20: AT&T response/path fallback trigger.
- October 1: if no domestic provider is commercially viable, executive focus moves to closing a fallback provider rather than building speculative provider code.
- October 11: no undocumented provider API implementation. Missing docs are a provider blocker, not permission to guess.
- November 1: freeze non-essential product features. Security, compliance, support, provider integration, payments, and reliability take priority.
- November 15: feature freeze for launch scope. Only blocker fixes after this date.
- November 30: no launch if any mandatory gate is red.

## Features that are NOT required for the first launch

These may remain post-launch unless the provider supplies them cheaply and safely:

- automatic multi-carrier failover;
- emergency connectivity reserve;
- advanced scam/phishing network filtering;
- elaborate international bundles;
- sophisticated business admin UI;
- every planned security enhancement.

The first launch should prove a reliable core cellular service rather than attempt to ship the entire telecom industry in one quarter.

## Weekly review scorecard

Every Sunday update:

- Formation/licensing: red / amber / green
- AT&T/provider: red / amber / green
- Regulatory: red / amber / green
- Economics/pricing: red / amber / green
- Provider integration: red / amber / green
- Payments: red / amber / green
- Security: red / amber / green
- Customer policies: red / amber / green
- Support/operations: red / amber / green
- Pilot/testing: red / amber / green

Any red workstream gets priority the following week.

## Current status at plan creation

Green:
- public waitlist;
- CI/testing foundation;
- Docker/Vercel compatibility;
- database/account/payment architecture;
- provider abstraction;
- AT&T-first fail-closed strategy;
- AT&T application/signature packets;
- 1GLOBAL fallback preparation;
- eSIM Go travel/data integration;
- business/compliance working documents.

Amber:
- Nevada/business formation completion;
- AT&T qualification;
- provider commercial terms;
- regulatory allocation;
- production customer database deployment;
- final provider plan economics.

Red / intentionally blocked:
- live billing;
- live cellular activation;
- AT&T live provisioning;
- voice/SMS/numbering production;
- public checkout.

## Principle

The target is **launch readiness by November 30, 2026**, not reckless activation by November 30, 2026. The date drives execution. The gates decide whether customers are allowed in.
