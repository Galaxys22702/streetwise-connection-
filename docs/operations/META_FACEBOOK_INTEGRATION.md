# Meta / Facebook Page integration

Streetwise Connection has a server-side Meta Graph API integration plus a
first-party Facebook Login for Business connection path.

## Safety model

The integration is **off by default** and has separate gates for reads, writes,
Page-metadata writes, and OAuth connection setup.

Required production configuration:

```text
META_INTEGRATION_ENABLED=false
META_WRITES_ENABLED=false
META_METADATA_WRITES_ENABLED=false
META_OAUTH_ENABLED=false
META_GRAPH_VERSION=v26.0
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_ADMIN_API_KEY=
META_APP_ID=
META_APP_SECRET=
META_LOGIN_CONFIG_ID=
META_OAUTH_REDIRECT_URI=
META_OAUTH_STATE_SECRET=
META_TOKEN_ENCRYPTION_KEY=
```

`META_PAGE_ACCESS_TOKEN` is now an optional static fallback. The preferred path is
the encrypted OAuth Page connection stored in PostgreSQL. Do not commit tokens,
app secrets, passwords, encryption keys, OAuth state secrets, or admin API keys.

## Control architecture

Streetwise uses the public control plane Meta exposes rather than depending on
Facebook UI automation:

1. Streetwise Meta app
2. Facebook Login for Business / OAuth redirect
3. short-lived authorisation code
4. server-side User access-token exchange
5. server-side long-lived User access-token exchange
6. `GET /me/accounts` to discover authorised Pages, Page tasks and Page tokens
7. exact match against configured `META_PAGE_ID`
8. AES-256-GCM encryption of the Streetwise Page token
9. Pages API calls using the decrypted Page token only on the server
10. optional Page webhooks for event-driven updates in a future change

The Facebook Login for Business configuration for this implementation must be
configured to return a **User access token**. Meta also offers a System-user access
token model for continuous business-asset access, but this implementation does not
consume that model; it deliberately exchanges the User token server-side and then
uses `/me/accounts` to derive the authorised Streetwise Page access token.

The temporary User access tokens are never written to the database. Only the
Streetwise Page token is persisted, encrypted at rest. The callback refuses to
store a token for any Page other than the configured Streetwise Page ID.

## OAuth routes

The existing Facebook router exposes three setup endpoints:

- `GET /api/admin/facebook/oauth/status`
- `GET /api/admin/facebook/oauth/start`
- `GET /api/admin/facebook/oauth/callback`

`/status` and `/start` are private admin operations and require the
`x-streetwise-admin-key` header. `/start` also refuses to redirect to Meta until
`META_TOKEN_ENCRYPTION_KEY` passes the same exact 32-byte validation used by token
storage, so the flow cannot appear configured and then fail only after the callback.
`/start` creates signed OAuth state that expires after ten minutes and responds with
a redirect to Meta. The callback is the only OAuth endpoint intentionally exempt
from the Streetwise admin header because Meta must redirect the browser to it. It
still requires valid signed state, a valid Meta authorisation code, and proof that
the authenticated account can access the exact configured Streetwise Page.

For manual setup, request the protected start endpoint without following redirects,
then open its returned `Location` URL in the browser where the authorised Facebook
account is signed in. For example:

```bash
curl -si \
  -H "x-streetwise-admin-key: $META_ADMIN_API_KEY" \
  https://streetwise-connection.vercel.app/api/admin/facebook/oauth/start
```

Do not put `META_ADMIN_API_KEY` in a URL or commit it to a script. The exact callback
URL configured in Meta must match `META_OAUTH_REDIRECT_URI`. Keep
`META_OAUTH_ENABLED=false` until the Meta app and Facebook Login for Business
configuration are complete.

## Supported Streetwise controls

The current integration deliberately exposes a small, auditable surface:

- read the configured Page profile
- list published Page posts
- publish a text/link Page post
- publish a Page photo with caption text
- update `about`
- update `description`
- update a non-empty `website` URL

Streetwise accepts one internal `message` field for both post types. Feed posts map
that field to Meta's `message` parameter, while Page photo posts map it to the
`caption` parameter on the `/photos` edge.

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

For paid advertising, the separate Meta Marketing API uses ad-account permissions
such as `ads_management`; Page OAuth does not make advertising spend free and does
not bypass Meta billing or ad-review requirements.

## Encrypted token storage

Migration `008_meta_page_connections.sql` stores:

- Page ID
- Page name
- encrypted Page-token ciphertext
- AES-GCM IV and authentication tag
- non-secret Page tasks
- connection/update timestamps

`META_TOKEN_ENCRYPTION_KEY` must represent exactly 32 random bytes, encoded as
64 hexadecimal characters or base64url. It must be stored only in deployment
secret storage and must not reuse the Meta app secret. Stored Page tokens use a
12-byte GCM IV and a required 16-byte / 128-bit authentication tag; malformed or
shortened tags fail closed during decryption.

AES-GCM associated data also binds each encrypted token to its Page ID using the
versioned context `streetwise-meta-page-token:v1:<page-id>`. Moving an otherwise
valid ciphertext/IV/tag tuple to a different Page row therefore fails authentication
instead of decrypting under the wrong identity.

When a static `META_PAGE_ACCESS_TOKEN` is configured, the Page service uses it for
backwards compatibility. Otherwise it loads and decrypts the OAuth Page token
from PostgreSQL.

## Why server-side

Page access tokens stay on the server. The browser never receives them. Graph API
requests send the token as an `Authorization: Bearer` header, not in the URL.

The private Streetwise Facebook admin API requires a separate random key of at
least 32 characters. Its responses are marked `Cache-Control: no-store`.

## Rollout

1. Deploy with all Meta/OAuth enable flags false.
2. Run database migrations so `meta_page_connections` exists.
3. Create the Meta app and Facebook Login for Business configuration.
4. Set the Business Login configuration to return a **User access token**.
5. Put the app secret, state secret and a valid 32-byte encryption key into deployment secret storage.
6. Configure the exact OAuth callback URL and set `META_OAUTH_ENABLED=true`.
7. Confirm the protected OAuth status reports `configured: true`, then call `/api/admin/facebook/oauth/start` with the admin header and open the returned Meta `Location` URL in the browser.
8. Complete Meta authorisation and confirm the callback reports the Streetwise Page ID/name and stores the encrypted Page token.
9. Enable `META_INTEGRATION_ENABLED=true` and verify read-only Page access.
10. Only after read verification, enable `META_WRITES_ENABLED=true`.
11. Keep `META_METADATA_WRITES_ENABLED=false` until Page-profile edits are required.
12. Test a non-sensitive Streetwise Page operation and confirm the result in Facebook.

The first-party path is deliberately independent of the existing Windsor.ai
connector. Windsor may remain as a temporary publishing fallback, but it is not
required for durable Streetwise Page control.
