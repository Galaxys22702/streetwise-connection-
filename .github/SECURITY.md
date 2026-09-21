# Security Policy

## Supported surface

Streetwise Connection is currently pre-launch and public-waitlist-only. Live billing, live line activation, and live eSIM ordering are intentionally disabled.

## Reporting a vulnerability

Do not post credentials, private customer information, exploit payloads, or sensitive operational details in a public issue.

Repository owners should treat reports involving authentication, payment handling, provider credentials, waitlist data, deployment integrity, GitHub Actions, or production configuration as security-sensitive.

For now, use GitHub's private vulnerability reporting feature when available. If that feature is unavailable, contact the repository owner privately rather than opening a public issue with sensitive details.

## Repository security expectations

- Changes should reach `main` through pull requests.
- GitHub Actions must be pinned to full commit SHAs.
- Workflows should default to read-only permissions.
- Only explicitly approved maintenance/security workflows may receive `contents: write`.
- Credentialed workflows must not expose repository secrets to pull-request code.
- Production deployment provenance must be verified before build.
- Public launch controls remain fail-closed until provider, legal, regulatory, security, and operational gates are complete.

Native GitHub branch protection/rulesets remain the preferred enforcement mechanism when repository-administration access is available.
