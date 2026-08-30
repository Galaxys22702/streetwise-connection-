# Streetwise Connection

Streetwise Connection is an early-stage cellular service brand and control plane being designed around affordable mobile service, strong account security, practical support, and smarter connectivity resilience.

Streetwise does not own towers or licensed radio spectrum. The commercially realistic launch path is an MVNO/MVNE or Telco-as-a-Service relationship with licensed network partners while Streetwise owns the customer experience, plan design, software, support workflow, security layer, and provider orchestration.

**Positioning:** Affordable cellular service without the usual confusion.

## Current launch state

- Public mode: waitlist only
- Commercial sales: disabled
- Customer registration/sign-in: built but disabled publicly
- Live Stripe billing: disabled
- Live eSIM/SIM ordering: disabled
- Voice/SMS service: planned, not enabled
- Phone numbers and number porting: planned, not enabled
- Multi-network/failover features: planned, not enabled
- Security suite: planned, not enabled
- Emergency connectivity reserve: planned, not enabled
- Production waitlist backend: Supabase
- Future customer/order/service database: PostgreSQL

The production deployment remains intentionally constrained. Visitors can join the waitlist, but no one can purchase cellular service, activate a line, port a number, or create a live paid subscription until provider, legal, regulatory, technical, support, and economics gates are complete.

See docs/PROJECT_STATUS.md for the current readiness snapshot and docs/OWNER_ACTIONS.md for owner/provider/regulator actions that cannot be completed safely in code.

## Product direction

Streetwise is now being prepared as a cellular/MVNO brand rather than a data-only eSIM storefront.

The planned service stack is:

1. Mobile data and hotspot access
2. Voice and SMS where supported by the selected wholesale provider
3. Local mobile number support and number portability where contractually available
4. Security-first account controls and SIM-swap protections
5. Scam/phishing and malicious-domain protection where technically and contractually supportable
6. A planned emergency-connectivity reserve, subject to provider plan mechanics
7. Network resilience and failover options where wholesale/network agreements permit them
8. International/travel connectivity without forcing the domestic product to behave like a travel eSIM
9. Residential and small-business multi-line support
10. Clear pricing, usage, throttling, hotspot, roaming, and support disclosures before purchase

None of the planned capabilities above should be advertised as live until they are mapped to an approved provider product and verified end to end.

## Target customer groups

### Residential

Simple cellular service with clear plan terms, compatibility guidance, activation help, practical support, and security-focused account controls.

### Commercial / small business

Multi-line cellular service for small teams, with deployment guidance, central line management, security controls, and support designed for businesses without a large internal IT team.

## Planning prices

These remain planning targets, not approved public offers:

- Streetwise Home — $25/month
- Business Starter — $20/month per line
- Business Volume — $15/month per line for 3+ lines
- Business Pro — $30/month per line

Final pricing must be validated against wholesale connectivity, voice/SMS/number costs, taxes and surcharges, fraud exposure, support burden, international usage, hotspot rules, and contribution margin.

## Provider strategy

### Primary domestic path: AT&T

AT&T is the primary U.S. domestic commercial evaluation path.

Streetwise is evaluating the correct AT&T route, including AT&T Partner Exchange and AT&T Wholesale. Current AT&T public materials show reseller/wholesale wireless voice, data, and messaging opportunities, but public material is not an approval for Streetwise.

The repository therefore treats AT&T as **commercially targeted but technically fail-closed**:

- internal provider candidate: att-wholesale
- public AT&T affiliation claim: disabled
- AT&T commercial-contract flag: false
- AT&T live-provisioning flag: false
- AT&T API endpoints/SKUs: intentionally undefined until supplied by AT&T
- AT&T credentials: secret-storage only after approval

Streetwise must not advertise itself as an AT&T reseller, AT&T MVNO, AT&T partner, or AT&T-powered service until the applicable rights are granted in writing.

See docs/ATT_PROVIDER_APPLICATION_PACKET.md for the prepared qualification transfer sheet.

### Domestic fallback: 1GLOBAL

1GLOBAL remains the full-stack fallback so Streetwise can compare AT&T's actual commercial/technical offer against another provider and avoid provider lock-in before launch.

### Travel/data path: eSIM Go

The existing eSIM Go integration remains useful for travel/short-duration data products and controlled technical testing. It no longer blocks domestic provider selection.

## Existing platform foundation

The repository already contains:

- Supabase-backed production waitlist
- Server-side waitlist validation and abuse controls
- PostgreSQL customer, subscription, payment, eSIM order, usage, business, and compliance foundations
- Customer authentication/session architecture
- Stripe test-mode integration foundations
- Provider abstraction layer
- Mock connectivity provider
- eSIM Go adapter and controlled diagnostics
- Read-only 1GLOBAL preparation
- Provider economics tooling
- Provider commercial-evidence gate
- Idempotency protections
- Provider webhook infrastructure
- Residential/commercial organisation and service-line models
- Production smoke checks and launch-readiness guardrails
- Nevada formation/licensing packet and regulatory working documents
- Draft privacy, terms, refund, and support documents

The existing data/eSIM work is not discarded. It becomes the connectivity-provisioning foundation underneath a broader cellular product.

## Architecture direction

Streetwise should remain provider-agnostic. The application should not hard-code its customer experience to one wholesale API.

The future provider capability boundary should be able to represent:

- data plans
- voice
- SMS
- mobile numbers
- number porting
- SIM/eSIM lifecycle
- Wi-Fi calling / VoLTE availability
- network/coverage metadata
- roaming/international service
- usage
- renewals/top-ups
- suspensions/reactivations
- SIM swaps
- provider events/webhooks

See docs/ARCHITECTURE.md.

## Safety model

Production must remain in waitlist mode until every applicable launch gate is complete.

Required safety posture:

PUBLIC_LAUNCH_MODE=waitlist  
STRIPE_LIVE_MODE_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false

Do not commit provider API keys, Stripe secrets, database passwords, Supabase service-role keys, SSNs/ITINs, identity documents, banking information, or private licence/provider paperwork.

## Commercial reality

Streetwise should compete on **affordability + security + resilience + clarity + support**, not price alone.

Contribution margin must include:

retail price  
minus wholesale network/data/voice/SMS/number cost  
minus payment fees  
minus telecom taxes/surcharges  
minus support and fraud reserve  
minus infrastructure/security tooling  
equals contribution margin

Do not promise unlimited data, unlimited hotspot, guaranteed network switching, emergency reserve, voice/SMS, a local number, Wi-Fi calling, international coverage, or specific security filtering until the selected provider and implemented system actually support the claim.

## Repository map

api/ — Vercel API entry points  
src/ — application/server code  
src/config/ — launch and product configuration  
src/providers/ — wholesale provider adapters  
db/migrations/ — PostgreSQL migrations  
scripts/ — verification, migration, economics, and smoke checks  
public/ — public waitlist experience  
docs/ — architecture, cellular strategy, provider, and technical documentation  
docs/business/ — formation, licensing, policy, and regulatory working documents  
.github/workflows/ — CI and provider/payment validation

## Verification

Run the repository verification suite before merging:

npm run verify

Run the deployed production smoke check with:

npm run check:production

The default payment and connectivity providers remain mocks during local development.

## Next concrete milestones

1. Obtain a written 1GLOBAL or equivalent full-cellular commercial offer for recurring U.S. service.
2. Confirm voice, SMS, local number, number-porting, Wi-Fi calling/VoLTE, domestic use, roaming, network, and support capabilities.
3. Resolve provider-of-record, Nevada PUCN, FCC/USAC, E911, taxes/surcharges, number-porting, and customer-disclosure responsibilities for the final model.
4. Map real wholesale products to the existing target pricing.
5. Validate contribution margin.
6. Expand the provider abstraction only after the selected provider's actual API/contract is known.
7. Run controlled staging provisioning and lifecycle tests.
8. Finalise customer policies and support procedures.
9. Enable live billing and live line activation only after all launch gates pass and the owner explicitly authorises launch.
