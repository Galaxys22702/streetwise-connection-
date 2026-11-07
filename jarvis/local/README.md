# JARVIS on your HP

This is your personal local workspace. It shares this repository for source management, but runs separately from Streetwise's public website and billing systems.

## Start on Windows

1. Install **Node.js 24 LTS** using the Windows installer from https://nodejs.org/en/download.
2. Download this repository's **main** branch using **Code → Download ZIP**. Extract the ZIP completely.
3. Open **jarvis → local** and double-click **Start-JARVIS.bat**.
4. Enter your OpenRouter API key only in the hidden prompt. Leave it blank to use the offline planners. An existing `OPENROUTER_API_KEY` environment value is reused without prompting. The default chat route is `openrouter/free`; no paid model fallback is attempted.
5. The launcher waits for startup and opens **http://127.0.0.1:3000**. Keep the terminal open. Press Enter in that terminal to stop.

The launcher sets execution policy only for its PowerShell process; it does not change your saved Windows policy. Your key stays in process memory, is sent only by the server to OpenRouter, and is not written to a file. Paid model IDs are refused before inference. Requests also set a zero prompt/completion price ceiling. Free capacity and account quotas can still refuse or delay requests.

## What works

- Text chat through the server-side OpenRouter chat-completions API (default model: `openrouter/free`). Each request is independent; there is no model conversation memory.
- Money Mode: local beat inventory, readiness checklist, and hypothetical revenue calculation.
- Investigator: local case notes, evidence references, timeline, and JSON export.
- Action inspector: clearly labelled simulation only. No GitHub, Vercel, posting, payments, or shell tools execute.

Money Mode and Investigator save in this browser's local storage. Export backups before clearing browser data, changing browsers, or changing the port. The activity log is also browser-local; it is not model conversation memory. No automatic income or background execution is implemented.

## Troubleshooting

- **Node not found:** close the launcher, install Node 24, and reopen it.
- **Port in use:** close the other JARVIS window. Do not terminate unrelated applications.
- **AI not configured:** restart and supply an OpenRouter key in the hidden prompt. The local app does not use `OPENAI_API_KEY`.
- **Provider request failed:** check the specific notice: an unaccepted key, free quota/rate limit, account restriction, or unavailable provider. Failed attempts consume free quota, so avoid repeated retries. Do not paste credentials into issues or chat.
- **Paid models blocked:** use `openrouter/free`, or set `OPENROUTER_MODEL` to an OpenRouter model ending in `:free`. OpenClaw-prefixed free IDs are normalized.
- **DATABASE_URL required:** that is the separate hosted Streetwise command. Start this app with `Start-JARVIS.bat` or `npm run jarvis:local`; personal local chat does not need PostgreSQL.
- **Phone cannot connect:** expected. The server listens only on the HP's loopback interface. Do not port-forward it.

## Development

From the repository root, use Node 24 and run `node --test test/jarvis-local.test.js`. These tests use a fake provider and never spend API credit. Windows launcher behavior must also be checked on Windows; Linux tests do not certify it.

Earlier `jarvis-ai` development branches are superseded by `jarvis/local`. Their public serverless chat endpoints are intentionally not included in the HP package. Streetwise's Vercel configuration continues to serve only `public/` and its existing APIs.
