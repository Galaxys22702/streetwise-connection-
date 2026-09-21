# Meta / Facebook Page integration

Streetwise Connection now has a server-side Meta Graph API integration scaffold.

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

## Intended Meta permissions

Start with the minimum permissions needed for the operation being enabled:

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts` for publishing
- `pages_manage_metadata` only when Page-profile edits are deliberately enabled

Meta still controls whether a token is actually authorised for these capabilities.
Repository code cannot bypass Meta OAuth, Page roles, Business Portfolio access,
or App Review requirements.

## Why server-side

Page access tokens stay on the server. The browser never receives them. Requests
send the token as an `Authorization: Bearer` header, not in the URL.

## Rollout

1. Merge and deploy this integration while all three enable flags remain false.
2. Add the Page ID, Page token and admin API key in Vercel secret storage.
3. Enable `META_INTEGRATION_ENABLED=true` and verify read-only Page access.
4. Only after read verification, enable `META_WRITES_ENABLED=true`.
5. Keep `META_METADATA_WRITES_ENABLED=false` until Page-profile edits are required.
6. Test a non-sensitive Streetwise Page operation and confirm the result in Facebook.

The integration is deliberately independent of the existing Windsor.ai connector.
