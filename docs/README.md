# Streetwise Connection — Documentation Map

Last reviewed: **2026-09-25**

Use this file as the starting point for repository documentation. `launch/PROJECT_STATUS.md` is the current readiness source of truth; historical planning documents must not override newer evidence.

## Current status and execution

- [Project Status](./launch/PROJECT_STATUS.md) — current launch state, blockers, engineering health, and repository hygiene
- [90-Day Launch Plan](./launch/90_DAY_LAUNCH_PLAN.md) — execution schedule through the November 30 readiness decision
- [Owner Actions](./launch/OWNER_ACTIONS.md) — actions requiring the owner, provider, regulator, private credentials, or external portals
- [Security & Support Runbooks](./operations/SECURITY_SUPPORT_RUNBOOKS.md) — incident, fraud, outage, activation, refund, secret-rotation, and escalation procedures
- [Repository Maintenance](./operations/REPOSITORY_MAINTENANCE.md) — CI security, guarded merged-branch cleanup, and the main-branch protection ruleset

## Finance

Start with [Finance](./finance/README.md) for the financial control centre, including pricing, cost evidence, unit economics, launch capital and payment readiness.

## Architecture and product

- [Architecture](./operations/ARCHITECTURE.md) — provider-agnostic application and integration direction
- [Cellular Roadmap](./product/CELLULAR_ROADMAP.md) — cellular capability roadmap
- [Competitive Product Plan](./product/COMPETITIVE_PRODUCT_PLAN.md) — positioning and target product structure
- [Product Positioning](./product/PRODUCT_POSITIONING.md) — customer and market positioning
- [Open Network Technology](./operations/OPEN_NETWORK_TECHNOLOGY.md) — network-technology research and constraints
- [Customer Dashboard](./product/CUSTOMER_DASHBOARD.md) — planned customer experience
- [Accounts & Payments](./finance/ACCOUNTS_AND_PAYMENTS.md) — account/payment architecture
- [Financial Readiness](./finance/FINANCIAL_READINESS.md) — pricing, cost evidence, unit economics, reserves, and launch-capital gate

## Provider work

- [AT&T Provider Application Packet](./providers/ATT_PROVIDER_APPLICATION_PACKET.md) — qualification and transfer material
- [AT&T Finalisation Manifest](./providers/AT&T_FINALISATION_MANIFEST.md) — evidence needed before AT&T-specific production work can be finalised
- [Provider Comparison](./providers/PROVIDER_COMPARISON.md) — provider decision framework
- [Provider Outreach](./providers/PROVIDER_OUTREACH.md) — outreach material
- [Provider Onboarding](./providers/PROVIDER_ONBOARDING.md) — onboarding sequence and technical gates
- [Provider Economics](./finance/PROVIDER_ECONOMICS.md) — wholesale-to-retail economics framework
- [eSIM Provisioning](./operations/ESIM_PROVISIONING.md) — current provisioning foundation and constraints

## Platform readiness

- [Database Readiness](./launch/DATABASE_READINESS.md) — database/migration readiness
- [Connection Check](./launch/CONNECTION_CHECK.md) — connectivity/integration checks

## Business, legal, and regulatory

See [`business/README.md`](./business/README.md) for formation, licensing, provider-signature, customer-policy, regulatory, and brand/IP documents.

## Documentation rules

1. Treat `launch/PROJECT_STATUS.md` as the current readiness source of truth.
2. Do not mark provider, formation, regulatory, or customer-policy gates complete without evidence.
3. Keep executed contracts, government identifiers, credentials, bank information, identity documents, and signatures out of the public repository.
4. Do not claim live carrier affiliation or capabilities unless contractually approved and technically verified.
5. When a document becomes obsolete, either update it to point to its replacement or remove it after confirming nothing still depends on it.
