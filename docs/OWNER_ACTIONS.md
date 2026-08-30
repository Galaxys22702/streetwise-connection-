# Streetwise Connection — Owner Actions Only

Last reviewed: 2026-08-30

Everything that can safely be prepared in code or public working documents should be completed before this list is handed to the owner.

## Business formation and private identity actions

- [ ] Confirm the legal name immediately before filing.
- [ ] Complete Nevada LLC filing, Initial List and State Business Licence.
- [ ] Provide registered-agent/address information privately.
- [ ] Obtain EIN after formation.
- [ ] Complete applicable Nevada tax registration.
- [ ] Confirm City of Las Vegas vs Clark County/other local jurisdiction and obtain the applicable local licence.
- [ ] Sign the operating agreement and store the executed copy privately.
- [ ] Open the business bank account.

## AT&T application / qualification

Use docs/ATT_PROVIDER_APPLICATION_PACKET.md and docs/business/AT&T-SIGNATURE-READY-PACKET.md.

Owner supplies privately or in the official AT&T form:

- [ ] final legal company name;
- [ ] business/registered address;
- [ ] company phone;
- [ ] primary contact phone/email/title;
- [ ] employee-count bracket;
- [ ] truthful current answer on 24/7/365 Tier 1 NOC capability;
- [ ] truthful current answer on whether Streetwise bills end users;
- [ ] FRN status;
- [ ] existing AT&T contract/customer relationship status;
- [ ] required electronic certifications/signature.

Then:

- [ ] submit the appropriate AT&T Partner Exchange/Wholesale inquiry or application;
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
