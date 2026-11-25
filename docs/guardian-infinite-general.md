# Guardian Infinite General

Status: skill source implemented; installation and live inference not yet verified.

The four departments (research, development, cybersecurity, engineering) use DEVIL adversarial review, ANGEL defensive review and GENERAL coordination. This is a single opt-in skill, not independently provisioned agents, new permissions, or a perpetual worker. Existing DEVIL and Streetwise Council proposals in PR #214 remain separate.

## Install on an authorized Windows or Ubuntu development machine

From a checkout of this branch, run the following with the machine's existing Node.js runtime. This creates the skill in the explicitly selected OpenClaw workspace and refuses to replace an existing skill. Do not point it at production without separate approval.

```text
node scripts/install-guardian-skill.cjs <absolute-workspace-directory>
```

Use the workspace path shown in the local OpenClaw setup, not a guessed path. Restart or refresh the local gateway only after checking that no task is running. Confirm the skill is listed using the installed CLI's `openclaw skills list` command. Do not print credentials.

## Activation

Ask JARVIS: "Guardian Infinite General, run the first mission." Verify the route is openrouter/openrouter/free with zero paid fallbacks before sending a message. A completed response and actual tool evidence are separate acceptance criteria. If the gateway is not reachable, stop and report the blocker.

## Rollback

If the skill was installed by this procedure and no owner changes are present, remove only the installed guardian-infinite-general skill directory after owner approval. No gateway credentials, provider configuration, sessions or other skills are changed by the installer.
