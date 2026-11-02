# Repository audit and remediation — 2026-11-02

## Scope and evidence

Repository: `Galaxys22702/streetwise-connection-`, default branch `main`.
This record uses GitHub's repository tree, pull request information, branch comparisons, check runs, and the live repository ruleset API. It is not a claim that local builds, paid-provider integrations, or production smoke tests were independently executed.

## Verified changes

- PR #132 merged: tentative public opening target is March 2027; the November 30, 2026 readiness gate remains a gate, not an authorization to activate service.
- Website waitlist copy is updated in this PR to match March 2027 and explicitly remains tentative.
- Live billing, SIM/eSIM ordering, and carrier provisioning must remain gated and disabled until evidenced approval.

## Branch maintenance

The existing `scripts/cleanup-merged-branches.js` and scheduled workflow use exact-SHA leases, avoid open-PR branches, and require at least seven days after matching merged PRs. Keep those protections.

Ancestry comparison against `main` found these fully behind branches with zero ahead commits at audit time:

- `feature/plan-package-details-2026-09-21`
- `fix/restore-main-ci-2026-10-07`
- `ops/facebook-free-bootstrap`
- `recovery/trusted-main-2026-09-21`

These are *candidates for inspection*, not automatically safe deletions: check other PR dependencies and history before deletion. Most remaining historical branches have unique/diverged ancestry. A squash merge can leave ahead commits; compare changes and prior PR outcomes before merging or deleting. Preserve `cleanup/deep-audit-oct-2026` while draft PR #131 is open.

## Actual GitHub ruleset drift

The checked-in `.github/main-ruleset.json` describes `Protect main`, with deletion and linear-history protection, conversation resolution, four required checks, and strict status-check enforcement. GitHub API `GET /repos/Galaxys22702/streetwise-connection-/rulesets/24859087` returned an **active** ruleset named `Main` with:

- non-fast-forward prevention;
- pull requests with zero required reviews, no required conversation resolution, and allowed merge/rebase/squash;
- a required-status-check rule containing **zero specified checks**;
- no deletion or required-linear-history rule in that returned ruleset.

Do not equate the tracked JSON with effective GitHub enforcement. Inspect other applicable repository/organization rulesets before making a complete protection claim. Changing the live ruleset requires separately authorized administrative access and a reviewed change. Do not weaken protections to unblock a PR.

## CI and deployment evidence

PR #132 head `4118a530602db82352b9a0c9de424a5f96783306` showed successful GitHub check runs: `test`, `docker-build`, `verify`, `jarvis-test`, CodeQL, and preview-comment review. The separate Vercel status for `streetwise-connection` was successful, whereas `streetwise-connection--api` and `streetwise-connection-l4jt` reported failure. Vercel listing of the failing projects returned HTTP 403 to this connection. Their root causes and current runtime health are therefore unverified. Do not delete, repoint, or claim those projects repaired without deployment evidence.

## Remaining gates

- External: Nevada formation/licensing, wholesale carrier agreement, provider-of-record and regulatory allocation, real provider economics, credentials/permissions and approved plan scope.
- Engineering: contract-backed integration, controlled activation and refund testing, security and support acceptance, monitoring and recovery drills.
- Governance: reconcile actual rulesets with the reviewed protection policy, audit divergent branches, keep unfinished Jarvis PR #131 draft.
- Production: public waitlist only; no live paid service without all mandatory issue #39 gates green and explicit owner authorization.
