# Streetwise Connection — Documentation Map

Last reviewed: **2026-09-15**

Use this file as the starting point for repository documentation. `PROJECT_STATUS.md` is the current readiness source of truth; historical planning documents must not override newer evidence.

## Current status and execution

- [Project Status](./PROJECT_STATUS.md) — current launch state, blockers, engineering health, and repository hygiene
- [90-Day Launch Plan](./90_DAY_LAUNCH_PLAN.md) — execution schedule through the November 30 readiness decision
- [Owner Actions](./OWNER_ACTIONS.md) — actions requiring the owner, provider, regulator, private credentials, or external portals
- [Security & Support Runbooks](./SECURITY_SUPPORT_RUNBOOKS.md) — incident, fraud, outage, activation, refund, secret-rotation, and escalation procedures
- [Repository Maintenance](./REPOSITORY_MAINTENANCE.md) — CI security, guarded merged-branch cleanup, and the main-branch protection ruleset

## Architecture and product

- [Architecture](./ARCHITECTURE.md) — provider-agnostic application and integration direction
- [Cellular Roadmap](./CELLULAR_ROADMAP.md) — cellular capability roadmap
- [Competitive Product Plan](./COMPETITIVE_PRODUCT_PLAN.md) — positioning and target product structure
- [Product Positioning](./PRODUCT_POSITIONING.md) — customer and market positioning
- [Open Network Technology](./OPEN_NETWORK_TECHNOLOGY.md) — network-technology research and constraints
- [Customer Dashboard](./CUSTOMER_DASHBOARD.md) — planned customer experience
- [Accounts & Payments](./ACCOUNTS_AND_PAYMENTS.md) — account/payment architecture

## Provider work

- [AT&T Provider Application Packet](./ATT_PROVIDER_APPLICATION_PACKET.md) — qualification and transfer material
- [AT&T Finalisation Manifest](./AT&T_FINALISATION_MANIFEST.md) — evidence needed before AT&T-specific production work can be finalised
- [Provider Comparison](./PROVIDER_COMPARISON.md) — provider decision framework
- [Provider Outreach](./PROVIDER_OUTREACH.md) — outreach material
- [Provider Onboarding](./PROVIDER_ONBOARDING.md) — onboarding sequence and technical gates
- [Provider Economics](./PROVIDER_ECONOMICS.md) — wholesale-to-retail economics framework
- [eSIM Provisioning](./ESIM_PROVISIONING.md) — current provisioning foundation and constraints

## Platform readiness

- [Database Readiness](./DATABASE_READINESS.md) — database/migration readiness
- [Connection Check](./CONNECTION_CHECK.md) — connectivity/integration checks

## Business, legal, and regulatory

See [`business/README.md`](./business/README.md) for formation, licensing, provider-signature, customer-policy, regulatory, and brand/IP documents.

## Documentation rules

1. Treat `PROJECT_STATUS.md` as the current readiness source of truth.
2. Do not mark provider, formation, regulatory, or customer-policy gates complete without evidence.
3. Keep executed contracts, government identifiers, credentials, bank information, identity documents, and signatures out of the public repository.
4. Do not claim live carrier affiliation or capabilities unless contractually approved and technically verified.
5. When a document becomes obsolete, either update it to point to its replacement or remove it after confirming nothing still depends on it.
