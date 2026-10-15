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
- Only the explicit `/status` command runs a tool. AI replies cannot purchase items, access hardware, execute shell commands, activate lines or change Streetwise data. Voice and computer control need separate work.

## Validation

Run `npm run verify`. With Jarvis configured, connect through the page and send `/status`; expect a verified Streetwise result. Without an AI key, free-form questions must report that the AI connection needs configuration. With a real key, ask a short furniture question and confirm a provider response; mocked provider tests do not establish live API access.
