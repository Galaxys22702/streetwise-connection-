# Streetwise Connection — Provider Comparison

Last reviewed: 2026-08-30

This document records the commercial provider strategy. It does not authorise live sales, payments, SIM/eSIM activation, phone-number assignment, number porting, or any public claim of AT&T affiliation.

## Current decision

1. **AT&T is the primary U.S. domestic commercial evaluation path.**
2. **1GLOBAL remains the full-stack fallback candidate.**
3. **eSIM Go remains a travel/data path and no longer blocks domestic provider selection.**
4. Runtime provisioning remains mock/eSIM Go only until a signed provider contract and real API specification are received.
5. Streetwise must not market itself as an AT&T reseller, AT&T MVNO, AT&T partner, or AT&T-powered service until AT&T grants the applicable rights in writing.

## AT&T — primary domestic candidate

Current official AT&T materials show two relevant paths.

### AT&T Partner Exchange

AT&T describes Partner Exchange as a reseller program in which the partner can control the customer lifecycle, own the end-to-end customer relationship, manage Tier 1 support, use co-branding, access APIs/custom resale tools, and resell a portfolio that includes wireless voice, data, and messaging.

Official source:

- https://www.business.att.com/industries/partner-solutions/att-partner-exchange.html

### AT&T Wholesale

AT&T Wholesale markets wireless voice, data, and messaging as part of its wholesale portfolio. Its current qualification form asks telecommunications providers for company/contact details and specifically asks about:

- total employee count;
- whether the company operates a 24/7/365 Tier 1 Network Operations Center;
- whether the company currently bills end users;
- whether the company has an FCC Registration Number (FRN).

Official sources:

- https://www.business.att.com/industries/wholesale.html
- https://partnerexchange.att.com/wholesalelead/s/

### What the public material does NOT prove

Public AT&T pages do not prove that Streetwise has:

- been accepted into Partner Exchange or Wholesale;
- received U.S. residential resale rights;
- received an MVNO agreement;
- received subscriber-provisioning APIs;
- received phone-number/porting APIs;
- received account-specific wholesale pricing;
- received an AT&T network/SIM/eSIM product mapping;
- received permission to use AT&T branding;
- received provider-of-record or regulatory allocations.

Those items remain contractual gates.

### AT&T evidence required before launch

Streetwise must obtain and record:

- approved partner route: Partner Exchange, Wholesale, both, or another AT&T route;
- written recurring U.S. domestic-use rights;
- written residential and commercial resale rights;
- exact provider-of-record model;
- supported wireless products and networks;
- data allowance/throttling/hotspot rules;
- voice and SMS;
- local-number and number-portability support;
- SIM/eSIM lifecycle;
- 5G, VoLTE and Wi-Fi calling;
- international/roaming;
- line suspension/reactivation and SIM replacement;
- fraud/SIM-swap/port-out controls or events;
- API documentation, authentication, sandbox/test process and lifecycle events;
- Tier 1 support obligations;
- end-user billing model;
- FRN requirement/status;
- branding/co-branding rights;
- account-specific wholesale prices and minimum commitments;
- refund/SLA/escalation rules;
- taxes/surcharges;
- FCC/USAC, E911, numbering/porting and Nevada responsibilities;
- termination treatment for active customers and phone numbers.

## 1GLOBAL — domestic fallback

1GLOBAL remains valuable because its public Telco-as-a-Service materials describe a broad cellular feature set including domestic mobile service, calls/texts/data, phone numbers, porting, SIM/eSIM, roaming, 5G, VoLTE and Wi-Fi calling.

Streetwise should keep the existing read-only 1GLOBAL preparation so the company has a real alternative if AT&T commercial terms, qualification requirements, economics or implementation access do not fit.

Fallback does not mean secondary quality. It means Streetwise avoids becoming commercially trapped by one upstream provider before signing a contract.

## eSIM Go — travel/data path

The existing eSIM Go integration remains useful for:

- travel data;
- short-duration eSIM products;
- controlled technical validation;
- future international add-ons.

Its travel product should not determine whether Streetwise is ready to choose a recurring U.S. domestic carrier path.

## Domestic comparison gate

The repository now requires complete commercial evidence for:

- att-wholesale
- 1global

eSIM Go evidence is recorded separately as optional/travel evidence.

The comparison remains fail-closed if AT&T or 1GLOBAL commercial facts are unknown.

## Launch rule

Before a domestic provider can be selected for activation:

- public launch mode must remain waitlist;
- checkout must remain disabled;
- payments must remain disabled;
- live provider orders must remain disabled;
- provider commercial evidence must be complete;
- legal approval must be recorded;
- credentials/API access must be verified;
- catalogue/product mapping must be verified;
- controlled validation must pass;
- staging lifecycle testing must pass.

AT&T is the primary target, not a public affiliation claim.
