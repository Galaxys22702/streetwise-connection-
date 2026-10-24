# JARVIS on your HP

This is your personal local workspace. It shares this repository for source management, but runs separately from Streetwise's public website and billing systems.

## Start on Windows

1. Install **Node.js 24 LTS** using the Windows installer from https://nodejs.org/en/download.
2. Download this repository's **main** branch using **Code → Download ZIP**. Extract the ZIP completely.
3. Open **jarvis → local** and double-click **Start-JARVIS.bat**.
4. Enter your OpenAI API key only in the hidden prompt. Leave it blank to use the offline planners. Chat requires an API account with available credit; a ChatGPT subscription does not supply API credit.
5. The launcher waits for startup and opens **http://127.0.0.1:3000**. Keep the terminal open. Press Enter in that terminal to stop.

The launcher sets execution policy only for its PowerShell process; it does not change your saved Windows policy. Your key stays in process memory, is sent only by the server to OpenAI, and is not written to a file. Requests may incur OpenAI API charges.

## What works

- Text chat through the server-side OpenAI Responses API (default model: `gpt-4.1-mini`). Each request is independent; there is no model conversation memory.
- Money Mode: local beat inventory, readiness checklist, and hypothetical revenue calculation.
- Investigator: local case notes, evidence references, timeline, and JSON export.
- Action inspector: clearly labelled simulation only. No GitHub, Vercel, posting, payments, or shell tools execute.

Money Mode and Investigator save in this browser's local storage. Export backups before clearing browser data, changing browsers, or changing the port. The activity log is also browser-local; it is not model conversation memory. No automatic income or background execution is implemented.

## Troubleshooting

- **Node not found:** close the launcher, install Node 24, and reopen it.
- **Port in use:** close the other JARVIS window. Do not terminate unrelated applications.
- **AI not configured:** restart and supply a key in the hidden prompt.
- **Provider request failed:** check API billing, model availability, and the key in your OpenAI account. Do not paste credentials into issues or chat.
- **Phone cannot connect:** expected. The server listens only on the HP's loopback interface. Do not port-forward it.

## Development

From the repository root, use Node 24 and run `node --test test/jarvis-local.test.js`. These tests use a fake provider and never spend API credit. Windows launcher behavior must also be checked on Windows; Linux tests do not certify it.

Earlier `jarvis-ai` development branches are superseded by `jarvis/local`. Their public serverless chat endpoints are intentionally not included in the HP package. Streetwise's Vercel configuration continues to serve only `public/` and its existing APIs.
