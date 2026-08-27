# Post-Licensing Implementation Handoff

Purpose: make Streetwise Connection ready to move from waitlist-only to controlled commercial validation after the owner supplies signed/issued documents.

## Owner supplies

For each completed item, provide the non-sensitive facts and retain the original document privately:

- Nevada LLC accepted: legal name, Nevada Business ID, effective date
- Nevada State Business Licence: status, effective date, renewal/expiry date
- EIN: confirmation that issued (do not commit the number to this public repo)
- Nevada tax registration: account/permit type and status; sensitive identifiers remain private
- Local business licence/home occupation approval: jurisdiction, status, effective/renewal dates
- Provider agreement: provider name, contractual role, effective date, approved residential/commercial rights
- Regulatory determination: which party owns FCC/USAC/PUCN obligations
- Approved plan terms: provider bundle IDs, data limits, throttling, hotspot/tethering rules, wholesale cost

## Backend implementation sequence

1. Run all PostgreSQL migrations, including business/compliance schema.
2. Create/update business compliance records for each issued licence/registration.
3. Create/update provider commercial approval record.
4. Map provider bundles to planned Streetwise plans only after written approval.
5. Re-run provider economics at $15, $20, $25, and $30 retail targets.
6. Finalise customer-facing plan descriptions from verified provider terms.
7. Finalise Terms, Privacy, Refund/Support documents against the signed provider agreement.
8. Configure production secrets only in the deployment platform.
9. Run repository verification and production smoke checks.
10. Enable a single controlled paid staging transaction.
11. Validate purchase idempotency, provisioning, install details, usage sync, failure handling, refund/reconciliation, and support escalation.
12. Record test evidence.
13. Run launch-readiness gate.
14. Obtain owner launch authorisation.
15. Only then consider enabling live payment and eSIM-order switches.

## Required safety state before final authorisation

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

No signed licence or provider agreement automatically changes these flags.

## Definition of ready to implement

The repo is ready for post-licensing implementation when:

- database migrations exist for compliance, business organisations, lines, and provider approvals;
- pricing and product positioning match the current residential/commercial strategy;
- provider activation fails closed without commercial evidence;
- paperwork transfer sheets identify all owner/external inputs;
- sensitive identity data is excluded from public GitHub;
- production verification workflows pass.

## Definition of ready to launch

Ready to implement is not the same as ready to launch. Commercial launch additionally requires issued/active licences, an acceptable signed provider agreement, resolved regulatory responsibilities, validated unit economics, successful controlled payment/provisioning tests, final customer policies, production security/monitoring, and explicit owner authorisation.
