# OpenClaw HP + private-cloud foundation

This is a **setup plan**, not a deployed OpenClaw instance. It does not alter the production Streetwise website.

## Target architecture

iPhone (browser or approved messaging channel) -> Tailscale private network -> HP Windows running WSL2 -> OpenClaw Gateway.

The HP must remain powered on and online for this local-first design to work. If an always-on cloud VM is later used, it may incur charges. Vercel stays dedicated to the existing website.

## On the HP (interactive installation, when present)

1. Install Windows updates, back up important files, and verify hardware/WSL2 support.
2. In an **administrator PowerShell** window, run `wsl --install` if WSL is not installed, then complete the prompted reboot when convenient. Do not execute remotely without confirmation.
3. In the WSL Linux environment, follow the **current official** OpenClaw installation guide: https://docs.openclaw.ai/
4. Run the official onboarding flow interactively. Configure a supported AI model/provider; free software does not guarantee free model inference.
5. Bind the Gateway to localhost or a private interface. Never expose the Gateway directly to the public internet.
6. Install Tailscale from https://tailscale.com/ on the HP and iPhone, authenticate both to the same private tailnet, and restrict access appropriately.
7. Connect the iPhone using an approved OpenClaw client/channel or authenticated private dashboard. Confirm each action and grant minimum permissions.
8. Test a read-only status command before enabling any file, shell, messaging, or device-control tools.

## Security gates

- Do not commit API keys, tokens, pairing codes, personal data, or private reports.
- Require explicit approval for system commands, outbound messages, payments, and destructive actions.
- Use dedicated low-privilege accounts and restrict reachable hosts.
- Review OpenClaw extensions/skills before installation; untrusted prompts and plugins are a risk.
- Enable backups, logging, and a documented stop/disconnect procedure.
- Do not merge this planning branch into production automatically.

## Acceptance checklist

- [ ] HP running WSL2
- [ ] OpenClaw installed from verified official source
- [ ] Gateway reachable locally
- [ ] HP and iPhone on same authenticated Tailscale network
- [ ] Gateway not publicly exposed
- [ ] iPhone successfully issues a harmless read-only command
- [ ] Explicit approval required for sensitive actions
- [ ] Backups and recovery tested
