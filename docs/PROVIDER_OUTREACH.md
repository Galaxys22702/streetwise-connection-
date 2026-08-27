# Streetwise Connection — Provider Outreach

Use this document when opening provider conversations. Do not send secrets, banking details, government identifiers, or private contracts through GitHub.

## Core description

Streetwise Connection is building a data-only eSIM connectivity service and is evaluating wholesale/API providers for an initial recurring U.S. launch with possible international expansion. The public product remains waitlist-only while provider, pricing, compliance, support and payment acceptance work is completed.

## Questions that must be answered in writing

Ask every candidate provider:

1. Do you permit recurring or long-term same-country use in the United States, and are there permanent-roaming or fair-use limits?
2. Can the same subscriber remain continuously active in the U.S. beyond 60 days and across repeated monthly renewals?
3. What commercial role would Streetwise hold: reseller, agent, MVNO customer, or another category?
4. Who is provider of record to the end customer?
5. What are the minimum deposit, top-up, monthly spend or volume commitments?
6. Are account-specific wholesale prices available before funding?
7. Which U.S. networks are included and can network availability vary by bundle?
8. What data-only plans, durations, renewals and top-ups are available?
9. How quickly is usage data updated?
10. What refund/credit rules apply to failed, unused, partially used or mis-provisioned eSIMs?
11. What first-line customer support obligations fall on Streetwise?
12. What webhook/event and idempotency mechanisms are available?
13. Which telecom taxes, registrations, reporting or customer disclosures remain Streetwise's responsibility?
14. Is a sandbox/test environment available without a funded production balance?
15. Can one controlled low-cost test eSIM be purchased after validation?

## eSIM Go request

Subject: Streetwise Connection U.S. domestic-use exception and reseller review

Hello,

Streetwise Connection is evaluating eSIM Go for a data-only eSIM service. Our current technical integration is working: our API credentials authenticate, the U.S. catalogue is accessible, and we have completed a validation-only pricing check without enabling live ordering.

Our intended product is a recurring U.S. service rather than a short travel product. Your current developer documentation states that travel eSIMs operate in roaming mode and that eSIM Go reserves the right to restrict a SIM used in the same country for more than 60 days.

Before we fund the account, please confirm in writing whether eSIM Go can offer Streetwise either:

1. a contractual exception permitting continuous same-country U.S. use beyond 60 days and repeated renewals; or
2. another wholesale product/profile designed for long-term domestic U.S. service rather than travel roaming.

Please also confirm the applicable commercial classification, account-specific U.S. pricing, minimum funding requirement, first-line support obligations, refund/failed-activation rules, provider-of-record responsibilities, and any U.S. telecom/tax obligations that remain with Streetwise.

We will not enable customer sales or live eSIM orders until these terms are resolved.

Thank you,
Streetwise Connection

## 1GLOBAL Connect request

Subject: Streetwise Connection recurring U.S. reseller/API access request

Hello,

Streetwise Connection is evaluating 1GLOBAL Connect for a recurring data-only eSIM service. We are seeking reseller/API access for an initial U.S. launch with potential international expansion.

Our key requirement is **continuous same-country U.S. service**, not a short-duration travel-roaming product. Please confirm whether your reseller products permit a subscriber to remain active in the United States beyond 60 days and through repeated monthly renewals without a permanent-roaming restriction that would make the service unsuitable for ongoing domestic use.

We would also like information on partner onboarding, test or sandbox credentials, U.S. wholesale pricing, commercial minimums, supported U.S. networks, renewal/top-up behaviour, usage reporting, webhooks, idempotency, support responsibilities, refund terms, and provider-of-record/regulatory responsibilities.

Our software architecture is server-to-server and we are specifically interested in the Connect reseller model, data-only product catalogue, subscriber/subscription lifecycle APIs and any U.S.-specific product or contractual requirements.

Thank you,
Streetwise Connection

## Recordkeeping

Store provider replies and signed terms outside the public repository. In GitHub, record only non-confidential conclusions needed for engineering and launch decisions.
