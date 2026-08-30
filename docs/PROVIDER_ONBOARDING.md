# Streetwise Connection — Cellular Provider Onboarding Runbook

This runbook tracks the external provider work required before Streetwise can move beyond public waitlist mode.

## Current safety state

Keep production waitlist-only until provider acceptance testing, economics, business compliance, customer-policy reconciliation, and payment testing are complete.

Required posture:

PUBLIC_LAUNCH_MODE=waitlist  
ESIM_PROVIDER=mock  
ESIM_WEBHOOKS_ENABLED=false  
ESIM_LIVE_ORDERS_ENABLED=false  
STRIPE_LIVE_MODE_ENABLED=false

Provider credentials must exist only in deployment secret storage.

## Provider priority

### Primary: 1GLOBAL or equivalent full-stack cellular provider

The cellular pivot requires more than data-only eSIM ordering.

Streetwise should request a commercial path that can support as much of the following as possible:

- recurring U.S. domestic cellular service
- residential and commercial resale
- data and hotspot
- voice
- SMS
- local phone numbers
- number porting
- eSIM and physical SIM options
- 5G
- VoLTE
- Wi-Fi calling
- SIM swap/replacement lifecycle
- suspend/resume
- roaming/international
- usage and lifecycle events
- fraud/security controls or events
- network/resilience options

### Secondary: eSIM Go

Keep the existing eSIM Go integration available for travel/short-duration data and controlled technical testing.

Do not treat its Travel API as the recurring U.S. cellular foundation unless eSIM Go supplies a written exception or a different qualifying product that resolves the documented same-country/permanent-roaming limitation.

## Phase 1 — commercial qualification

Before writing new provider-specific production code:

- [ ] Confirm Streetwise commercial role
- [ ] Confirm recurring U.S. domestic-use rights
- [ ] Confirm residential resale/use
- [ ] Confirm commercial resale/use
- [ ] Obtain account-specific wholesale pricing
- [ ] Confirm minimum deposit/funding/monthly/volume commitments
- [ ] Confirm supported U.S. networks
- [ ] Confirm data allowance/throttling
- [ ] Confirm hotspot/tethering
- [ ] Confirm voice
- [ ] Confirm SMS
- [ ] Confirm local number assignment
- [ ] Confirm number porting
- [ ] Confirm 5G
- [ ] Confirm VoLTE
- [ ] Confirm Wi-Fi calling
- [ ] Confirm eSIM/physical-SIM lifecycle
- [ ] Confirm suspend/resume and SIM-swap lifecycle
- [ ] Confirm international/roaming products
- [ ] Confirm provider webhook/event model
- [ ] Confirm sandbox/test environment
- [ ] Confirm provider-of-record allocation
- [ ] Confirm E911, numbering/porting, taxes, FCC/USAC, Nevada PUCN and other regulatory responsibility
- [ ] Confirm first-line/second-line support and SLA
- [ ] Confirm refund/credit/failed-activation rules
- [ ] Confirm treatment of active lines/numbers if the contract ends

Do not enable public checkout during this phase.

## Phase 2 — API capability map

Once the commercial offer is acceptable, map the provider's real API to the Streetwise capability model.

Record only non-secret conclusions in GitHub.

Required implementation map:

| Streetwise capability | Provider API/resource | Supported? | Notes |
| --- | --- | --- | --- |
| Subscriber creation | Pending | Pending | |
| SIM/eSIM provisioning | Pending | Pending | |
| Data plan activation | Pending | Pending | |
| Usage retrieval | Pending | Pending | |
| Voice | Pending | Pending | |
| SMS | Pending | Pending | |
| Number assignment | Pending | Pending | |
| Port eligibility | Pending | Pending | |
| Port request/status | Pending | Pending | |
| Suspend/resume | Pending | Pending | |
| SIM swap/replacement | Pending | Pending | |
| Roaming/international | Pending | Pending | |
| Lifecycle webhooks | Pending | Pending | |
| Security/fraud events | Pending | Pending | |
| Network/resilience options | Pending | Pending | |

Only implement supported capabilities.

## Phase 3 — controlled staging acceptance

After business/commercial/regulatory gates are sufficiently resolved:

- [ ] Configure staging credentials as deployment secrets
- [ ] Keep public launch mode on waitlist
- [ ] Verify provider status endpoint does not expose credentials
- [ ] Retrieve approved catalogue/products
- [ ] Validate one mapped plan
- [ ] Run one controlled staging activation
- [ ] Verify subscriber/service-line persistence
- [ ] Verify eSIM/SIM install/provisioning data
- [ ] Verify usage
- [ ] Verify idempotency
- [ ] Verify retry/failure paths
- [ ] Verify suspend/resume if supported
- [ ] Verify provider lifecycle webhooks
- [ ] Verify refund/reconciliation process
- [ ] Verify support escalation

If voice/numbering is part of the intended first launch:

- [ ] Assign one test number
- [ ] Verify outbound/inbound voice
- [ ] Verify SMS
- [ ] Verify E911/provider-required address flow
- [ ] Test porting only through a provider-approved controlled test process
- [ ] Test SIM swap/replacement workflow
- [ ] Test port-out/SIM-swap security controls where available

Disable any live-order switch again after controlled testing unless final commercial launch approval is complete.

## Phase 4 — security and resilience validation

Streetwise differentiators require their own acceptance criteria.

### Security

- [ ] Strong account authentication
- [ ] Secure recovery
- [ ] SIM-swap approval/alert workflow
- [ ] Port-out protection workflow
- [ ] Customer-visible line-change history
- [ ] Fraud/support escalation
- [ ] Scam/phishing/malicious-domain protection only if technically implemented and verified

### Resilience

- [ ] Document the actual networks available to each product
- [ ] Document whether network/profile switching is manual or automatic
- [ ] Verify supported device requirements
- [ ] Test failure/recovery behaviour
- [ ] Do not advertise automatic switching if the provider/device architecture does not support it

### Emergency connectivity reserve

- [ ] Identify provider-supported implementation
- [ ] Define exact allowance/speed/eligible use
- [ ] Verify depletion and reserve transition
- [ ] Verify billing behaviour
- [ ] Add customer disclosure
- [ ] Do not market the feature until the test passes

## Launch rule

Streetwise remains waitlist-only until:

- the selected provider contract is acceptable;
- recurring U.S. use and resale rights are written;
- first-launch capabilities are mapped to real provider products;
- economics pass;
- staging acceptance passes;
- regulatory responsibilities are resolved;
- customer terms/privacy/refund/support are reconciled;
- security/monitoring/incident procedures are ready;
- live billing and live activation receive explicit owner approval.
