# Jarvis Security Model

## Security objectives

Jarvis must preserve the security controls already required by Streetwise Connection rather than creating a parallel path around them.

### Rules

1. Never commit API keys, passwords, tokens, private keys, database credentials, or service-role credentials.
2. Treat all request input and request metadata as untrusted.
3. Validate tool input before execution and validate tool output before returning it when a validator is defined.
4. Apply least privilege to every tool.
5. Consequential actions require approval from a trusted approval boundary. A request cannot authorise itself merely by setting an `approved` flag.
6. Keep production credentials separate from development and laboratory credentials.
7. Preserve the existing waitlist-only launch state until the documented Streetwise launch gates pass.
8. Never use Jarvis to bypass provider, billing, regulatory, security, or approval controls.
9. Record security-relevant actions without storing credential-like values, including nested credential fields.
10. Fail closed when identity, permissions, environment, validation, or approval verification is ambiguous or unavailable.

## Risk tiers

### Tier 0: Read-only

Examples: health/status checks, documentation lookup, non-sensitive configuration inspection.

### Tier 1: Reversible changes

Examples: creating a development issue, updating non-production documentation, or changing a development setting.

These require trusted approval by default.

### Tier 2: Operational changes

Examples: modifying production configuration or customer-impacting data.

These require trusted approval and additional verification.

### Tier 3: High-impact actions

Examples: billing, provisioning, credential changes, account recovery, deletion, or actions with significant financial/customer impact.

These require a dedicated control path with explicit confirmation and stronger verification. They are not part of the initial foundation.

## Approval boundary

The Jarvis policy layer accepts an `approvalVerifier` supplied by the integration boundary. The verifier is responsible for deciding whether an approval is authentic, current, scoped to the requested capability, and bound to the intended actor/environment.

Jarvis does not treat a boolean supplied by the request as proof of approval.

## Tool boundary

Tools may define `validateInput` and `validateResult` functions. Validation happens inside Jarvis immediately before execution and immediately after execution, respectively. A failed validator prevents the operation from being treated as successful.

## Audit boundary

Audit events are recursively sanitised for common credential-like field names. Secret values must never be supplied to audit events in the first place. Audit records should contain identifiers, outcomes, and safe metadata rather than credentials or raw provider responses.

## Fail-closed behaviour

If identity, permission, required input, environment, or verification state is ambiguous, Jarvis should stop rather than guess.

Human convenience is not a security control. Sadly, this remains true despite centuries of experimentation.
