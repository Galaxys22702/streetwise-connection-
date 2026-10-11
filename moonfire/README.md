# MOONFIRE mobile gateway (prototype)

Standalone Node 24 HTTP gateway. This is **not** an OpenClaw connection or a deployed cloud service.

## Run locally

From the repository root, generate a secret without saving it to GitHub:

```bash
export MOONFIRE_TOKEN="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
node moonfire/gateway.mjs
```

On Windows PowerShell:

```powershell
$env:MOONFIRE_TOKEN = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node moonfire/gateway.mjs
```

The service listens on 127.0.0.1:8787 by default. Test locally with:

```bash
curl -H "Authorization: Bearer $MOONFIRE_TOKEN" http://127.0.0.1:8787/status
```

## iPhone access

Do not open port 8787 to the internet. Put the service behind an authenticated, HTTPS-capable private network or reverse proxy with access controls (for example Tailscale Serve on the host), then configure an Apple Shortcut with **Get Contents of URL**, method GET, and an Authorization header containing the Bearer token. Store the token privately, never in a public shortcut or repository. The gateway has no remote shell or device-control functions.

## Limitations

- Gateway process must be running on an authorized host.
- HTTPS, device pairing, rate limits, and OpenClaw integration are **not implemented** in this prototype.
- Do not expose this prototype publicly or use it for sensitive data.
- Run automated tests and review security before deployment.
