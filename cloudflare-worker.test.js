import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "./cloudflare-worker.js";

const originalFetch = globalThis.fetch;
const base = "https://streetwise-connection.example.workers.dev";
const consent = "2026-08-26";

beforeEach(() => { globalThis.fetch = originalFetch; });
after(() => { globalThis.fetch = originalFetch; });

test("serves the public waitlist status without exposing backend details", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, "GET");
    return Response.json({ waitlist: { open: true, consentVersion: consent, supportEmail: "help@example.test" } });
  };
  const res = await worker.fetch(new Request(`${base}/api/public-status`), {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.waitlist.open, true);
  assert.equal(data.waitlist.supportEmail, "help@example.test");
});

test("closes signup when the storage service is unavailable", async () => {
  globalThis.fetch = async () => { throw new Error("unavailable"); };
  const res = await worker.fetch(new Request(`${base}/api/public-status`), {});
  assert.equal(res.status, 503);
  assert.equal((await res.json()).waitlist.open, false);
});

test("rejects invalid consent and does not submit data", async () => {
  globalThis.fetch = async () => { throw new Error("must not call upstream"); };
  const res = await worker.fetch(new Request(`${base}/api/waitlist`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "test@example.test", consentVersion: "old" })
  }), {});
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "waitlist_consent_required");
});

test("rejects cross-origin submissions", async () => {
  const res = await worker.fetch(new Request(`${base}/api/waitlist`, {
    method: "POST", headers: { "content-type": "application/json", origin: "https://other.example" },
    body: JSON.stringify({ email: "test@example.test", consentVersion: consent })
  }), {});
  assert.equal(res.status, 403);
});

test("confirms waitlist signup only after successful upstream storage", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, "POST");
    assert.equal(options.headers["x-forwarded-for"], "198.51.100.42");
    assert.deepEqual(JSON.parse(options.body), { email: "test@example.test", consentVersion: consent });
    assert.equal(options.headers.origin, undefined);
    return Response.json({ joined: true }, { status: 201 });
  };
  const res = await worker.fetch(new Request(`${base}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.42" },
    body: JSON.stringify({ email: " TEST@EXAMPLE.TEST ", consentVersion: consent })
  }), {});
  assert.equal(res.status, 201);
  assert.equal((await res.json()).joined, true);
});

test("keeps unavailable JARVIS and unfinished customer APIs closed", async () => {
  const jarvis = await worker.fetch(new Request(`${base}/api/jarvis/status`), {});
  assert.equal(jarvis.status, 503);
  assert.equal((await jarvis.json()).error, "jarvis_disabled");
  const payments = await worker.fetch(new Request(`${base}/api/payments/checkout`, { method: "POST" }), {});
  assert.equal(payments.status, 404);
});

test("passes static assets to Cloudflare", async () => {
  const res = await worker.fetch(new Request(`${base}/index.html`), { ASSETS: { fetch: async () => new Response("static works") } });
  assert.equal(await res.text(), "static works");
});
