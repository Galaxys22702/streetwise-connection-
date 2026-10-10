# Branch audit — October 10, 2026

Scope: all 50 branches in Galaxys22702/streetwise-connection- at the start of this audit. Baseline main: `1d145a527a3104495d56ae303ca42ec19cc28364`.

Ahead/behind counts reflect Git ancestry; squash-merged branches can still appear diverged. Previous PR outcomes and current file contents were used to avoid reintroducing stale changes. Historical branches are retained; no branch history is deleted by this consolidation.

## Consolidation

- Correct the expired approval test using a shared mocked Date rather than moving expiry to 2099; reject malformed expiry timestamps.
- Restore complete JARVIS CI coverage.
- Carry forward PR #105's safe DOM construction.
- Combine the intent of PRs #107 and #108 into one pinned security-scanning workflow.
- Bring the local AI prototype, investigator workspace, and PR #106 Money Mode into `jarvis/local/`, away from production public assets. Remove neither existing production behavior nor business records.
- Do not import obsolete public serverless chat endpoints or claim external connector execution.

## Inventory

| Branch | Ahead / behind | Disposition |
|---|---:|---|
| `main` | 0 / 0 | Protected production baseline; merge only through required checks. |
| `Galaxys22702-patch-1` | 0 / 24 | Already contained in main; retain historical branch. |
| `business/compliance-foundation-check` | 9 / 247 | Old compliance drafts; current docs/business remains authoritative. Preserve branch. |
| `business-ideas-foundation` | 3 / 14 | Previously closed without merge (#82); preserve history. Superseded or rejected work is not reactivated. |
| `business-model-v1` | 14 / 14 | Previously closed without merge (#80); preserve history. Superseded or rejected work is not reactivated. |
| `chore/isolate-jarvis-ci` | 1 / 10 | Previously merged via #89; do not re-merge old ancestry. |
| `chore/repository-cleanup-2026-10-10` | 3 / 0 | Consolidate safe DOM fix; replace dated test workaround with deterministic clock. |
| `chore/repository-deep-clean-2026-09-25` | 1 / 15 | Previously closed without merge (#78); preserve history. Superseded or rejected work is not reactivated. |
| `chore/repository-hygiene-2026-10-09` | 2 / 1 | Previously merged via #104; do not re-merge old ancestry. |
| `chore/site-polish-2026-10-03` | 3 / 12 | Previously closed without merge (#86); preserve history. Superseded or rejected work is not reactivated. |
| `cleanup/consolidate-production-smoke` | 2 / 237 | Old smoke-check cleanup; main already uses consolidated production-smoke-check.js. |
| `cleanup/remove-duplicate-smoke-check` | 1 / 236 | Old smoke-check cleanup; main already uses consolidated production-smoke-check.js. |
| `docs/master-bread-under-streetwise` | 1 / 13 | Previously merged via #87; do not re-merge old ancestry. |
| `docs/provider-decision-packet-2026-08-27` | 5 / 196 | Outdated provider/economics proposal; newer launch/provider documents supersede it. |
| `feat/add-bubblav-widget` | 8 / 9 | Previously closed without merge (#90); preserve history. Superseded or rejected work is not reactivated. |
| `feature/facebook-auto-posting` | 54 / 24 | Previously closed without merge (#65); preserve history. Superseded or rejected work is not reactivated. |
| `feature/facebook-auto-posting-v2` | 59 / 24 | Older Facebook iteration; later implementation already integrated. Preserve branch. |
| `feature/facebook-auto-posting-v3` | 62 / 24 | Previously merged via #66; do not re-merge old ancestry. |
| `feature/jarvis-money-mode-20261010` | 2 / 0 | Consolidate planner under jarvis/local; supersedes draft #106. |
| `feature/meta-facebook-oauth` | 57 / 24 | Previously merged via #64; do not re-merge old ancestry. |
| `feature/plan-package-details-2026-09-21` | 0 / 28 | Already contained in main; retain historical branch. |
| `fix/accessibility-current-main-2026-10-08` | 2 / 7 | Previously merged via #94; do not re-merge old ancestry. |
| `fix/bubblav-csp-2026-10-08` | 1 / 7 | Previously closed without merge (#95); preserve history. Superseded or rejected work is not reactivated. |
| `fix/bubblav-csp-current-main-2026-10-08` | 1 / 6 | Previously merged via #96; do not re-merge old ancestry. |
| `fix/dependency-updates-2026-10-08` | 2 / 8 | Previously merged via #93; do not re-merge old ancestry. |
| `fix/documentation-reorg-current-main-2026-10-08` | 48 / 6 | Previously closed without merge (#98); preserve history. Superseded or rejected work is not reactivated. |
| `fix/documentation-reorg-current-main-v2-2026-10-08` | 1 / 4 | Previously merged via #100; do not re-merge old ancestry. |
| `fix/jarvis-controlled-operations-current-main-2026-10-08` | 19 / 6 | Previously closed without merge (#97); preserve history. Superseded or rejected work is not reactivated. |
| `fix/jarvis-controlled-operations-current-main-v2-2026-10-08` | 4 / 4 | Previously closed without merge (#101); preserve history. Superseded or rejected work is not reactivated. |
| `fix/jarvis-controlled-operations-current-main-v3-2026-10-08` | 1 / 3 | Previously merged via #102; do not re-merge old ancestry. |
| `fix/jarvis-safe-deployment-20261010` | 21 / 0 | Consolidate reviewed local UI, launcher and investigator; replace server with bounded local-only implementation. |
| `fix/master-bread-current-main-2026-10-08` | 1 / 2 | Previously merged via #103; do not re-merge old ancestry. |
| `fix/restore-main-ci-2026-10-07` | 0 / 9 | Already contained in main; retain historical branch. |
| `fix/security-tighten-csp-2026-10-08` | 1 / 5 | Previously merged via #99; do not re-merge old ancestry. |
| `fix/vercel-provenance-403` | 2 / 12 | Previously merged via #88; do not re-merge old ancestry. |
| `jarvis/control-plane-hardening` | 57 / 14 | Foundation already integrated; retain remaining design document as historical proposal, not an implementation. |
| `jarvis/foundation` | 56 / 14 | Previously closed without merge (#81); preserve history. Superseded or rejected work is not reactivated. |
| `jarvis/hub-hardening-2026-10-02` | 39 / 13 | Previously closed without merge (#85); preserve history. Superseded or rejected work is not reactivated. |
| `jarvis/structured-errors-ci-2026-10-02` | 10 / 11 | Previously merged via #84; do not re-merge old ancestry. |
| `jarvis-ai-mvp-20261010` | 16 / 0 | Consolidate reviewed local UI, launcher and investigator; replace server with bounded local-only implementation. |
| `maintenance/sync-main-ruleset-2026-09-21` | 20 / 24 | Previously closed without merge (#59); preserve history. Superseded or rejected work is not reactivated. |
| `ops/facebook-free-bootstrap` | 0 / 23 | Already contained in main; retain historical branch. |
| `ops/stripe-test-run` | 4 / 265 | No net changed files from merge base; retain historical branch. |
| `recovery/trusted-main-2026-09-21` | 0 / 25 | Already contained in main; retain historical branch. |
| `security/add-automated-audit-2026-10-10` | 1 / 0 | Consolidate into one SHA-pinned security workflow; replaces duplicate audits. |
| `security/auth-abuse-hardening-2026-09-25` | 4 / 22 | Previously closed without merge (#70); preserve history. Superseded or rejected work is not reactivated. |
| `security/automated-scanning-2026-10-10` | 1 / 0 | Consolidate into one SHA-pinned security workflow; replaces duplicate audits. |
| `vercel/vercel-web-analytics-integrati-28qoc0` | 1 / 252 | Previously closed without merge (#9); preserve history. Superseded or rejected work is not reactivated. |
| `vercel/vercel-web-analytics-integrati-bcopin` | 1 / 252 | Previously closed without merge (#8); preserve history. Superseded or rejected work is not reactivated. |
| `verify-production-waitlist-2026-08-27` | 1 / 201 | Previously closed without merge (#27); preserve history. Superseded or rejected work is not reactivated. |

## Locations

| Component | Canonical location |
|---|---|
| Production website | public/ |
| Production server and APIs | src/, api/ |
| JARVIS operation library | jarvis/src/ |
| HP personal workspace | jarvis/local/ |
| JARVIS architecture | jarvis/docs/ |
| Verification | test/, scripts/, .github/workflows/ |
| Business and launch records | docs/business/, docs/launch/, docs/providers/, docs/finance/ |

## Limits

This is a Streetwise/JARVIS repository audit, not a claim that the other five account repositories were repaired. The HP launcher must be exercised on Windows. Mock-provider tests do not validate a real OpenAI API key or billing. Production cellular launch gates remain unchanged.

