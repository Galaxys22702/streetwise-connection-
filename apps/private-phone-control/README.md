# Streetwise Private Communications Control Center

**Local functional prototype. Not a carrier connection. Not a deployed service.**

This is a dependency-free Node.js web application built for a private Windows laptop or other computer. It has a real HTTP server, authenticated per-device event ingestion, a live browser event feed, persistent redacted records, a human approval queue for SMS fallback drafts, notifications while the page is open, and a per-device/per-integration verification ledger. It does **not** read a phone's native call or SMS inbox, send SMS, answer calls, or call an AI model. These functions require separately installed/authorized software or a provider integration, with completed live tests.

## Windows: start it privately

1. Extract the ZIP to a folder you control. Use Node.js 18+ (Node 24 LTS is recommended).
2. Double-click `Start-Private-Control.bat` (it runs `node server.mjs` in a local Command Prompt). Keep that window open while using the dashboard.
3. On the **same Windows computer**, open `http://127.0.0.1:8789/`.
4. The first run creates an owner key in `%USERPROFILE%\.streetwise-private\owner-key`, restricted to the current computer account where supported. Open that file locally and enter the key into the login field. Never paste the key into ChatGPT, a screenshot, a support ticket or a repository. The key is not included in the package.
5. Register a device (Android, iPhone, Windows, macOS, Linux, provider/VoIP or Other). Under **Safety**, run the non-invasive health check. Optionally run `Test-Local-Bridge.ps1` to create a **synthetic local** event after the controller is started. It cannot make a real phone ring.

PowerShell (manual start, from the extracted folder):

```powershell
node .\server.mjs
```

PowerShell (read-only local health, in another terminal):

```powershell
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8789/api/health'
```

Browser: `http://127.0.0.1:8789/api/health` (from the computer running the server). HTTP 200 proves the local app is listening, **not** that Android, iPhone, OpenRouter, JARVIS, carrier SMS, or calling works.

## Security and privacy

- Listens on `127.0.0.1` only. **Never** open port 8789 publicly, forward it on the router, or change the bind host to `0.0.0.0`. The phone UI is responsive but cannot be reached from another phone until a separately approved, authenticated, encrypted private-access path exists.
- Owner login is required for records and event feed. Per-device inbound bridge keys are independent of the owner key, can be rotated, and are revealed once. State is persisted as a file under `%USERPROFILE%\.streetwise-private` on Windows. The owner key and local data never belong in the repo.
- The event API rejects common message-body fields. Only a non-sensitive event reference and optional last four digits of a sender number are accepted. Fields shown in records are redacted. Full text, phone numbers, recordings and transcripts are intentionally not collected. Avoid entering message contents into notes/evidence fields.
- An accepted event is **not** proof a carrier delivered an SMS. SMS drafts use a **local template**, not AI. Approval marks `approved-not-sent`. A manually entered external delivery receipt marks an **owner-reported external result**, not `sent-by-controller`.
- Use **Safety → Erase local records** to permanently erase locally saved device, event, audit and test data, after two confirmations. Keep a separate private backup before doing so. It does not affect external devices or provider records.
- The browser may show a local desktop notification when a new bridge event arrives **while the page is open** and notification permission is granted. There is no push service, background call monitoring, or silent phone interception.
- No API keys, passwords or telephone transcripts are bundled, logged or sent to third-party AI APIs. No billing, provider changes, Railway changes, GitHub deploys, Cloudflare changes or production actions occur.

## Authenticated bridge contract (for future device/provider adapters)

After signing in as owner, register the device, then click **Generate bridge key**. Keep its `deviceId` and bridge key in a secure local adapter configuration. An adapter running **on the same computer**, or connecting via a separately reviewed private transport, can POST metadata to:

`POST http://127.0.0.1:8789/api/bridge/event`

Headers: `Content-Type: application/json`, `X-Streetwise-Device: <deviceId>`, `X-Streetwise-Bridge-Key: <private per-device key>`.

Example body (contains only a **synthetic** test reference):

```json
{"kind":"sms","reference":"synthetic-android-001","fromLast4":"1234"}
```

`kind` is `sms` or `call`. The `reference` must be stable per event for duplicate suppression. `body`, `message`, and `content` are rejected; do not include any real text. This contract is **receive-only**. No route sends or answers anything.

## Status rules

Every registered device starts with all capabilities `unknown`. Each completed status entry is scoped to **device ID + integration + capability** and records the check time, evidence, errors, and smallest reversible next step. An owner can record `verified` only with a completed-test acknowledgment and non-empty evidence. These are **owner reports**, not independently authenticated carrier receipts. An iPhone test does not verify an Android integration and vice versa. Tests must use an authorized number/device under the owner's control.

| Platform | Local display and manual tests | Native call/SMS access | Minimum next step |
|---|---|---|---|
| Android | Implemented in browser | Not connected | Select an authorized Android bridge mechanism, request appropriate user permissions, test one incoming event end-to-end. |
| iPhone / iOS | Implemented in browser | Not connected; Safari cannot freely read native SMS/calls | Use a supported provider-owned phone number or explicit platform-supported automation, then test. |
| Windows / macOS / Linux | Implemented in browser | No automatic cellular access | Connect an authorized desktop/provider adapter and record receipt evidence. |
| Other / VoIP / provider | Registerable and testable manually | Not connected | Confirm provider rights, scoped webhook signature, HTTPS transport, and test receipts. |

A future AI workflow must opt into a free/approved AI provider **after** the user authorizes content sharing (if any) and must keep the human approval gate. The fallback text is a deterministic local template, not an AI completion. A JARVIS chat reply is not the same as an SMS delivery receipt.

## Developer checks

Node.js:

```powershell
node --test .\test\controller.test.mjs
```

UI layout test (`test/browser-layout.py`) uses Playwright and mocked network requests only and is optional. The actual local backend regression test runs using Node.js alone. Do not place owner keys in tests, Git history, environment files committed to Git, or bug reports. Test fixtures use newly generated temporary keys and directories.

## No-change boundaries

Do not merge automatically, deploy, expose services publicly, change DNS, connect paid providers, bypass platform permissions, enable automatic outgoing messages, or alter production JARVIS/OpenClaw configuration. Separate explicit authorization, a safe bridge, and a real device-specific end-to-end test must precede enabling any of these.
