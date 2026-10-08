# Repository maintenance and protection

## Protecting main

`.github/main-ruleset.json` is an importable GitHub ruleset. Committing this file
does **not** enable protection. A repository administrator must import it under
Settings → Rules → Rulesets → New ruleset → Import a ruleset and save it as active.
Verify the resulting rule in GitHub after saving.

The rule requires a pull request, resolved review conversations and the existing
GitHub Actions checks `test`, `docker-build` and `verify`. Branches must be current
with `main`. Deleting or force-pushing `main` is blocked, with no bypass actors.
The GitHub Actions integration ID was verified against the repository's checks.

The approval count is zero so a sole maintainer is not locked out by GitHub's
rule against approving their own PRs. This still requires the PR and passing
checks. Require an independent approval once a second trusted reviewer is
available. Do not require path-filtered provider, Stripe or lab jobs:
those checks intentionally do not run on every change.

The GitHub connector can edit repository content but cannot administer rulesets.
GitHub Actions' repository token does not grant that missing administration access.

## Branch cleanup

The **Clean merged branches** workflow runs when its workflow or script is changed
on `main`. It can also be run manually on `main`; manual runs preview by default
and delete only when **apply** is selected.

A branch qualifies only if it is unprotected, is not the default branch, has no
open PR and its exact current commit matches a PR already merged into the default
branch of this repository. Closed-but-unmerged PRs, fork branches, unmatched
duplicate branches and branches with later commits are preserved.

Before deletion the script rechecks the branch and open PRs. Git uses an explicit
SHA lease, so a concurrent push rejects deletion. A permissions/API failure stops
the run. Each candidate's name, commit SHA and merged PR number are recorded in
the workflow log; use the merged PR's **Restore branch** control if needed.

Only this maintenance job receives `contents: write`, and it runs trusted `main`
code without installing application dependencies. Its checkout retains Git
authentication solely for the guarded deletion. Other workflows use read-only
tokens and do not retain checkout credentials.

## Workflow security

Actions are pinned to full commit SHAs; Dependabot already tracks GitHub Actions
updates. Provider and Stripe credentials are used only by their checks on `main`,
after a push or an explicit manual run. PRs continue to run the mock/unit suite,
dependency audit, Docker/database smoke tests and Vercel compatibility checks.
Never use `pull_request_target` to execute untrusted PR code with credentials.

Run `npm run verify` before merging. These maintenance changes do not enable
commercial service or alter production credentials or launch switches.
