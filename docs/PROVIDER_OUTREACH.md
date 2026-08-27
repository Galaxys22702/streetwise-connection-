# Streetwise Connection - Provider Outreach

Last verified: 2026-08-27

This document contains the exact provider contact routes and copy-ready messages. The matched 30-question response schedule, decision gates and scorecard are in `docs/PROVIDER_DECISION_PACKET.md`.

Outreach does not authorise provider funding, checkout, payments or live eSIM orders.

## Sender and data rules

Send only from a Streetwise-controlled business address.

Required sender details:

- Name: Robert Tursi
- Organisation: Streetwise Connection
- Location: Las Vegas, Nevada, United States
- Business email: use the approved Streetwise-controlled address
- Business phone: use the approved Streetwise-controlled number where a form requires one

Do not send:

- API keys, client secrets or deployment settings;
- exact provider balance;
- full raw API responses;
- ICCIDs, customer data or government identifiers;
- banking or card details;
- confidential documents through a public GitHub issue.

Confidential provider replies and signed terms must be stored outside the public repository. Record only sanitised conclusions and evidence references in GitHub.

## What counts as an acceptable reply

A useful reply must:

1. identify the exact product and contracting entity;
2. answer the numbered questions in `docs/PROVIDER_DECISION_PACKET.md`;
3. distinguish contractual terms from non-binding marketing statements;
4. include or offer the requested commercial and legal schedules; and
5. come from, or be confirmed by, an authorised commercial representative.

A sales call alone does not close a decision gate. Ask for the conclusions in writing.

## eSIM Go

### Verified contact routes

Primary ticket route:

- https://help.esim-go.com/hc/en-gb/requests/new

Repository-recorded product contact:

- product@esim-go.com

Use the ticket route if the product mailbox rejects the message or if the account manager requests a ticket reference.

### Ticket/email subject

`Streetwise Connection: recurring U.S. domestic-use and reseller terms request`

### Copy-ready message

Hello eSIM Go team,

My name is Robert Tursi, founder of Streetwise Connection, an early-stage data-only eSIM service based in Las Vegas, Nevada.

Our eSIM Go technical evaluation is working. Our API credentials authenticate, our account can retrieve the U.S. catalogue, and a live-order-disabled validation request returned a $4 USD quote for `esim_3GB_30D_US_V2`. No top-up or live order was executed.

Our intended launch product is recurring U.S. service, not short-duration travel roaming. Your developer documentation currently states that travel eSIMs operate in roaming mode and that eSIM Go may restrict a SIM used in the same country for more than 60 days.

Before Streetwise funds the account or considers eSIM Go for commercial selection, please confirm in writing whether you can offer either:

1. a contractually binding exception permitting continuous same-country U.S. use beyond 60 days and repeated monthly renewals; or
2. a different wholesale product or profile designed for ongoing domestic U.S. service.

Please also provide written answers to the attached Streetwise provider questionnaire, especially the exact contracting product, Streetwise's commercial classification, provider-of-record allocation, U.S. network and fair-use rules, account-specific price and fee schedule, minimum funding or spend commitment, refund and support rules, tax/regulatory allocation, data/security terms, and the lowest-cost controlled proof-of-concept path.

Your public account guide currently describes a standard $1,000 minimum top-up, while noting that an account manager may change it. Please confirm the exact Streetwise minimum and whether test credit, a lower proof-of-concept top-up, or another non-production test arrangement is available. Your support material also states that there is no dedicated sandbox and suggests a separate UAT organisation, so please explain what that path would cost and what it can validate.

Streetwise remains waitlist-only. We will not enable checkout, payments or live eSIM orders until commercial, legal, technical and support gates are complete.

Thank you,

Robert Tursi  
Founder, Streetwise Connection  
Las Vegas, Nevada, United States

### eSIM Go response points

Ask eSIM Go to answer all 30 numbered questions in `docs/PROVIDER_DECISION_PACKET.md`. The decisive points are:

- continuous U.S. use beyond 60 days;
- repeated renewals on the same subscriber/eSIM;
- exact exception or domestic product language that will appear in the contract;
- exact account-specific top-up, deposit, expiry and refund terms;
- full U.S. SKU pricing, fees and included networks;
- provider-of-record, telecom, tax and customer-disclosure allocation;
- first-line support, escalation SLA and refund/credit remedies;
- separate UAT account or other low-cost proof-of-concept terms.

Do not treat a response such as "the bundle includes U.S. coverage" as permission for recurring domestic use.

## 1GLOBAL

### Verified contact routes

Sales enquiry:

- https://www.1global.com/contact/

Partnership enquiry and connectivity-reseller description:

- https://www.1global.com/partnerships

The official forms require a business email and phone number. Submit only after Streetwise-controlled contact details are available.

### Form values

| Field | Value |
| --- | --- |
| First name | Robert |
| Last name | Tursi |
| Company name | Streetwise Connection |
| Country | United States |
| Interest | Embedded Telco/API, Partnerships, or Connectivity Reseller, whichever exact option the form provides |
| Business email | Approved Streetwise-controlled address |
| Phone | Approved Streetwise-controlled number |

### Short contact-form message

Streetwise Connection is evaluating 1GLOBAL Connect for an initial recurring U.S. data-only eSIM service, with possible international expansion. We need server-to-server reseller/API access and explicit contractual permission for continuous same-country U.S. use beyond 60 days and repeated renewals, not only travel roaming. Please connect us with an authorised commercial representative who can provide U.S. product rights, wholesale pricing and minimums, sandbox credentials, network terms, support/refund duties, provider-of-record/regulatory allocation, and data/security terms. Streetwise remains waitlist-only and has not enabled payments or live eSIM orders.

### Full follow-up message

Subject: `Streetwise Connection: recurring U.S. reseller and Connect API request`

Hello 1GLOBAL team,

My name is Robert Tursi, founder of Streetwise Connection, an early-stage data-only eSIM service based in Las Vegas, Nevada.

We are evaluating 1GLOBAL Connect for an initial recurring U.S. launch with possible international expansion. Our planned integration is server-to-server, and our repository already has a read-only OAuth2/catalogue client prepared for partner credentials. It is not connected to live provisioning.

Our core requirement is continuous same-country U.S. service, not only short-duration travel roaming. Please identify the exact reseller product and contract schedule that would permit a subscriber to remain active in the United States beyond 60 days and through repeated monthly renewals without a permanent-roaming restriction that would make the product unsuitable for ongoing domestic use.

Please provide written answers to the attached Streetwise provider questionnaire. We specifically need account-specific U.S. wholesale pricing, commercial minimums, supported networks, product lifecycle and renewal behaviour, proof-of-concept or sandbox access, usage-data latency, events/webhooks, idempotency, order reconciliation, support and refund duties, provider-of-record and U.S. regulatory/tax allocation, and data/security terms.

Please distinguish contractually binding product terms from general platform capabilities and supply the proposed MSA, commercial schedule, product/coverage schedule, acceptable-use policy, support/refund schedule and DPA/security terms.

Streetwise remains waitlist-only. We will not enable checkout, payments or live eSIM orders until commercial, legal, technical and support gates are complete.

Thank you,

Robert Tursi  
Founder, Streetwise Connection  
Las Vegas, Nevada, United States

### 1GLOBAL response points

Ask 1GLOBAL to answer all 30 numbered questions in `docs/PROVIDER_DECISION_PACKET.md`. The decisive points are:

- exact recurring domestic U.S. product, not a generic Connect capability;
- continuous same-country rights beyond 60 days;
- subscriber/eSIM continuity through renewals;
- U.S. network, 4G/5G, throttling, tethering and fair-use terms;
- wholesale pricing, fees, deposits, minimums and contract term;
- provider-of-record, telecom, tax and disclosure allocation;
- sandbox or capped-cost proof of concept;
- support/refund remedies, operational SLA and data/security terms.

## Matched attachment text

Send the provider a copy of sections 5 and 6 from `docs/PROVIDER_DECISION_PACKET.md`, titled:

`Streetwise Connection Provider Questionnaire and Evidence Request - 2026-08-27`

Do not remove question numbers. Matching numbers are required for a defensible side-by-side comparison.

## Five-business-day follow-up

Subject: `Follow-up: Streetwise Connection U.S. provider terms request`

Hello,

I am following up on Streetwise Connection's request for written commercial and product terms for recurring U.S. data-only eSIM service.

The central gate is explicit permission for continuous same-country U.S. use beyond 60 days and repeated renewals. We also need the account-specific pricing, minimum commitments, network/product schedule, proof-of-concept route, support/refund allocation, provider-of-record/regulatory allocation and data/security terms listed in our questionnaire.

Please confirm the appropriate authorised commercial contact and expected response date. Streetwise will not fund an account or enable live orders while these items remain unresolved.

Thank you,

Robert Tursi  
Founder, Streetwise Connection

## Ten-business-day record

If a provider has not supplied substantive written evidence after ten business days, record:

`NO COMMERCIAL EVIDENCE RECEIVED - provider remains ineligible for selection; no approval inferred.`

Do not close the other provider path merely because one candidate replies first.

## Recordkeeping

For each outbound request, record privately:

- provider;
- route and recipient;
- sender address;
- date and local time;
- subject;
- ticket/reference number;
- follow-up due date;
- reply date;
- authorised respondent and role;
- confidential artefact location;
- sanitised GitHub conclusion.

Apply the decision gates only after the written evidence is complete.
