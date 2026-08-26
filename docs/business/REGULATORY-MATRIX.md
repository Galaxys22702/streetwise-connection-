# Streetwise Connection — Regulatory Matrix

> Working launch matrix. Requirements can change and depend on the final wholesale/provider contract. Verify before filing or launching.

| Area | Trigger | Streetwise MVP status | Cost / timing note | Action |
|---|---|---|---|---|
| Nevada LLC | Operating as a Nevada LLC | Not yet filed | Standard formation fees currently total $425 | File only when funds are available |
| IRS EIN | LLC formed / business needs federal tax ID | Prepared | EIN itself is free | Submit through IRS after formation |
| Nevada Department of Taxation | Nevada business/tax activity | Pending | Sales-tax permit is $15/location when required | Determine tax accounts after EIN + state license |
| City of Las Vegas business license | Business location/activity inside City jurisdiction | Pending | City fees depend on final classification; home occupation may add a fee | Confirm exact classification before paying |
| PUCN CMRS license | Offering commercial mobile radio service in Nevada | Likely required for reseller launch | $200 annual license fee | File registration + fee before live Nevada service if applicable |
| FCC Registration Number (FRN) | Federal telecom filing/account needed | Contract-dependent | FRN registration itself is generally not the major cost item | Obtain if federal filing obligations apply |
| FCC Form 499 / USAC | Entity qualifies as telecommunications provider/reseller/contributor | Contract-dependent | Reporting/contribution obligations depend on service/revenue classification | Resolve provider-of-record status before launch |
| International Section 214 | Streetwise itself provides regulated U.S.-international common-carrier telecom service | Avoid in initial MVP unless required | Federal authorization process adds regulatory complexity | Keep initial model with licensed wholesale partner unless counsel confirms need |
| Spectrum license | Operating licensed radio spectrum directly | Not part of MVP | Not needed merely because Streetwise resells another carrier's service | Do not claim spectrum ownership |
| Local right-of-way / franchise | Installing telecom facilities in public streets/right-of-way | Not part of MVP | Avoided by software/eSIM reseller launch model | Reassess only if Streetwise later builds physical network infrastructure |
| Privacy / consumer terms | Collecting customer account, billing, device or usage data | Required before live customers | Drafting is free; legal review recommended | Adopt reviewed policy before launch |
| Payment compliance | Taking card payments | Pending | Stripe handles card processing infrastructure, but Streetwise still needs proper account/configuration and policies | Keep live charging disabled until business + webhook setup is complete |
| Security / breach response | Storing customer account data | Required | Internal documentation is free | Maintain incident-response process and secure production database |

## Provider-of-record questions for the wholesale eSIM vendor

Get written answers to these before enabling live orders:

1. Who is the telecommunications **provider of record** to the end customer?
2. Is Streetwise an agent, retailer, reseller, MVNO/MVNE customer, or another category under the contract?
3. Who holds the underlying carrier/spectrum authority?
4. Who is responsible for FCC Form 499/USAC reporting and contributions for the service sold through Streetwise?
5. Who handles E911 obligations, if any service feature triggers them?
6. Who handles lawful-intercept, sanctions, fraud, and telecom-abuse compliance?
7. Who is responsible for state telecommunications registrations, fees, and surcharges?
8. Which taxes/surcharges must Streetwise collect from end users?
9. Can Streetwise market the service under its own brand, and what carrier/network disclosures are required?
10. What countries may Streetwise legally sell into, and are there territorial restrictions?
11. Who owns the customer relationship and customer data?
12. What refund, failed-activation, replacement-eSIM, and chargeback obligations apply?
13. What SLA applies to activation and outage support?
14. What minimum purchase, deposit, reserve, or prepaid balance is required?
15. What happens to active customer eSIMs if the contract terminates?

## Initial launch position

For the lowest-cost compliant MVP, Streetwise should remain a software/customer-experience layer and reseller using licensed wholesale network partners. Avoid owning spectrum, building towers, installing right-of-way infrastructure, or representing Streetwise as a facilities-based carrier until the business deliberately chooses that much more regulated model.

## Official references

- Nevada PUCN CMRS: https://puc.nv.gov/Utilities/Telecommunications/CMRS/
- Nevada Secretary of State / SilverFlume: https://www.nvsilverflume.gov/
- Nevada Department of Taxation: https://tax.nv.gov/
- City of Las Vegas Business Licensing: https://www.lasvegasnevada.gov/Business/Business-License/Apply-For-A-Business-License
- FCC contributor / Form 499 information: https://www.fcc.gov/general/contributor-filings
