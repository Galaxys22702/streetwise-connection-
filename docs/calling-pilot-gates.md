# Streetwise Calling Pilot: deployment gates

The calling pilot is **disabled by default**. Never enable it just because CI
passes. The current signaling queue is in-process memory and cannot provide
reliable delivery across multiple Vercel functions, containers or replicas.

## Before any private two-device test

1. Verify the actual private PostgreSQL schema exists, including the
   `streetwise_core.customers.legacy_user_id` column. Do not apply migrations
   without inspecting the live schema and checking for existing data.
2. Authenticate two distinct Streetwise test accounts. Never accept an account
   ID, verified flag, or ownership claim from the request body.
3. Implement a device-possession challenge and mark both devices verified only
   after successful proof. Enrollment alone does **not** verify a device.
4. Create a call session through an authenticated endpoint with mutual
   participant authorization. No such endpoint exists yet.
5. Replace the in-memory queue with a durable, access-controlled signaling
   transport, or run an explicitly single-instance, short-lived private test.
6. Test authorization denial, device revocation, message expiry, replay,
   request limits, service restarts and multiple server instances.
7. Only in an isolated, authorized pilot environment, set
   `STREETWISE_CALLING_PILOT_ENABLED=true` and ensure the environment is not
   in public waitlist-only mode.

## Explicit non-capabilities

This is **not** PSTN calling, mobile-number provisioning, carrier access,
emergency calling, or a production voice service. No eSIM or payment feature
is activated by these changes. Do not market it as a launched service.
