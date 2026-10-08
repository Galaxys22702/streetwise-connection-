# Security and Support Runbooks

Last reviewed: **2026-09-15**

Status: **pre-launch operational baseline**. These procedures do not authorise commercial service or replace provider-specific procedures that must be supplied by the selected wholesale carrier.

## Operating rules

1. Keep production fail-closed while any launch gate is red.
2. Never place credentials, access tokens, identity documents, customer private data or confidential provider terms in public GitHub issues.
3. Record timestamps, affected account/service identifiers, actions taken and evidence needed for follow-up without copying unnecessary sensitive data.
4. Do not bypass authentication, payment, provider or regulatory controls to resolve a support ticket.
5. If an action requires a provider capability Streetwise does not yet have, stop and escalate rather than simulate a successful result.

## Severity model

| Severity | Examples | Initial action |
| --- | --- | --- |
| SEV-1 | suspected credential compromise, unauthorised SIM/number action, broad outage, payment/provider key exposure | contain immediately; disable affected live capability if necessary; owner/security escalation |
| SEV-2 | repeated activation failures, partial provider outage, suspected fraud on one or more accounts | restrict risky actions; preserve evidence; investigate and escalate |
| SEV-3 | isolated support failure with no security impact | normal support workflow and documented follow-up |

During waitlist-only operation, no incident should be treated as justification to enable live billing or provisioning.

## Secret rotation procedure

Use this whenever a production or provider secret is suspected exposed, intentionally rotated, or a privileged operator no longer requires access.

1. Identify the affected credential and every service that consumes it.
2. If compromise is suspected, revoke or disable the old credential first when doing so will not create a greater safety risk.
3. Generate the replacement only in the authorised provider/deployment secret store.
4. Never paste the secret into GitHub, chat logs, source files, screenshots or documentation.
5. Update the consuming deployment/environment.
6. Restart or redeploy only the components that require the new value.
7. Verify health using non-secret status checks; do not print the credential.
8. Revoke the superseded credential if overlap was temporarily required.
9. Record the rotation date, credential type, affected systems and verification result without recording the secret itself.
10. Review logs for suspicious use of the retired credential.

High-risk examples include Stripe secret/webhook keys, eSIM/provider credentials, database credentials, Supabase service-role keys and future AT&T/1GLOBAL credentials.

## Fraud escalation path

Triggers include suspicious account creation, repeated payment failures, abnormal provisioning attempts, identity/porting inconsistencies, suspected SIM-swap social engineering or unusual support requests for privileged changes.

1. Do not approve the risky action while evidence is incomplete.
2. Preserve relevant request IDs, timestamps, account IDs and provider/payment references.
3. Apply the least disruptive safe restriction available; never invent a provider suspension capability.
4. Escalate to the owner/security contact.
5. For provider/payment fraud, use the provider's authorised fraud/support channel once available.
6. Require stronger verification before restoring any privileged account/line action.
7. Document the disposition and any rule/control change that follows.

## Incident-response procedure

### Detect and classify

- Confirm what is affected: repository, deployment, database, payment path, provider integration, account/session layer or public waitlist.
- Assign SEV-1/2/3.
- Distinguish confirmed impact from suspicion.

### Contain

- Disable the narrowest affected live capability where a real capability exists.
- Revoke exposed credentials and sessions when applicable.
- Keep `PUBLIC_LAUNCH_MODE=waitlist`, `STRIPE_LIVE_MODE_ENABLED=false` and `ESIM_LIVE_ORDERS_ENABLED=false` unless a separately authorised future production state supersedes these values.

### Investigate

- Preserve logs and request identifiers.
- Identify first known occurrence, affected records and change/commit/deployment history.
- Do not modify evidence solely to make monitoring green.

### Recover

- Patch the root cause.
- Run `npm run verify` plus the relevant deployment/provider smoke checks.
- Restore capability only after verification and required owner/provider approval.

### Review

Record root cause, impact, containment, recovery, missing controls and follow-up owner. Never publish private customer/provider data in the incident record.

## Activation-failure runbook

This is a pre-launch template until the selected provider defines real activation states and support codes.

1. Confirm the customer/service request is authorised and that commercial activation is actually enabled. During waitlist-only operation, stop here: no activation should occur.
2. Confirm device compatibility and provider product/SKU mapping.
3. Check provider request/response reference, idempotency key and current order state.
4. Do not create a duplicate order merely because a response is delayed.
5. If the provider status is unknown or ambiguous, mark the case pending and escalate with the provider reference.
6. Never tell the customer activation succeeded until the provider and Streetwise state agree.
7. If payment occurred but activation did not, follow the billing/refund runbook and provider contract rules.

## Outage runbook

1. Determine whether the problem is Streetwise application infrastructure, database, payment processor, provider API or underlying mobile network.
2. Check health/status evidence and recent deployments before changing production.
3. For Streetwise software failure, roll forward with a verified fix or use an approved rollback path.
4. For provider/network failure, do not promise a network switch unless the contracted product actually supports it.
5. Publish only verified customer-facing facts; do not expose provider credentials/internal endpoints.
6. Track start time, affected capabilities, provider case/reference and recovery time.
7. After recovery, verify health and any queued/idempotent operations before closing the incident.

## Lost/stolen device and SIM replacement runbook

This remains provider-gated until Streetwise has contractual line/SIM replacement controls.

1. Authenticate the account holder using the approved recovery/identity process.
2. Treat requests to move a line/eSIM as high-risk account changes.
3. Do not issue a replacement or reveal install credentials through an unverified support channel.
4. Where supported, suspend the compromised credential/line before replacement.
5. Require explicit customer confirmation and record the provider reference.
6. Notify the customer through an existing trusted channel after the change.
7. If provider controls are unavailable, escalate; do not simulate a replacement in Streetwise state.

## Number-port failure runbook

Number portability is not currently enabled. Once contractually supported:

1. Verify the port request belongs to the authenticated customer.
2. Validate required provider fields without storing unnecessary identity data in public systems.
3. Capture the provider port request/reference and exact rejection/status code.
4. Never submit repeated ports blindly; correct the provider-reported cause first.
5. Do not cancel an existing working line until the provider's approved migration sequence permits it.
6. Escalate stalled or disputed ports through the provider's porting channel.
7. Confirm inbound/outbound voice/SMS service as applicable before marking complete.

## Billing dispute and refund runbook

1. Verify the customer/account and identify the exact payment, invoice or checkout reference.
2. Determine whether the charge was authorised, duplicated, failed, refunded already or linked to a failed service order.
3. Never issue an off-ledger cash workaround.
4. Follow the payment processor and final Terms/refund policy; during test/waitlist operation, no live customer charge should exist.
5. If service provisioning failed after a real future charge, preserve both payment and provider references before refund/cancellation.
6. Record refund amount, reason, processor reference and expected settlement timing without exposing payment credentials.
7. Escalate suspected payment fraud separately from ordinary service disputes.

## Provider escalation/contact matrix

Do not place private account credentials or confidential contacts in this public file. Store private contacts in an authorised private system when supplied.

| Area | Primary path | Evidence to provide |
| --- | --- | --- |
| AT&T qualification/commercial | official AT&T Partner Exchange/Wholesale contact supplied through onboarding | company identity, application/reference, requested capability; no invented account ID |
| 1GLOBAL commercial/API | authorised 1GLOBAL account/support channel once established | account/reference, affected API/product, timestamps |
| eSIM Go technical | authorised eSIM Go account/support channel | provider order/reference, bundle, timestamp, non-secret response/error |
| Stripe | authorised Stripe Dashboard/support | payment intent/checkout/refund reference; never secret key |
| Vercel | authorised project/support channel | deployment ID, commit SHA, route and timestamp |
| Supabase | authorised project/support channel | project/reference, failing operation and timestamp; never service-role key |

## Provider-specific controls still required

The following cannot be declared launch-ready from documentation alone:

- SIM-swap approval and alert mechanics
- port-out lock/PIN/protection mechanics
- carrier fraud/NOC escalation contacts and SLA
- E911 handling
- numbering/porting lifecycle
- provider suspension/reactivation semantics
- final refund/service-credit rules

These remain fail-closed until the selected provider contract/API and final customer policies are available.
