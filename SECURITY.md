# Security policy

## Reporting a vulnerability

Please do not publish exploits, credentials, tokens, personal information, or security-sensitive details in a public issue.

Use GitHub's private vulnerability reporting feature if enabled for this repository. Otherwise contact the repository owner through a private, previously established channel. Do not send secrets through public discussions.

## Security expectations

- Never commit API keys, passwords, session cookies, private keys, production `.env` files, or real customer records.
- Keep authentication and authorization enforced on the server; do not rely on a hidden button or client-side checks.
- Keep `main` protected and require passing checks before merging.
- Review dependency updates and third-party scripts for security and privacy effects.
- Apply least privilege to GitHub, Vercel, Stripe, databases, and JARVIS connectors.
- Treat external actions as requiring explicit authorization, logging, and verification.
- Rotate and revoke any credential accidentally exposed; deleting a commit alone does not invalidate it.

## Supported versions

Security fixes are targeted at the current `main` branch. Older branches are not maintained releases.
