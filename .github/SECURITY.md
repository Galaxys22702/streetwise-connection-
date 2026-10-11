# Security Policy

## Supported surface

Streetwise Connection is currently pre-launch and public-waitlist-only. Live billing, live line activation, and live eSIM ordering are intentionally disabled.

Repository changes should still assume that credentials, customer data, payment integrations, provider operations, deployment controls, and production configuration are security-sensitive.

## Reporting a vulnerability

Do not post credentials, private customer information, exploit payloads, or sensitive operational details in a public issue.

Use GitHub private vulnerability reporting when available. If it is unavailable, contact the repository owner privately rather than opening a public issue containing sensitive details.

When reporting, include:

- affected route or component
- reproduction steps
- expected versus observed behaviour
- impact assessment
- whether any real customer or provider data was accessed

Do not perform destructive testing against production systems.

## Never commit secrets

Do not commit:

- Stripe secret or webhook keys
- eSIM provider API keys or webhook secrets
- Supabase service-role keys
- database passwords or production connection strings
- session secrets or authentication tokens
- private customer data
- provider credentials or confidential commercial terms

Use deployment-platform secret storage for production values. Keep local environment files out of Git and use `.env.example` only for non-secret placeholders and safe defaults.

## Repository security expectations

- Changes should reach `main` through pull requests.
- GitHub Actions must be pinned to full commit SHAs.
- Workflows should default to read-only permissions.
- Only explicitly approved maintenance/security workflows may receive `contents: write`.
- Credentialed workflows must not expose repository secrets to pull-request code.
- Production deployment provenance must be verified before build.
- Required status checks must pass before `main` changes are merged.
- Force pushes and deletion of `main` must remain blocked.
- Public launch controls remain fail-closed until provider, legal, regulatory, security, and operational gates are complete.

Native GitHub rulesets are the enforcement source of truth. `.github/main-ruleset.json` documents the intended repository policy and is validated by the repository integrity check.

## Live-mode controls

Commercial operations must remain disabled until launch gates are complete.

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Changing a live-mode switch is a production-risk change and should be reviewed together with provider, billing, legal, regulatory, support, and operational readiness.

## Security requirements before commercial launch

Before enabling paid service, the project should have:

- secure HttpOnly browser sessions
- CSRF protection for state-changing browser requests
- broader application rate limiting and abuse controls
- cryptographic webhook verification for payment and provider callbacks
- immutable or tamper-resistant audit records for sensitive state changes
- least-privilege database and service credentials
- production monitoring and alerting
- tested backups and recovery procedures
- documented incident response
- data-retention and deletion rules
- dependency and vulnerability review in CI

## Verification

Run the repository verification suite before merging:

```bash
npm run verify
```

Review dependency updates before merging. Do not disable safety checks merely to obtain a passing build.
