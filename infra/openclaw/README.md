# Jarvis OpenClaw model compatibility

The Railway image builds the pinned upstream template with this directory as its build context. Setup uses OpenClaw's provider defaults when Model is blank. Full model IDs, provider aliases, custom endpoints and gateway routes are passed to OpenClaw without comparing them to the setup group's name. A rejected model change is reported as setup failure.

Status refresh preserves the chosen provider and authentication method. Explicitly changing either clears the previous draft key and model so they are not reused with a different provider. Persisted authentication and conversations are unchanged.

Every provider still needs its own supported authentication, model entitlement, network access and, for a self-hosted provider, a reachable endpoint. Interactive device-code methods retain upstream's Railway-console wizard requirement. This change does not make every remote model available or verify paid provider access.

The opt-in `JARVIS_APPLY_LOW_MEMORY_POLICY=1` policy now disables optional non-provider plugins only. Normal restarts preserve plugin settings.

For an existing installation where the old memory policy blocked Anthropic, Ollama or xAI, temporarily set `JARVIS_RESTORE_MODEL_PROVIDERS=1` in Railway and redeploy this image. Restoration requires the original `openclaw.json.jarvis-before-plugin-optimization.bak`; it removes only those three provider denials absent from that backup and saves the current configuration separately before changing it. Denials present in the original backup, other plugin settings, credentials and conversations remain unchanged. Remove the flag after restoration so future explicit provider denials are respected. Missing or invalid backups cause a safe skip; review those installations manually in OpenClaw.

Deploy the updated commit on the branch configured for the OpenClaw service. A successful Streetwise deployment does not verify the separate OpenClaw image. After deployment, select a configured provider/model and send a short message from the live UI. Code tests and a successful image build do not prove provider credentials or model availability.

## Gemini key updates in Railway

On startup, a non-empty GEMINI_API_KEY can be bound through OpenClaw’s native Google API-key environment SecretRef. The key stays in Railway; configuration stores only its variable name. The former OPENCLAW_LIVE_GOOGLE_KEY export had no production override effect. This repair uses a dedicated env-secret provider allowlisted to GEMINI_API_KEY, preserves the Google model catalog and all saved auth profiles/chats, and backs up the original configuration once with private permissions. Future key rotations need a Railway restart/redeploy, not another key copy.

Explicit Google credential bindings, OAuth choices, credential headers/request authentication, custom endpoints, noncanonical provider names, custom replacement catalogs and conflicting secret-provider settings are preserved rather than overwritten. JARVIS_USE_RAILWAY_GEMINI=0 disables the startup repair. Non-JSON or included configuration is preserved and needs manual review. Explicitly pinned session profiles can still require selecting the native provider binding in OpenClaw. Check the startup reason if the repair is skipped. Code validation does not establish that the provider key is valid or that the live service has deployed this image.
