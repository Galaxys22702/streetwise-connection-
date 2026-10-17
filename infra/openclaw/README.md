# Jarvis OpenClaw model compatibility

The Railway image builds the pinned upstream template with this directory as its build context. Setup uses OpenClaw's provider defaults when Model is blank. Full model IDs, provider aliases, custom endpoints and gateway routes are passed to OpenClaw without comparing them to the setup group's name. A rejected model change is reported as setup failure.

Status refresh preserves the chosen provider and authentication method. Explicitly changing either clears the previous draft key and model so they are not reused with a different provider. Persisted authentication and conversations are unchanged.

Every provider still needs its own supported authentication, model entitlement, network access and, for a self-hosted provider, a reachable endpoint. Interactive device-code methods retain upstream's Railway-console wizard requirement. This change does not make every remote model available or verify paid provider access.

The opt-in `JARVIS_APPLY_LOW_MEMORY_POLICY=1` policy now disables optional non-provider plugins only. Normal restarts preserve plugin settings.

For an existing installation where the old memory policy blocked Anthropic, Ollama or xAI, temporarily set `JARVIS_RESTORE_MODEL_PROVIDERS=1` in Railway and redeploy this image. Restoration requires the original `openclaw.json.jarvis-before-plugin-optimization.bak`; it removes only those three provider denials absent from that backup and saves the current configuration separately before changing it. Denials present in the original backup, other plugin settings, credentials and conversations remain unchanged. Remove the flag after restoration so future explicit provider denials are respected. Missing or invalid backups cause a safe skip; review those installations manually in OpenClaw.

Deploy the updated commit on the branch configured for the OpenClaw service. A successful Streetwise deployment does not verify the separate OpenClaw image. After deployment, select a configured provider/model and send a short message from the live UI. Code tests and a successful image build do not prove provider credentials or model availability.
