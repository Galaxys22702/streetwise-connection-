# Streetwise Calling iPhone pilot

Private browser voice rooms and device-local audio checks for the Las Vegas pilot. The browser can start a host room, share a single-use invite, join, mute, and end the call. The Worker relays signaling through a D1 database. The browser sends and receives media over WebRTC. The regular-number form checks format locally.

## Build and test

From this directory, using Node.js 22 or later:

```bash
node --test worker/*.test.mjs
node build.mjs
```

The Worker entry point is `dist/server/index.js`. A private deployment needs a D1 binding named `DB`, the SQL migration under `drizzle/`, and **Cloudflare Access protecting the separate pilot Worker**. Its API checks `ctx.access.getIdentity()` and refuses requests without a verified Access identity. An arbitrary user-ID request header does not authenticate anybody. Configure only the two invited testers in the Access allow policy. Do **not** deploy this over the existing public Streetwise Worker.

## Separate test deployment

1. Create a new Cloudflare D1 database called `streetwise-iphone-pilot` in your own account. Keep it separate from all production databases.
2. Copy `wrangler.example.toml` to a local `wrangler.toml`, replace `REPLACE_WITH_D1_DATABASE_ID` with the database's real ID, and run the D1 migration `drizzle/0000_call_rooms.sql` against that database. Do not publish credentials.
3. From this directory, run `node build.mjs`, then use `npx wrangler deploy --config wrangler.toml` to create the **separate** pilot Worker. Do not link it to `streetwiseconnection.com` yet.
4. In Cloudflare dashboard, open **Workers & Pages → streetwise-iphone-pilot → Access → Protect this Worker behind Access → All traffic**. Limit authentication to the two testers' individual email identities. The rooms API fails closed before Access is enabled, but make the Worker private before sharing its URL.
5. Open the HTTPS pilot URL in Safari on both iPhones, sign into Cloudflare Access, tap **Start call** on phone 1, share its one-use invite with phone 2, and tap **Join call** there. Allow microphone permissions on both devices. Test first on Wi-Fi, then phone 2 on cellular data.

Cloudflare's public `stun.cloudflare.com:3478` service is free for peer discovery. This pilot has **no TURN credentials or media relay configured**; some carrier networks will fail to connect and must be marked as blocked rather than called successful. This cannot call regular phone numbers. The current code has not been verified on two physical phones.

## Verification

The automated tests exercise one-use invites, ordered signaling, duplicate acknowledgments, and hangup. They also verify that leaving the host page while an invite is waiting preserves the room. The live pilot has separate microphone loopback, synthetic tone, and speaker tests plus an inbound-audio packet indicator during calls.

Live Safari-to-Safari audio and calls across different networks still need device testing. Cross-network coverage may require TURN. Public phone calling, retail pricing, and comparative speed claims are outside this pilot.
