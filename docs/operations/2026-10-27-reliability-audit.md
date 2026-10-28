# Streetwise Connection repair audit — October 27, 2026

## Verified production state

- Main inspected: `a8e53c788f30a123c20fbe79b040186e15d2b079`.
- The storefront at https://streetwise-connection.vercel.app returned HTTP 200. The production smoke script passed public status, health, privacy, consent validation and the blocked cellular/payment routes. The live waitlist was open. No signup was created.
- JARVIS is the `JARVIS-OpenClaw` service in Railway project `motivated-courtesy`. Deployment `e9919f20-e472-4cd0-a860-335438c051c2` was SUCCESS, with `jarvis-data` mounted at `/data` and `/setup/healthz` configured.
- https://jarvis-openclaw-production.up.railway.app/setup/healthz returned `configured`, `gatewayRunning` and `gatewayReachable` true. These flags do not prove a completed model answer.
- Runtime logs show OpenRouter Inkling free-model HTTP 200 responses, session model overrides disabling fallbacks, and memory warnings around 1.61 GiB. The last-hour Railway memory reading was about 1.67 GB. Saved provider authentication can exist on the persistent volume despite no OPENROUTER_API_KEY environment variable.
- Historical GitHub statuses still show failures for `streetwise-connection--api` and `streetwise-connection-l4jt`. The connected Vercel account lists only `streetwise-connection`; old deployments and the former API project return 404. Their current existence/cause cannot be established through this connection. Do not report them repaired or delete anything based solely on those historical statuses.
- The live GitHub Main ruleset has an empty required-status-check list. This differs from `.github/main-ruleset.json`; no live protections were weakened by this repair.
- A separate `-nearby-signal-detector` Railway service has a failed deployment and points to a different repository. It is outside this repository's repair scope. The other Railway project contains database services; all were preserved.

## Changes

- Replace the unsafe backup behavior proposed in draft PR #127 with explicit, guarded free-model recovery. Recovery never proceeds without an exact private backup, preserves other models/settings, honors custom config paths and skips included/replacement/restrictive configurations. It remains disabled until an operator sets JARVIS_RECOVERY_MODEL. PR #127 is not required alongside this implementation.
- Docker health checks honor PORT instead of always probing 8080.
- Waitlist controls start disabled until status is known. Requests have a ten-second timeout, ambiguous submission timeouts are explained, and failed status refreshes disable the entire form.
- Refresh the homepage with “Real help. Right here.”, ink-and-gold styling, existing Las Vegas support services first, direct booking contact, and planned cellular service clearly separated.

## Validation and remaining limits

Node 24 repository verification and focused recovery/form tests were run locally. The pinned upstream Railway template was downloaded, patched successfully and its server passed Node syntax validation. Docker is unavailable in the local environment, so this is not a claim of an OpenClaw image build.

The live provider's end-to-end response still needs verification after any model change. A session override can supersede the default, and a provider's HTTP 200 can precede a stalled stream. No credentials, session files, volumes, database services, billing plans or model selection were changed during this audit. No assurance is made that Railway hosting is free. Model recovery addresses configuration safety, not upstream availability or the measured memory pressure.
