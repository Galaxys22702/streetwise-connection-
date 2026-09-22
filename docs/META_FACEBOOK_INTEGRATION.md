# Meta / Facebook Page integration

Streetwise Connection has a server-side Meta Graph API integration scaffold.

## Safety model

The integration is **off by default** and has separate gates for reads, writes,
and Page-metadata writes.

Required production environment variables:

```text
META_INTEGRATION_ENABLED=false
META_WRITES_ENABLED=false
META_METADATA_WRITES_ENABLED=false
META_GRAPH_VERSION=v26.0
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_ADMIN_API_KEY=
```

Do not commit tokens, app secrets, passwords, or admin API keys.

## Supported Streetwise controls

The current integration deliberately exposes a small, auditable surface:

- read the configured Page profile
- list published Page posts
- publish a text/link Page post
- update `about`
- update `description`
- update a non-empty `website` URL

The Streetwise admin API does **not** currently expose Page-name changes,
category changes, profile/cover-photo changes, roles, ads, billing, or Business
Portfolio administration. Those operations must not be represented as automated
until they are separately implemented and verified against the current Meta API.

## Intended Meta permissions

Start with the minimum permissions needed for the operation being enabled:

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts` for publishing
- `pages_manage_metadata` only when Page-profile edits are deliberately enabled

Meta still controls whether a token is actually authorised for these capabilities.
Repository code cannot bypass Meta OAuth, Page roles, Business Portfolio access,
or App Review requirements.

## Free first-party authorisation path

Use Meta's own authorisation flow rather than sending a Facebook password to the
application or storing one in Streetwise.

1. Authorise the Streetwise Meta app with the required Page permissions.
2. Use the resulting User Access Token to query the Pages the user manages.
3. Select the intended Page ID and its Page Access Token.
4. Store the Page Access Token only in deployment secret storage.
5. Verify read-only access before enabling either write switch.

Meta's current Facebook API collection documents `GET /me/accounts` as the
standard way to retrieve Pages a user manages and their Page Access Tokens.

## Why server-side

Page access tokens stay on the server. The browser never receives them. Requests
send the token as an `Authorization: Bearer` header, not in the URL.

The private Streetwise Facebook admin API requires a separate random key of at
least 32 characters. Its responses are marked `Cache-Control: no-store`.

## Rollout

1. Merge and deploy this integration while all three enable flags remain false.
2. Add the Page ID, Page token and admin API key in deployment secret storage.
3. Enable `META_INTEGRATION_ENABLED=true` and verify read-only Page access.
4. Only after read verification, enable `META_WRITES_ENABLED=true`.
5. Keep `META_METADATA_WRITES_ENABLED=false` until Page-profile edits are required.
6. Test a non-sensitive Streetwise Page operation and confirm the result in Facebook.

The integration is deliberately independent of the existing Windsor.ai connector.
