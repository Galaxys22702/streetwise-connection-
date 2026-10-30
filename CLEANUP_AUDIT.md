# CLEANUP AUDIT — streetwise-connection-
**Date:** 2026-10-30  
**Branch:** fix/cleavage-deep-clean-oct-2026  
**Protocol:** REPO CLEAVAGE PROTOCOL Phase 0 (Forensics)

## Repository Snapshot
- **Owner:** Galaxys22702
- **Default branch:** main @ 67b30de (Repair guarded JARVIS recovery and refresh Streetwise branding #128)
- **Language:** JavaScript (Node.js 24.x)
- **Stack:** Node.js + Vercel (serverless API routes), Postgres (pg), Stripe, custom frontend (static public/), Jarvis AI subsystem, eSIM/provider integrations, Facebook/Meta ops
- **File count (non-git, non-node_modules):** ~250+ source/docs/config files
- **Tests:** 224 tests, all passing (npm test)
- **TODOs/FIXMEs:** None found in source

## Open Pull Requests (as of audit)
- #131 (draft): chore(jarvis): evidence-driven capability improvements and deep audit
- #130: chore(deps): bump stripe from 23.0.0 to 23.0.1 (Dependabot)
- #129: chore(deps): bump actions/setup-node from 7.0.0 to 7.1.0 (Dependabot)
- Additional open PRs exist (total search returned many; focus on actionable)

## Known / Observed State
- Previous cleanup branches exist (chore/repository-cleanup-2026-10-10, cleanup/deep-audit-oct-2026, etc.)
- Heavy documentation under docs/ (business, finance, launch, operations, product)
- Jarvis subsystem under jarvis/ with its own structure, local server, tools, docs
- Public frontend: index.html, jarvis.html, store.html, account, analytics, etc.
- API: catch-all [...path].js, health, plans
- DB migrations: 001–008 covering accounts, eSIM, waitlist, segments, compliance, Meta
- Security headers solid in vercel.json (CSP, HSTS, etc.)
- No obvious security vulns in quick scan; tests cover rate limiting, auth, Stripe key handling, response sanitization

## Inventory Categories
### Core Runtime
- src/server.js, src/services/*, src/providers/*, src/config/*, api/*
- public/* (static assets + JS)
- scripts/* (start, migrate, checks, smoke)

### Subsystems
- jarvis/ (AI assistant, local investigator, commerce tools)
- lab/ (open5gs)
- infra/, moonfire/, tools/

### Docs & Ops
- Extensive markdown under docs/
- .github/workflows/ (CI, security, provider validation, Facebook ops, etc.)

### Potential Cleanup Targets (for later phases)
- Stale branches (dozens listed)
- Possibly redundant docs or draft business packets
- Dependabot PRs for minor bumps (safe to merge after review)
- Duplicate or unused workflow files if any

## Stats (Before)
- Tests: 224 pass / 0 fail
- Node: 24.x
- Dependencies: minimal (pg, stripe, @vercel/analytics)
- Open issues/PRs: multiple (exact count pending full list)

## Next Steps (Phase 1+)
- Merge safe Dependabot PRs
- Address any flaky or uncovered paths
- Remove unused files/branches where authorized
- Produce before/after coverage and proof of key flows (router/API + any store/"for sale" equivalent)

**Authorization acknowledged.** Bottom-to-top clean authorized. DO_NOT_TOUCH: NONE (unless later specified).
