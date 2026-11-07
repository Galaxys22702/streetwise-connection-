# JARVIS deep-clean report

Recorded 2026-11-07. No secret values are included.

## Live service before this change

- Repo main: `e77d6ad` Restore gateway startup after SQLite certification invalidation (#140)
- Railway project `motivated-courtesy`, production, service JARVIS-OpenClaw
- Deployment `7afd71dc-5d5e-4a57-8a9f-e66eb30492ee` SUCCESS, commit `e77d6ad`
- `GET /setup/healthz` 200 `{"ok":true,"wrapper":true,"configured":true,"gatewayRunning":true,"gatewayStarting":false,"gatewayReachable":true}`
- `GET /readyz` 200 `ready:true`, `failing:[]`
- `GET /` 200 OpenClaw dashboard HTML
- Startup 2026-11-07T11:26:18Z: Gemini binding `key_missing`, model recovery `preserved_model`, free-chat profile `{"reason":"disabled"}`, plugin settings preserved
- Gateway line: `agent model: openrouter/openrouter/free (thinking=minimal, fast=off)`
- Browser connects reached `phase=auth_validated` then closed `code=1008` `cause=pairing-required` `requestId=87e80182-fbba-4d24-9140-712116f1c56b`
- No OpenRouter 401/402/404/429 lines were present in the post-restart deploy log sample. Chat never started because pairing blocked the socket.

## Code check

`node --test` on `test/openclaw-free-chat.test.js`, `test/openclaw-operator-assist.test.js`, and `test/openclaw-recovery.test.js`: 32 pass, 0 fail.

## Change

In-container operator approval for exact operator UUID pairing requests, plus a one-shot `JARVIS_STATUS_PROBE=1` turn pinned to `openrouter/openrouter/free`. SQLite certification and stored credentials are not rewritten by this change.
