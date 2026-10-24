# MOONFIRE mobile gateway (prototype)

A small authenticated **status-only** HTTP server. It does not connect to OpenClaw or the HP yet, and it cannot execute commands.

## Local launch

Requires Node.js 24. Set a unique random token of at least 32 bytes in an environment variable. Never commit it.

PowerShell:

```powershell
$env:MOONFIRE_TOKEN = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
node tools/moonfire/mobile-gateway.mjs
```

In a second PowerShell session, use the same token to check:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/status -Headers @{ Authorization = "Bearer $env:MOONFIRE_TOKEN" }
```

The token environment variable must be set in **both** sessions. For a quick local test, run the server in a background job or copy the token privately into the second session.

## iPhone access

Do **not** open port 8787 to the public internet. First establish a private Tailscale connection and add an authenticated HTTPS reverse proxy that only exposes the status endpoint. In Apple Shortcuts use `Get Contents of URL` with an Authorization header (`Bearer <secret>`) to call `/status`. Keep the secret out of shared screenshots and shortcuts. Verify the response says `openclawConnected: false` and `hpConnected: false` until genuine live integrations exist.

## Security limits

This prototype binds to loopback by default and requires a bearer token even for status. It intentionally has no shell commands, file operations, remote control, or public deployment configuration. Before production use, add rate limiting, managed secrets, TLS termination, access logs without tokens, and automated tests.
