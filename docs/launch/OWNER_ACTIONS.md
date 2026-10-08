# Streetwise Connection — Owner Actions Only

Last reviewed: 2026-09-15

Everything that can safely be prepared in code or public working documents should be completed before this list is handed to the owner.

## Free actions now

- [x] Prepare AT&T Partner Exchange first-contact text and route
- [x] Verify current official AT&T Partner Exchange / Partner Solutions / Wholesale pages
- [ ] Submit the free AT&T Partner Exchange Request info form using truthful current pre-launch status
- [ ] Record submission date/reference and AT&T response in issue #25
- [x] Attempt the official Nevada entity search on 2026-09-14; the flow redirected to ORION sign-in and did not return an entity-search result
- [ ] Complete the official Nevada entity-name search successfully immediately before filing
- [ ] Continue free Nevada jurisdiction research and ready-to-file preparation

No paid tools, filing services, provider funding, or government filing payments are authorised at this stage.

## Business formation and private identity actions

- [ ] Confirm the legal name successfully in Nevada's official entity search immediately before filing.
- [ ] Complete Nevada LLC filing, Initial List and State Business Licence when funding is available and authorised.
- [ ] Provide registered-agent/address information privately.
- [ ] Obtain EIN after formation.
- [ ] Complete applicable Nevada tax registration.
- [ ] Confirm City of Las Vegas vs Clark County/other local jurisdiction and obtain the applicable local licence.
- [ ] Sign the operating agreement and store the executed copy privately.
- [ ] Open the business bank account.

Current formation status: **not filed**. Do not represent `Streetwise Connection LLC` as an existing Nevada entity until the state accepts the filing.

## AT&T application / qualification

Use `docs/ATT_PROVIDER_APPLICATION_PACKET.md`, `docs/business/ATT_FIRST_CONTACT.md`, and `docs/business/AT&T-SIGNATURE-READY-PACKET.md`.

For the free first-contact inquiry before Nevada formation, use the public/pre-formation company name **Streetwise Connection**. Do not represent `Streetwise Connection LLC` as an existing entity until Nevada accepts the filing.

Owner supplies privately or in the official AT&T form:

- [ ] first and last name;
- [ ] current contact email;
- [ ] current contact phone;
- [ ] final legal company name after formation, when applicable;
- [ ] business/registered address when requested;
- [ ] employee-count bracket;
- [ ] truthful current answer on 24/7/365 Tier 1 NOC capability;
- [ ] truthful current answer on whether Streetwise bills end users;
- [ ] FRN status;
- [ ] existing AT&T contract/customer relationship status;
- [ ] required electronic certifications/signature.

Then:

- [ ] submit the free AT&T Partner Exchange Request info inquiry;
- [ ] follow the AT&T-directed Partner Exchange / Wholesale / other qualification path;
- [ ] provide any documents AT&T requests through AT&T's secure process;
- [ ] obtain written program acceptance/commercial terms;
- [ ] obtain written branding/resale rights;
- [ ] obtain API/portal/test access if offered.

## AT&T contract decisions

Do not sign until the commercial packet answers:

- [ ] residential resale rights;
- [ ] small-business resale rights;
- [ ] recurring U.S. service;
- [ ] provider-of-record model;
- [ ] voice/SMS/data/hotspot;
- [ ] numbers/porting;
- [ ] SIM/eSIM;
- [ ] 5G/VoLTE/Wi-Fi calling;
- [ ] roaming;
- [ ] support/NOC/SLA obligations;
- [ ] billing/collections;
- [ ] pricing/minimum commitments;
- [ ] refunds/fraud;
- [ ] taxes/surcharges;
- [ ] FCC/USAC/FRN;
- [ ] Nevada PUCN/state duties;
- [ ] E911;
- [ ] number administration;
- [ ] termination/migration of active lines and numbers.

## Regulatory filings

Complete only those that the final provider-of-record model actually requires:

- [ ] Nevada PUCN/CMRS or related registration;
- [ ] FCC FRN;
- [ ] FCC Form 499/USAC;
- [ ] telecom tax/surcharge accounts;
- [ ] any E911/numbering-related filing or customer process.

## Controlled acceptance

After contract/API access:

- [ ] authorise one controlled staging cellular test;
- [ ] authorise one controlled voice/SMS/number test if those features launch;
- [ ] authorise controlled number-porting only with provider-approved test data;
- [ ] approve final mapped products and prices;
- [ ] approve final Terms, Privacy, Refund/Support and security disclosures;
- [ ] connect live payment settlement to the business bank;
- [ ] sign the internal launch authorisation.

## Planning prices

- Streetwise Home: $25/month
- Business Starter: $20/month per line
- Business Volume: $15/month per line for 3+ lines
- Business Pro: $30/month per line

These are targets only until AT&T or the selected fallback provider supplies viable wholesale economics.

## Production lock

Until the final internal launch authorisation is signed:

PUBLIC_LAUNCH_MODE=waitlist  
STRIPE_LIVE_MODE_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false  
ATT_COMMERCIAL_CONTRACT_APPROVED=false  
ATT_LIVE_PROVISIONING_ENABLED=false
