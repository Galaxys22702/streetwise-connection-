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

test("public health endpoint reports readiness without internal provider or database details", async () => {
  const previousWaitlistEnabled = process.env.WAITLIST_ENABLED;
  process.env.WAITLIST_ENABLED = "true";

  try {
    const res = response();
    await handler({ method: "GET" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.runtime, "vercel");
    assert.equal(res.body.publicLaunchMode, "waitlist");
    assert.deepEqual(res.body.waitlist, { open: true, ready: true });
    assert.equal("database" in res.body, false);
    assert.equal("payments" in res.body, false);
    assert.equal("provider" in res.body, false);
    assert.equal("storage" in res.body, false);
    assert.equal(res.headers["cache-control"], "no-store");
  } finally {
    if (previousWaitlistEnabled === undefined) delete process.env.WAITLIST_ENABLED;
    else process.env.WAITLIST_ENABLED = previousWaitlistEnabled;
  }
});

test("health endpoint rejects unsupported methods", async () => {
  const res = response();
  await handler({ method: "POST" }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "method_not_allowed" });
  assert.equal(res.headers.allow, "GET");
});
