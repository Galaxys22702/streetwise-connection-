# Streetwise Connection — Owner Actions Only

This file intentionally contains only work that cannot be completed safely by repository automation alone because it requires the legal owner, identity verification, signature, payment, regulator interaction, confidential account access, or provider approval.

## Business formation and licensing

- [ ] Confirm Streetwise Connection LLC name availability immediately before filing.
- [ ] File Nevada Articles of Organization.
- [ ] File the Nevada Initial List.
- [ ] Obtain the Nevada State Business Licence.
- [ ] Apply for the IRS EIN using the prepared worksheet.
- [ ] Complete required Nevada Department of Taxation registration.
- [ ] Confirm the exact local jurisdiction for the operating address.
- [ ] Obtain the applicable City of Las Vegas or Clark County business licence.
- [ ] Complete any required home-occupation approval for the final address.
- [ ] Sign and retain the final operating agreement outside the public repository.
- [ ] Open a business bank account and keep business and personal funds separate.

## Provider commercial approval

- [ ] Complete business-account verification with the preferred wholesale provider.
- [ ] Obtain a written commercial offer from 1GLOBAL and/or another suitable provider for comparison.
- [ ] Obtain written confirmation that recurring U.S. domestic use is permitted for the intended Streetwise model.
- [ ] Obtain written confirmation that both residential and commercial resale/use are permitted.
- [ ] Confirm provider-of-record responsibilities.
- [ ] Confirm actual data allowances, throttling and hotspot rules for every proposed launch tier.
- [ ] Confirm refunds, cancellations, support escalation, SLA, fraud and failed-activation responsibilities.
- [ ] Confirm taxes, telecom surcharges and who collects/remits them.
- [ ] Approve provider funding only after the commercial comparison passes.

## Regulatory decisions / filings

- [ ] Resolve whether the final reseller model requires Nevada PUCN CMRS registration or another state telecom filing.
- [ ] Resolve whether Streetwise requires an FCC FRN, Form 499 registration or USAC contributions for the final provider-of-record model.
- [ ] Complete any required filings before enabling live Nevada service.

## Final controlled acceptance

Complete these only after formation, provider approval and regulatory responsibilities are sufficiently resolved:

- [ ] Authorise one controlled paid staging eSIM transaction.
- [ ] Verify install/QR delivery, persistence, idempotency, retries and usage synchronisation.
- [ ] Approve final launch bundle mapping for each sellable Streetwise plan.
- [ ] Approve final customer Terms, Privacy, refund/cancellation and support policies after provider reconciliation.
- [ ] Configure live payment settlement to the business bank account.
- [ ] Explicitly approve the production switch from waitlist-only mode to commercial service.

## Target pricing to validate, not yet promise

- Residential — Streetwise Home: **$25/month**
- Commercial — Business Starter: **$20/month per line**
- Commercial — Business Volume: **$15/month per line for 3+ lines**
- Commercial — Business Pro: **$30/month per line**

Do not approve public claims of unlimited data or unlimited hotspot unless the selected provider contract explicitly supports those claims for the relevant tier.

## Safety rule

Until every applicable launch gate is complete, production must remain:

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```
