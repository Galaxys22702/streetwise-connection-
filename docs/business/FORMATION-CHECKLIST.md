# Streetwise Connection — Business Formation Checklist

> Working compliance checklist. This is planning material, not a filing receipt or legal opinion.

## Current operating plan

- Business: Streetwise Connection
- Launch market: Las Vegas, Nevada
- Initial model: branded cellular/MVNO reseller or Telco-as-a-Service business using licensed wholesale network partners
- Ownership plan for formation: single-member Nevada LLC, with ownership changes documented separately if added later
- No towers, spectrum ownership, fiber construction, or public right-of-way infrastructure in the initial MVP

## Free work that can be completed before filing

- [x] Define business model and launch scope
- [x] Prepare formation checklist
- [x] Prepare EIN application worksheet
- [x] Prepare single-member operating agreement draft
- [x] Prepare regulatory/licensing matrix
- [x] Prepare privacy-policy draft
- [x] Prepare terms-of-service draft
- [x] Prepare AT&T free first-contact / qualification packet
- [ ] Submit AT&T Partner Exchange Request info inquiry using `Streetwise Connection` as the pre-formation business name and truthful current status
- [ ] Confirm Nevada entity-name availability immediately before filing
- [ ] Confirm exact local licensing jurisdiction and licensing category from the final operating address before paying a local fee
- [ ] Obtain written wholesale/provider terms identifying the provider of record and regulatory responsibilities

The AT&T first-contact inquiry may be made before Nevada LLC formation, but it must not represent `Streetwise Connection LLC` as an existing entity until Nevada accepts the filing. A preliminary inquiry is not AT&T approval, reseller authority, or carrier affiliation.

## Paid / government-gated filings

### 1. Nevada Secretary of State

Formation requires Nevada Articles of Organization, Initial List, and State Business License. Current standard Nevada LLC formation fees total $425 ($75 Articles + $150 Initial List + $200 State Business License). Do not treat this repository as proof of formation.

Official portal: https://www.nvsilverflume.gov/

### 2. IRS EIN

The EIN itself is free. Apply only through the IRS after the LLC is legally formed. The application requires responsible-party identity information that should never be stored in this public repository.

Official IRS page: https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number

### 3. Nevada Department of Taxation

After a state business license and EIN exist, determine required Nevada tax registrations. Nevada states that a sales-tax permit is $15 per location when required. Do not register for tax accounts that do not match actual taxable activity.

Official site: https://tax.nv.gov/

### 4. Local Nevada business licensing

Confirm the physical operating address and governing jurisdiction before filing. A mailing address containing `Las Vegas` does not necessarily mean the location is inside the City of Las Vegas; it may fall under North Las Vegas, Clark County, Henderson, or another jurisdiction. Complete state compliance first where the local authority requires it. Home-based operations may also require a home-occupation approval or permit.

City of Las Vegas reference: https://www.lasvegasnevada.gov/Business/Business-License/Apply-For-A-Business-License

### 5. Nevada PUCN — CMRS

If Streetwise offers commercial mobile radio service in Nevada, the PUCN may require CMRS licensing/registration depending on the final provider and contractual model. Resolve this from the signed provider-of-record allocation before filing unnecessary telecom registrations.

Official page: https://puc.nv.gov/Utilities/Telecommunications/CMRS/

### 6. FCC / USAC

Before filing federal telecom registrations, determine from the wholesale agreement whether Streetwise is itself the telecommunications provider/reseller for FCC Form 499 purposes or whether the wholesale partner remains the provider of record. FCC Form 499 instructions include wireless data and wireless service by resale among filer activities.

Official FCC Form 499 materials: https://www.fcc.gov/general/contributor-filings

## Launch gates

Streetwise should not accept real paid subscribers until all applicable items below are true:

- [ ] Legal entity is active and in good standing
- [ ] EIN issued
- [ ] Required Nevada tax registration complete
- [ ] Required local business license issued
- [ ] Required PUCN CMRS registration/license complete, if applicable
- [ ] FCC/USAC status analyzed and required registrations completed
- [ ] Wholesale/eSIM contract executed
- [ ] Production database connected and migrations verified
- [ ] Stripe account and webhooks verified in production
- [ ] Live eSIM ordering remains disabled until provider acceptance testing passes
- [ ] Privacy Policy and Terms of Service reviewed and adopted
- [ ] Refund/cancellation and customer-support procedures adopted
- [ ] Incident-response and breach-notification process documented

## Recordkeeping

Keep government filing confirmations, signed contracts, EIN confirmation, licenses, tax notices, and signed governance documents outside the public GitHub repository. Store only non-sensitive templates and compliance checklists here.
