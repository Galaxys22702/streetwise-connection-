# Contributing

## Development

Use Node.js 24.x and `npm ci` to install pinned dependencies.

1. Create a focused branch from current `main`.
2. Make a small, reviewable change without committing credentials, local `.env` files, generated output, or customer data.
3. Run `npm test` and `npm run verify` before opening a pull request.
4. Open a pull request targeting `main`; wait for required CI and deployment checks. Do not bypass branch protection.
5. Document any behavior, configuration, security, or deployment change.

## Repository organization

- `src/` and `api/`: application and serverless code
- `public/`: public site assets
- `jarvis/`: JARVIS source and documentation
- `scripts/`: verification and operational scripts
- `test/`: automated tests
- `docs/`: launch, product, finance, provider and operations documentation
- `.github/`: CI and repository automation

Preserve existing business and operational records. Use a pull request for moves or deletions, with a migration note when paths change.
