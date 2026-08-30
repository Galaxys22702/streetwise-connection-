# Streetwise Connection — Owner Actions Only

This file contains work that cannot be completed safely by repository automation alone because it requires the legal owner, identity verification, signature, payment, regulator interaction, confidential account access, or provider approval.

## Business formation and licensing

- [ ] Confirm Streetwise Connection LLC name availability immediately before filing.
- [ ] File Nevada Articles of Organization.
- [ ] File the Nevada Initial List.
- [ ] Obtain the Nevada State Business Licence.
- [ ] Apply for the IRS EIN using the prepared worksheet.
- [ ] Complete required Nevada Department of Taxation registration.
- [ ] Confirm the exact local jurisdiction for the operating address.
- [ ] Obtain the applicable City of Las Vegas or Clark County business licence.
- [ ] Complete any required home-occupation approval.
- [ ] Sign and retain the final operating agreement outside the public repository.
- [ ] Open a business bank account and keep business and personal funds separate.

## Full-cellular provider commercial approval

- [ ] Obtain a written commercial offer from 1GLOBAL and/or another suitable full-stack cellular/MVNO/MVNE provider.
- [ ] Confirm the exact contractual role Streetwise would hold.
- [ ] Confirm recurring U.S. domestic-use rights.
- [ ] Confirm residential resale/use.
- [ ] Confirm commercial/small-business resale/use.
- [ ] Confirm supported U.S. networks.
- [ ] Confirm data allowance, throttling and hotspot/tethering.
- [ ] Confirm native voice.
- [ ] Confirm SMS.
- [ ] Confirm U.S. local phone numbers.
- [ ] Confirm number portability.
- [ ] Confirm 5G, VoLTE and Wi-Fi calling.
- [ ] Confirm eSIM and/or physical-SIM lifecycle.
- [ ] Confirm SIM swap/replacement and suspend/resume capability.
- [ ] Confirm roaming/international products.
- [ ] Confirm network selection/failover/resilience options, if any.
- [ ] Confirm security/fraud/port-out/SIM-swap events or controls.
- [ ] Confirm refunds, failed activations, SLA and support escalation.
- [ ] Confirm minimum funding, deposit, monthly spend or volume commitments.
- [ ] Confirm wholesale pricing and all per-number/per-message/per-minute/per-GB or other applicable charges.
- [ ] Confirm treatment of active lines and phone numbers if the provider relationship ends.

## Regulatory decisions / filings

- [ ] Resolve Streetwise/provider-of-record status.
- [ ] Resolve Nevada PUCN CMRS or other applicable state telecom registration.
- [ ] Resolve FCC FRN/Form 499/USAC responsibility.
- [ ] Resolve E911 responsibility for any voice/number service.
- [ ] Resolve number-assignment and number-portability responsibility.
- [ ] Resolve telecom taxes/surcharges and collection/remittance.
- [ ] Resolve customer disclosure requirements for underlying networks/carriers.
- [ ] Resolve any KYC/identity-verification obligations imposed by the provider or applicable law.
- [ ] Complete required filings before enabling live Nevada cellular service.

## Final controlled acceptance

Complete only after the formation, provider, regulatory and economic gates are sufficiently resolved:

- [ ] Authorise one controlled staging cellular activation.
- [ ] Verify subscriber/line persistence.
- [ ] Verify eSIM/SIM install and activation.
- [ ] Verify usage synchronisation.
- [ ] Verify idempotency, retries and failure handling.
- [ ] Verify suspend/resume if part of launch.
- [ ] Verify refund/reconciliation.
- [ ] If voice/numbering launches: test number assignment, inbound/outbound voice, SMS and required E911 workflow.
- [ ] Test SIM swap/replacement security workflow.
- [ ] Test number porting only with provider-approved controlled data.
- [ ] Approve final launch bundle mapping.
- [ ] Approve final customer Terms, Privacy, refund/cancellation, security and support policies.
- [ ] Configure live payment settlement to the business bank account.
- [ ] Explicitly approve the switch from waitlist-only mode to commercial service.

## Planning prices to validate, not promise

- Residential — Streetwise Home: $25/month
- Commercial — Business Starter: $20/month per line
- Commercial — Business Volume: $15/month per line for 3+ lines
- Commercial — Business Pro: $30/month per line

Do not approve public claims for unlimited data/hotspot, voice/SMS, phone numbers, porting, automatic network switching, emergency reserve, security filtering, 5G, VoLTE, Wi-Fi calling, roaming, or any specific carrier until each claim is supported by the selected provider contract and verified implementation.

## Safety rule

Until every applicable launch gate is complete:

PUBLIC_LAUNCH_MODE=waitlist  
STRIPE_LIVE_MODE_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false
