import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/health.js";

function response() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("health endpoint reports runtime dependencies and launch safety without exposing secrets", async () => {
  const res = response();
  await handler({ method: "GET" }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.runtime, "vercel");
  assert.equal(res.body.database.configured, false);
  assert.equal(res.body.database.connected, false);
  assert.equal(res.body.payments.provider, "mock");
  assert.equal(res.body.provider.provider, "mock");
  assert.equal(res.body.publicLaunchMode, "waitlist");
  assert.equal(res.body.waitlist.open, true);
  assert.ok(res.body.waitlist.consentVersion);
  assert.equal(res.body.waitlist.storageConfigured, true);
  assert.equal(res.body.waitlist.storageProvider, "supabase");
  assert.ok(res.body.waitlist.supportEmail);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("health endpoint rejects unsupported methods", async () => {
  const res = response();
  await handler({ method: "POST" }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "method_not_allowed" });
  assert.equal(res.headers.allow, "GET");
});
