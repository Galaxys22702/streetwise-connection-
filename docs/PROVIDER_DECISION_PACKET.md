# Streetwise Connection - Provider Decision and Outreach Packet

Status: pre-commercial diligence  
Evidence cut-off: 2026-08-27  
Decision owner: Streetwise Connection  
Public launch state: waitlist only

This packet turns the evidence in issue #25 into a controlled provider-selection process. It does not approve provider funding, checkout, payments, customer accounts, or live eSIM ordering.

## 1. Decision statement

Streetwise has **not selected a commercial provider**.

Current direction:

1. **1GLOBAL is the priority commercial diligence path** for the intended recurring U.S. data-only service because its published reseller and subscription model appears closer to Streetwise's target product.
2. **eSIM Go remains the technically proven conditional backup** for short-duration or travel use, or for recurring U.S. use only if an authorised provider representative supplies a written contractual exception or a different domestic product.
3. **Do not make eSIM Go's standard $1,000 top-up merely to obtain a green validation result.**
4. Keep all public and transaction controls disabled until a candidate passes every mandatory gate and a separately approved controlled test plan exists.

This is a provisional direction, not a supplier award.

## 2. Non-negotiable safety state

These values must remain unchanged throughout provider outreach and commercial comparison:

```env
PUBLIC_LAUNCH_MODE=waitlist
PAYMENT_PROVIDER=mock
STRIPE_LIVE_MODE_ENABLED=false
ESIM_PROVIDER=mock
ESIM_WEBHOOKS_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Provider credentials and confidential price lists belong in approved secret or private document storage, never in GitHub issues, commits, screenshots, or public logs.

No outreach response, catalogue quote, provider demo, or successful validation may be treated as permission to change these controls.

## 3. Verified evidence baseline

Evidence labels used below:

- **Account-verified**: observed through a controlled Streetwise provider check.
- **Public-documentation**: stated in current provider material, but not yet contractually confirmed for Streetwise.
- **Prepared**: repository capability exists but has not been exercised with partner credentials.
- **Unknown**: written account-specific evidence is still required.

| Evidence item | eSIM Go | 1GLOBAL |
| --- | --- | --- |
| Authentication | **Account-verified:** stored API key authenticates | **Prepared:** OAuth2 client exists; no partner credentials |
| U.S. catalogue | **Account-verified:** 29 bundles exposed | **Unknown:** account-specific catalogue unavailable |
| Candidate economics | **Account-verified:** `esim_3GB_30D_US_V2` quoted at $4 USD | **Unknown:** no wholesale quote |
| Non-charging validation | Request reached provider; result `valid=false` because available provider balance did not cover the quote | **Unknown:** no sandbox or credentials |
| Live transaction | Not attempted; `ESIM_LIVE_ORDERS_ENABLED=false` enforced | Not possible; client is read-only and not wired to provisioning |
| Funding minimum | **Public-documentation:** standard $1,000 top-up; account-manager variation may be possible | **Unknown** |
| Recurring U.S. fit | **Blocked:** published travel terms describe roaming and possible same-country restriction after 60 days; written exception or different product required | **Unknown:** public reseller/subscription architecture is promising but does not prove domestic rights |
| Partner model | Reseller/travel integration evidence exists; exact Streetwise classification is unresolved | **Public-documentation:** reseller, data-only, subscription and lifecycle resources |
| Idempotency | Existing Streetwise adapter is contract-tested; final production behaviour still requires acceptance testing | **Public-documentation/prepared:** documented idempotency and read-only client |
| Support and provider-of-record obligations | First-line support appears to sit with the commercial partner; account-specific legal allocation unresolved | **Unknown** |

Source record:

- GitHub issue #25
- `docs/PROVIDER_COMPARISON.md`
- `docs/PROVIDER_ECONOMICS.md`
- `docs/PROVIDER_ONBOARDING.md`
- `docs/PROVIDER_OUTREACH.md`

## 4. Decision method

Provider selection uses two stages.

### Stage A: mandatory pass/fail gates

A provider cannot be selected if any gate is failed, blocked, or undocumented.

| Gate | Required written evidence | eSIM Go status | 1GLOBAL status |
| --- | --- | --- | --- |
| G1. Recurring domestic rights | Contract, order form, product schedule, or written confirmation from an authorised representative permitting continuous same-country U.S. use beyond 60 days and repeated renewals | **Blocked pending exception or different product** | **Unknown** |
| G2. Commercial and legal role | Streetwise classification, provider of record, end-customer contracting party, and allocation of U.S. telecom, tax, disclosure and reporting duties | **Unknown** | **Unknown** |
| G3. Final unit economics | Account-specific U.S. price list, currency, all provider fees, tax treatment, refund exposure, and a passing Streetwise economics run | **Partial:** $4 quote only | **Unknown** |
| G4. Acceptable cash commitment | Deposit, top-up, expiry, monthly minimum, volume commitment and exit terms acceptable under a separately approved budget | **Blocked for present test:** published $1,000 standard top-up is not approved | **Unknown** |
| G5. U.S. service specification | Permitted networks, coverage, 4G/5G, throttling, hotspot/tethering, APN, fair-use and permanent-roaming enforcement | **Unknown** | **Unknown** |
| G6. Support and remedies | First-line duties, escalation SLA, failed activation treatment, refunds, credits, outages and mis-provisioning remedies | **Unknown** | **Unknown** |
| G7. Safe proof of concept | Sandbox or one low-cost controlled test path without enabling public sales | **Partial:** validation works, but positive balance is required; public support material says there is no dedicated sandbox and suggests a separate UAT organisation | **Unknown** |
| G8. Operational controls | Ordering, idempotency, usage latency, webhooks/events, retries, reconciliation and incident escalation documented | **Partial** | **Partial from public docs only** |
| G9. Data and security terms | DPA/security terms, data roles, breach notification, retention, sub-processors and any data-residency constraints reviewed | **Unknown** | **Unknown** |

#### Gate thresholds

- G1 passes only with explicit wording covering continuous U.S. use beyond 60 days and repeated renewals. Silence or generic "U.S. coverage" does not pass.
- G3 passes only when the $10 plan has at least **30% contribution margin** after wholesale cost, payment fees, support, infrastructure, launch-specific tax/fee reserve, expected refunds and chargebacks. It must also remain contribution-positive after a **15% wholesale-cost stress test**.
- The analyser enforces those default thresholds through `STREETWISE_MIN_MARGIN_PERCENT=30` and `STREETWISE_WHOLESALE_STRESS_RATE=0.15`. A passing row is an economics result only.
- The existing **$6 wholesale guardrail** is an initial screen, not final approval.
- G4 requires a separate owner decision before any provider funding. This packet authorises **$0** of provider spend.
- G7 passes only after a written test plan identifies the exact SKU, maximum spend, operator, time window, rollback, evidence to capture and post-test disablement.
- "Unknown" scores as not passed. Verbal assurances do not close a gate.

### Stage B: weighted comparison

Only providers that pass every Stage A gate may be scored.

Score each criterion from 0 to 5 and calculate `rating / 5 * weight`. Unknown or undocumented claims receive 0.

| Criterion | Weight | Rating evidence |
| --- | ---: | --- |
| Final contribution economics | 30 | Account-specific price file and reproducible economics output |
| U.S. coverage and product fit | 20 | Product schedule, network list and usage rights |
| Cash commitment and contract flexibility | 15 | Deposit, minimums, term, termination and price-change terms |
| API and operational reliability | 15 | Sandbox evidence, idempotency, events, usage latency, retries and SLA |
| Support, refunds and service remedies | 10 | Written responsibility matrix and policy |
| Legal, regulatory and data clarity | 10 | Contract schedules and completed responsibility review |
| **Total** | **100** | |

Selection threshold:

- all Stage A gates passed;
- weighted score of at least **75/100**;
- final Streetwise legal/compliance review complete;
- no unresolved contradiction between public documentation and account-specific terms.

The 30% economics threshold, 15% stress rate and 75/100 comparison threshold are Streetwise internal approval rules. Change them only through an explicit reviewed revision, never to make a preferred provider appear to pass.

Tie-break order:

1. lower 12-month committed cash exposure;
2. stronger explicit U.S. domestic rights;
3. better risk-adjusted contribution margin;
4. stronger support/refund remedies;
5. lower engineering and operational complexity.

## 5. Matched provider questionnaire

Send the same numbered questions to both candidates so replies can be compared without interpretation drift.

### Product rights and commercial role

1. Identify the exact product, contract schedule and legal entity that would serve Streetwise.
2. Does that product permit continuous same-country use in the United States beyond 60 days?
3. Does it permit repeated monthly renewals or top-ups for the same subscriber/eSIM?
4. List every permanent-roaming, fair-use, network, duration, velocity or same-country restriction and explain how each is enforced.
5. State Streetwise's role: reseller, agent, MVNO customer, enterprise customer, or another classification.
6. State who is provider of record and who contracts with the end customer.
7. Allocate responsibility for U.S. telecom registrations, taxes, surcharges, emergency-service disclosures, lawful requests, consumer disclosures and reporting.

### Commercial terms and economics

8. Supply account-specific U.S. wholesale pricing by SKU, allowance, duration, currency and included network.
9. List all setup, platform, SIM/eSIM, activation, renewal, API, support, usage, overage, suspension and termination fees.
10. State every deposit, minimum top-up, monthly minimum, annual commitment, volume tier and credit requirement.
11. Explain whether prepaid funds expire, are refundable, or can be returned at contract termination.
12. State the price-change notice period and any foreign-exchange exposure.
13. Identify taxes or surcharges included in provider prices and those billed separately.
14. Offer the lowest-cost controlled proof-of-concept path and its maximum total cost.

### U.S. network and lifecycle

15. Identify the U.S. networks available for each proposed SKU and whether automatic network switching is supported.
16. State 4G/5G availability, throttling, hotspot/tethering, APN, traffic-management and device restrictions.
17. Explain activation, renewal, top-up, suspension, expiry, cancellation and reactivation behaviour.
18. State whether a subscriber can retain the same eSIM/ICCID across renewals and plan changes.

### API and operations

19. Provide sandbox/test credentials and identify any differences from production.
20. Document order idempotency, request limits, webhook/event delivery, signature verification, retries and reconciliation.
21. State typical and maximum usage-data latency and available usage/balance events.
22. Provide provisioning and activation SLAs, status definitions and incident escalation routes.
23. Explain how failed, duplicate, delayed or partially completed orders are detected and remedied.

### Support, refunds, security and contract

24. Allocate first-, second- and third-line support duties and supply response/resolution SLAs.
25. State refund or credit treatment for failed activation, unused service, partial use, mis-provisioning, outage and incompatible devices.
26. Supply the MSA/order form, product terms, acceptable-use/permanent-roaming policy, SLA, refund policy and support schedule.
27. Supply the data-processing and security terms, data-role allocation, retention, sub-processors and breach-notification commitment.
28. State the initial term, renewal, termination, suspension, insolvency and service-migration/portability provisions.
29. Identify which statements in the reply are contractually binding and how they will be incorporated into the signed agreement.
30. Name the authorised commercial and technical contacts responsible for the answers.

## 6. Evidence requested from each provider

Request these artefacts with the numbered answers:

- account-specific U.S. price list;
- proposed SKU/product schedule and coverage/network list;
- MSA, order form and commercial schedule;
- acceptable-use and permanent-roaming policy;
- support, SLA, refund and credit policy;
- sandbox/API onboarding instructions;
- webhook/event and usage-reporting specification;
- provider-of-record and regulatory responsibility matrix;
- tax/surcharge statement;
- DPA and security schedule;
- proof-of-concept proposal with a stated maximum cost.

Confidential documents must be stored outside the public repository. GitHub should contain only a sanitised conclusion and evidence reference.

## 7. Exact outreach sequence

1. Send each provider its dedicated draft in `docs/PROVIDER_OUTREACH.md` from a Streetwise-controlled business address.
2. Ask the provider to answer using the 30 question numbers above and attach the requested artefacts.
3. Record the send date and authorised recipient outside the public repository.
4. If no reply arrives after five business days, send one concise follow-up.
5. If no substantive reply arrives after ten business days, mark the candidate `NO COMMERCIAL EVIDENCE`. Do not infer approval.
6. Enter both replies into the response record below.
7. Apply Stage A gates. Do not score a provider that fails a gate.
8. Run sanitised account-specific pricing through `npm run analyse:provider`.
9. Record a provider decision in a separate reviewable change.
10. Prepare a controlled acceptance-test plan only after commercial selection and explicit spend approval.

## 8. Response record

Copy this table into the private provider diligence record for each candidate.

| Field | Value |
| --- | --- |
| Provider | |
| Exact product/SKU family | |
| Provider respondent and title | |
| Reply date | |
| Contractual evidence location | |
| Pricing effective/expiry date | |
| G1 domestic rights | PASS / FAIL / UNKNOWN |
| G2 commercial/legal role | PASS / FAIL / UNKNOWN |
| G3 economics | PASS / FAIL / UNKNOWN |
| G4 cash commitment | PASS / FAIL / UNKNOWN |
| G5 service specification | PASS / FAIL / UNKNOWN |
| G6 support/remedies | PASS / FAIL / UNKNOWN |
| G7 proof of concept | PASS / FAIL / UNKNOWN |
| G8 operations | PASS / FAIL / UNKNOWN |
| G9 data/security | PASS / FAIL / UNKNOWN |
| Eligible for scoring | YES / NO |
| Weighted score | /100 |
| 12-month committed cash exposure | |
| Exceptions or contradictions | |
| Reviewer/date | |

## 9. Remaining Streetwise commercial gates

Even after a provider passes the comparison, Streetwise must still complete these gates before public sales:

- [ ] Select a provider through the Stage A and Stage B record.
- [ ] Obtain final legal/compliance determination for Streetwise's provider-of-record and U.S. telecom role.
- [ ] Finalise launch taxes and surcharge treatment.
- [ ] Approve the exact retail SKU, price and customer disclosure set.
- [ ] Adopt customer terms, privacy, refund/cancellation and support procedures.
- [ ] Complete a separately approved single-eSIM staging purchase, provision, install, usage, retry and reconciliation test.
- [ ] Verify secure production sessions, anti-CSRF, rate limits, monitoring, backups, audit logs and incident procedures.
- [ ] Complete Stripe test-mode checkout, webhook, cancellation, failure, refund and reconciliation tests.
- [ ] Obtain an explicit launch approval record.

Until every applicable gate is complete:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

## 10. Current next action

Send the matched commercial questionnaires. Do not fund eSIM Go and do not enable a transaction path. The next decision can be made only from written, account-specific eSIM Go and 1GLOBAL responses.
