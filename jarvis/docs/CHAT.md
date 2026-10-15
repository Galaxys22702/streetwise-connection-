# Private Jarvis chat

Jarvis now has a browser interface at `/jarvis.html` served by both the Node application and the Vercel static build. It can answer questions, including furniture planning and assembly guidance, using an OpenAI-compatible chat-completions provider. Send `/status` to run Streetwise's existing read-only status tool. Status works without an AI key.

## Configuration

Use Node.js 24 and install with `npm ci`. Store configuration in an ignored local `.env` file or your deployment's secure environment settings. Never commit credentials or send them in chat.

| Variable | Purpose |
| --- | --- |
| `JARVIS_ENABLED=true` | Explicitly enable the private API; disabled by default. |
| `JARVIS_ACCESS_TOKEN` | A separate random owner-access token, at least 32 characters. This is not your provider API key. |
| `JARVIS_AI_KEY` | Server-only provider credential. Required for free-form answers. |
| `JARVIS_AI_MODEL` | Provider model identifier, e.g. `gpt-4.1-mini` for OpenAI. |
| `JARVIS_AI_URL` | Optional HTTPS chat-completions endpoint; defaults to `https://api.openai.com/v1/chat/completions`. |

Generate your access token locally using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and put it in secure configuration. Use this token to connect in the browser. The browser keeps it in memory only; disconnecting or reloading clears it. Do not put it in URLs or browser storage. Use HTTPS for any remote deployment.

Node does not automatically read `.env`. For local development, use `node --env-file=.env src/server.js` from the repository root, with your other local configuration and safety flags in that file. The database-backed hosted workflow uses `node --env-file=.env scripts/start.js` after starting the repository's PostgreSQL service. Keep `PUBLIC_LAUNCH_MODE=waitlist`, `WAITLIST_ENABLED=false`, `PAYMENT_PROVIDER=mock`, `ESIM_PROVIDER=mock`, and live-order/payment switches false during development.

For Vercel, add the variables securely to the chosen deployment environment and redeploy the changed application through the normal review process. Do not enable a production service simply by adding a local key. The page's Connect step checks the access token before allowing chat. No database account or public cellular-service activation is required for private Jarvis access.

## Behavior and privacy

- `GET /api/jarvis/status` and `POST /api/jarvis/chat` require the owner's bearer token.
- The page provides room-planning, assembly-help and Streetwise-status prompts.
- Conversation history stays in browser memory and is cleared on disconnect/reload. It is sent with each AI request to the configured provider, whose own data policies apply. No conversation database is added.
- Chat accepts up to 20 alternating user/assistant messages, 4,000 characters each, 16,000 characters total. Client history trims older complete pairs.
- Provider requests time out after 30 seconds and do not follow redirects. Responses and errors never expose the provider key. HTTPS/TLS verification remains enabled.
- Access attempts and chat requests use the existing per-client, process-local rate limiter. A shared owner token is suitable for a private owner interface; this is not a multi-user authentication or distributed quota system.
- Only the explicit `/status` command runs a tool from chat. AI replies cannot approve or execute commands. The separate command workspace runs owner-reviewed shell commands on a connected development runner. HP/Mac control requires starting a runner on that machine; the cloud runner does not control those computers.

## GitHub and command workspace

To enable the command workspace on a private Node runner, set `NODE_ENV=development` and `JARVIS_COMMANDS_ENABLED=true` in addition to Jarvis's access-token configuration. Start with `node --env-file=.env src/server.js`. `JARVIS_WORKSPACE` optionally selects an absolute starting-workspace root; it defaults to this repository. Never expose this runner as an unauthenticated public service. Commands are unavailable in production mode and in Vercel/serverless handlers, even if the flag is set.

After connecting, select **Repository status**, **Changed files**, **Open pull requests**, or enter another shell command. Select **Review command** to see the exact command and canonical starting directory. Preparing a review does not execute anything. **Run this command** is the dedicated owner approval action; it runs only that server-stored ticket, once, through Jarvis's high-impact tool policy and single-use approval store. Changing the draft clears its review. Tickets expire after five minutes; the runner limits pending reviews to 20 and allows one executing command at a time. A command does not need the AI provider key.

The runner can use installed tools such as `git`, `gh`, Node, Python or PowerShell, subject to its OS-account permissions and network configuration. Its shell is `/bin/sh` on Linux/macOS and PowerShell on Windows. GitHub requires the runner's configured Git/CLI authentication; a working Git proxy does not establish `gh` API permission. No authentication or credentials are fabricated or embedded in source. Commands inherit an allowlist of runtime/tool environment variables, including configured Git/GitHub authentication and proxy/CA settings. Jarvis's own access token, AI key and unrelated database/provider secrets are excluded. Known inherited secret values and proxy/header credential components are masked in output; masking is best effort and is not protection against explicitly reading credentials from files.

**Commands run with the runner account's access, not in an OS sandbox.** Starting-directory validation rejects traversal/symlink escapes and revalidates the directory before execution, but an approved shell command can read or change other files accessible to that account. Review commands as you would before typing them in a terminal. Avoid including secret values in commands. Do not share an enabled runner's owner token. Chat cannot access this execution tool automatically, and a client `approved` flag is never a core approval record.

The runner reports real exit codes and stdout/stderr. Foreground commands have a 20-second execution limit and 32-KB combined output limit; crossing a limit stops execution and is reported, not marked successful. Normal POSIX process groups are killed on timeout and cleanup; Windows uses process-tree termination for timeout/output limits. These are not OS isolation guarantees: deliberately detached processes can escape group cleanup, and background daemons are not supported by this console. Longer-running interactive installs, background services and privileged administration need a separately designed runner workflow. Linux foreground-command behavior is covered by execution tests; Windows/physical HP execution still needs device validation.

Audit output contains policy decisions, request identifiers and execution outcomes, not raw command text, output or secrets. Reviews/results are held in process/browser memory, not a durable job database. Disconnect clears displayed reviews/output; refreshing while a command is running does not undo the command. If a network request fails, check the runner before repeating a consequential command.

## Voice

After connecting, choose **Speak a message** to start one speech-recognition session. It requires browser support, a microphone, HTTPS (or localhost for local development), and your browser's permission. Voice input fills the draft; it never sends a message automatically. Review the text and select **Send message**. Stop listening with the same button. If the browser does not support recognition or denies access, text chat remains available.

**Read replies aloud** is off by default. Turn it on to speak subsequent replies using your browser's speech synthesis, and use **Stop playback** to cancel. Disconnecting resets this option, stops the microphone/playback and clears chat. Hiding or leaving the page also stops voice. No background listening or wake word is implemented.

Your browser's speech recognition may send audio to its speech service, and its voices may use an external service. Jarvis does not upload or store raw audio itself; recognized text is sent to the configured AI provider only after you choose Send. Microphone permissions are enabled for `/jarvis.html` only; camera, geolocation and payment permissions remain disabled. Speech lifecycle tests use controlled browser substitutes. Physical microphone recognition and audible playback still need testing on your device.

## Validation

Run `npm run verify`. With Jarvis configured, connect through the page and send `/status`; expect a verified Streetwise result. Review and run a harmless command such as `git status --short`, then verify its output and exit code. Without an AI key, free-form questions must report that the AI connection needs configuration. With a real key, ask a short question and confirm a provider response; mocked provider tests do not establish live API access. Microphone policy is scoped in both deployment configurations; actual Vercel header behavior requires preview/deployment validation.
