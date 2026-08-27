# Security Policy

Streetwise Connection handles authentication, payment integration, and eSIM provisioning logic. Even while the public product is waitlist-only, repository changes should assume that credentials, customer data, and provider operations are sensitive.

## Never commit secrets

Do not commit any of the following to Git:

- Stripe secret or webhook keys
- eSIM provider API keys or webhook secrets
- Supabase service-role keys
- Database passwords or production connection strings
- Session secrets or authentication tokens
- Private customer data
- Provider credentials or confidential commercial terms

Use the deployment platform's secret-management system for production values. Keep `.env` files local and use `.env.example` only for non-secret placeholders and safe defaults.

## Live-mode controls

Commercial operations must remain disabled until launch gates are complete.

```env
PUBLIC_LAUNCH_MODE=waitlist
STRIPE_LIVE_MODE_ENABLED=false
ESIM_LIVE_ORDERS_ENABLED=false
```

Changing a live-mode switch should be treated as a production-risk change and reviewed together with provider, billing, legal, regulatory, and support readiness.

## Reporting a vulnerability

Do not post credentials, exploit details containing real customer data, or production secrets in a public GitHub issue.

For now, use the project's private owner/support contact for sensitive reports. A dedicated security-reporting address should be published before commercial launch.

When reporting, include:

- affected route/component
- reproduction steps
- expected versus observed behaviour
- impact assessment
- whether any real customer or provider data was accessed

Do not perform destructive testing against production systems.

## Security requirements before commercial launch

Before enabling paid service, the project should have:

- secure HttpOnly browser sessions
- CSRF protection for state-changing browser requests
- broader application rate limiting and abuse controls
- cryptographic webhook verification for payment/provider callbacks
- immutable or tamper-resistant audit records for sensitive state changes
- least-privilege database/service credentials
- production monitoring and alerting
- tested backups and recovery procedures
- documented incident response
- data-retention and deletion rules
- dependency and vulnerability review as part of CI

## Dependency and code review

Run the repository verification suite before merging:

```bash
npm run verify
```

Review dependency updates before merging them. Do not disable safety checks merely to obtain a passing build.
