# Streetwise Calling iPhone pilot

Private browser voice rooms and device-local audio checks for the Las Vegas pilot. The browser can start a host room, share a single-use invite, join, mute, and end the call. The Worker relays signaling through a D1 database. The browser sends and receives media over WebRTC. The regular-number form checks format locally.

## Build and test

From this directory, using Node.js 22 or later:

```bash
node --test worker/*.test.mjs
node build.mjs
```

The Worker entry point is `dist/server/index.js`. A private deployment needs a D1 binding named `DB`, the SQL migration under `drizzle/`, and a trusted platform that injects authenticated visitor identity. Configure the deployment project manifest in the hosting project. Keep the Worker behind that identity boundary.

## Verification

The automated tests exercise one-use invites, ordered signaling, duplicate acknowledgments, and hangup. They also verify that leaving the host page while an invite is waiting preserves the room. The live pilot has separate microphone loopback, synthetic tone, and speaker tests plus an inbound-audio packet indicator during calls.

Live Safari-to-Safari audio and calls across different networks still need device testing. Cross-network coverage may require TURN. Public phone calling, retail pricing, and comparative speed claims are outside this pilot.
