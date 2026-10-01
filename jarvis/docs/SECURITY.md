# Jarvis Security Model

## Security objectives

Jarvis must preserve the security controls already required by Streetwise Connection rather than creating a parallel path around them.

### Rules

1. Never commit API keys, passwords, tokens, private keys, database credentials, or service-role credentials.
2. Never expose secrets through model context unless a specific integration requires it and the exposure is authorised.
3. Treat tool input as untrusted.
4. Validate tool arguments at the boundary.
5. Apply least privilege to every tool.
6. Require explicit authorisation for consequential actions.
7. Keep production credentials separate from development and laboratory credentials.
8. Preserve the existing waitlist-only launch state until the documented Streetwise launch gates pass.
9. Never use Jarvis to bypass provider, billing, regulatory, security, or approval controls.
10. Record security-relevant actions in an auditable form without logging secret values.

## Risk tiers

### Tier 0: Read-only

Examples: health/status checks, documentation lookup, non-sensitive configuration inspection.

### Tier 1: Reversible changes

Examples: creating a development issue, updating non-production documentation, or changing a development setting.

### Tier 2: Operational changes

Examples: modifying production configuration or customer-impacting data.

These require explicit authorisation and additional verification.

### Tier 3: High-impact actions

Examples: billing, provisioning, credential changes, account recovery, deletion, or actions with significant financial/customer impact.

These should require explicit confirmation and a dedicated control path. They are not part of the initial foundation.

## Fail-closed behaviour

If identity, permission, required input, environment, or verification state is ambiguous, Jarvis should stop rather than guess.

Human convenience is not a security control. Sadly, this remains true despite centuries of experimentation.
