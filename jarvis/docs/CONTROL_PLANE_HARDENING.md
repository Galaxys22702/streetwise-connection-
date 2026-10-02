# Jarvis Control-Plane Hardening Plan

Status: active engineering plan

## Objective

Strengthen the Jarvis foundation before adding autonomous or multi-step behaviour. Jarvis must remain an explicit control plane between model intent and external capabilities.

## Work order

1. Harden request and security-boundary immutability.
   - Prevent caller mutation of request metadata/input from changing policy or execution state after validation.
   - Preserve compatibility with existing tool contracts.

2. Make policy configuration defensive.
   - Snapshot permission configuration at policy construction.
   - Keep approval decisions external to request-supplied flags.
   - Preserve fail-closed behaviour.

3. Introduce structured, bounded execution errors.
   - Keep raw provider/tool errors out of responses and audit events.
   - Return stable error codes and safe diagnostic metadata where available.
   - Never expose credentials or raw provider payloads.

4. Strengthen audit sanitisation.
   - Recursively redact credential-like fields.
   - Keep audit records useful for reconstruction without storing secrets.
   - Add tests for nested objects, arrays, mixed casing and circular structures.

5. Define memory boundaries.
   - Separate ordinary context from secret/sensitive operational data.
   - Do not permit memory to become an implicit credential store.
   - Document retention and access assumptions.

6. Add integration-level tests for the complete request path.
   - authorised read-only execution
   - denied capability
   - approval required/approved
   - production gate
   - input validation failure
   - result validation failure
   - bounded execution failure
   - audit redaction
   - execution-context isolation

7. Add a controlled workflow foundation only after the above passes.
   - explicit steps
   - approval checkpoints
   - dry-run support
   - idempotency keys
   - bounded retries
   - audit correlation

## Non-goals

Do not add unrestricted shell/browser access, automatic production changes, credential discovery, billing/provisioning authority, or bypasses around existing Streetwise security gates.

## Acceptance rule

No autonomous workflow layer should be treated as ready until policy, approval, validation, audit, and error boundaries are covered by tests and remain fail-closed under ambiguous conditions.
