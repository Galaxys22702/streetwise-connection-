# Streetwise and JARVIS blocker audit — November 6, 2026

This audit covers the Streetwise application, HP local runner, Railway OpenClaw startup and model recovery, saved session selections, production HTTP behavior, dependency security, and delivery checks. It does not certify every feature or a completed production AI conversation.

## Observed production state

| Boundary | Evidence | Conclusion |
| --- | --- | --- |
| Main source | `a015dd5ebe3e005880939bee84bbf9a0479e8e7c` | Includes PR #138, but not the SQLite recovery branch. |
| Streetwise production | Landing page and public status return 200; production smoke passes privacy, health, consent validation and gated service routes | Public waitlist works. No valid signup or payment was created. |
| Streetwise private chat | `/api/jarvis/status` returns 503 `jarvis_disabled` without authentication | This private API is disabled; it is separate from Railway OpenClaw. |
| Railway OpenClaw | Deployment `c99e6f36-8178-436d-9148-cf4cc108d9bb`, SUCCESS, from the inspected main SHA | The live gateway uses the current main image. |
| Gateway readiness | `/healthz` and `/setup/healthz` return 200; configured/running/reachable are true | Gateway is reachable; this does not prove an assistant reply. |
| Gateway model | Startup records `openrouter/openrouter/free`, minimal thinking and fast mode off | Free default is confirmed at startup. |
| Active conversation | November 6 logs show `thinkingmachines/inkling:free` returning 404 and no next fallback candidate | A stale session selection still reaches the unavailable free Inkling route. |
| Browser connection | Recent Windows browser connections repeatedly end with `pairing-required` | The connecting device needs owner approval. Pairing protection must remain enabled. |
| Free router | Later model requests open `openrouter/free` streams with HTTP 200 | Stream opening is confirmed; a completed, delivered reply remains unverified. |
| Vercel auxiliary projects | Main statuses fail for `streetwise-connection--api` and `streetwise-connection-l4jt`; deployment reads return 403 | Their configuration and failure causes remain inaccessible. They were not changed or declared fixed. |

The gateway has one replica and the existing `/data` volume. At inspection, one-hour memory samples averaged about 1.75 GB and peaked around 1.82 GB. These samples do not prove an out-of-memory failure or a speed improvement. No plugins were disabled to reduce this number.

## Repairs in this candidate

1. **Canonical SQLite session pins.** Incorporates and reviews the previously unpublished `6d330e4f3a128e9dd2f09e70e37a552dcc7f1441` implementation. The guarded free-chat startup profile now visits `session_nodes.entry_json`, rather than only legacy JSON stores. Known free-router/Inkling selections inherit the verified free default. With existing Auto recovery enabled, known paid-Auto aliases are released too. Locked, external, rollback-pending and other-provider selections are preserved.
2. **Recovery and rollback integrity.** SQLite snapshots are reserved with mode 0600 before data is written. A pending mutation refuses any existing snapshot: matching session metadata cannot establish that all transcript history is current. Updates use a transaction and compare the original entry before committing. Transcript tables, session identity and conversation text remain unchanged. Legacy JSON Auto recovery also handles the known aliases and split OpenRouter provider fields.
3. **Free HP startup.** The Windows launcher uses OpenRouter's free router instead of requiring a paid OpenAI account. `npm run jarvis:local` starts this personal runner without PostgreSQL. The hosted startup retains its real database requirement and points users to the personal command when that requirement is missing.
4. **One provider request implementation.** Private Streetwise chat and the HP runner share OpenRouter ID normalization, a zero prompt/completion price ceiling, a 30-second deadline and redirect rejection. OpenRouter paid models are refused before inference. Specific authentication, account restriction and quota errors replace ambiguous failures. No automatic paid fallback or retry loop is added. Explicit custom HTTPS providers remain available for the private Streetwise API; OpenRouter-specific keys are not forwarded to them.
5. **Hosted process availability.** A raw `GET //[` request previously terminated the Node process with `ERR_INVALID_URL`. Node and Vercel now return HTTP 400. The regression sends a real malformed HTTP request, then verifies the same Node process still serves health successfully.

## Verification and limits

- Baseline: 241 tests passed. Production dependency audit reported zero vulnerabilities.
- Candidate: 254 tests passed in both `npm test` and `npm run verify`; the latter also passed Vercel configuration, safe launch mode and repository-integrity checks.
- The personal local launch command was started without `DATABASE_URL` or an AI key; `/health` returned 200 with offline mode ready.
- Provider tests use substitutes and spend no API credit. They verify zero-price request construction, paid-route refusal, no fallback on 401/402/403/429/503, redaction, and completion-text validation.
- SQLite tests cover real local SQLite files, transcript preservation, private snapshots, stale backup refusal, unsupported schemas, symlinks, locks, provider boundaries, opt-out and repeat startup.
- The pinned upstream Railway template was downloaded, patched successfully and syntax-checked. This environment has no Docker daemon, so this is not an OpenClaw image-build claim.
- The hosted database expects PostgreSQL, not SQLite. Production database settings and schemas were not changed. Local PostgreSQL processes could not be started under a separate OS identity in this environment. The existing Build targets CI job owns its isolated PostgreSQL 16/container startup check; inspect that run for candidate evidence.
- Windows launcher behavior, physical HP access, live provider authentication, current persisted production session contents and delivery of a complete assistant reply still require their real runtime boundaries.

## Smallest remaining live verification

1. In the owner's password-protected Railway `/setup` page, select **Manage Devices**, identify the pending HP/browser request, and approve that exact device. The inspected template supports this native flow; do not disable authentication or approve unidentified devices.
2. In the approved OpenClaw chat, send `/model default -s`, then `/think default`. These supported commands clear the active session overrides without enabling paid routes.
3. Send `Reply exactly: JARVIS FREE OK`. Require the complete visible reply, a free model route and no paid fallback/billing failure. HTTP 200, gateway health and an opened stream alone do not satisfy this check.
4. After deployment through the existing PR process, inspect startup `sqliteApplied`/`sqliteSkipped` counts and repeat the same live reply check. The initial inspection changed no production configuration or volume data; subsequent rollout findings follow below.

## Rollout follow-up: canonical certification

PR #139 was merged and deployed. A session-only rollout applied one SQLite store, but the gateway then rejected a canonical row: OpenClaw's `AFTER UPDATE OF entry_json` trigger had reset `entry_valid` to zero. The initial reduced fixture omitted that trigger, so its passing tests did not establish canonical admission. The published OpenClaw 2026.9.9 package confirms that its native writer explicitly recertifies after rewriting JSON.

The corrective change adds that transaction step and a narrow startup recovery for the existing private snapshot. Only an exact known model-only rewrite of a previously certified row can be recertified; every other promoted column and both copies of session identity must still match. It never replaces a database or changes transcript tables. Tests now include the upstream invalidation trigger and rejection of unrelated or subsequently edited rows. The session-release flag is disabled for future deployments. Gateway recovery and a complete live reply must be verified separately after deployment.
