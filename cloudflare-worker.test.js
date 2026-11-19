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

test("keeps JARVIS locked without a private access token and customer APIs closed", async () => {
  const jarvis = await worker.fetch(new Request(`${base}/api/jarvis/status`), {});
  assert.equal(jarvis.status, 503);
  assert.equal((await jarvis.json()).error, "jarvis_access_not_configured");
  const payments = await worker.fetch(new Request(`${base}/api/payments/checkout`, { method: "POST" }), {});
  assert.equal(payments.status, 404);
});

const token = "local-test-only-token-that-is-not-a-real-secret";
const auth = { authorization: `Bearer ${token}` };

test("rejects an incorrect JARVIS token", async () => {
  const res = await worker.fetch(new Request(`${base}/api/jarvis/status`, {
    headers: { authorization: "Bearer incorrect" }
  }), { JARVIS_ACCESS_TOKEN: token, OPENROUTER_API_KEY: "not-a-real-key" });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, "jarvis_access_denied");
});

test("connects with correct JARVIS token but reports missing provider", async () => {
  const res = await worker.fetch(new Request(`${base}/api/jarvis/status`, { headers: auth }), {
    JARVIS_ACCESS_TOKEN: token
  });
  assert.equal(res.status, 200);
  const status = await res.json();
  assert.equal(status.aiConfigured, false);
  assert.equal(status.commandsAvailable, false);
  assert.equal(status.computerControl, false);
});

test("routes chat only to OpenRouter's free model with zero price ceiling", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(options.headers.authorization, "Bearer not-a-real-key");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "openrouter/free");
    assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0 });
    assert.equal(body.messages[1].content, "Hello");
    return Response.json({ choices: [{ message: { content: "Hi there" } }] });
  };
  const res = await worker.fetch(new Request(`${base}/api/jarvis/chat`, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] })
  }), { JARVIS_ACCESS_TOKEN: token, OPENROUTER_API_KEY: "not-a-real-key" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, reply: "Hi there", source: "ai" });
});

test("never calls paid models even when configured", async () => {
  globalThis.fetch = async () => { throw new Error("Paid model request must not occur"); };
  const res = await worker.fetch(new Request(`${base}/api/jarvis/chat`, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] })
  }), { JARVIS_ACCESS_TOKEN: token, OPENROUTER_API_KEY: "not-a-real-key", JARVIS_AI_MODEL: "openai/gpt-4" });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "jarvis_free_model_required");
});

test("rejects malformed chat history before provider call", async () => {
  globalThis.fetch = async () => { throw new Error("Invalid input must not reach provider"); };
  const res = await worker.fetch(new Request(`${base}/api/jarvis/chat`, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "assistant", content: "bad" }] })
  }), { JARVIS_ACCESS_TOKEN: token, OPENROUTER_API_KEY: "not-a-real-key" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "jarvis_invalid_messages");
});

test("refuses paid-provider response without retry or fallback", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({}, { status: 402 }); };
  const res = await worker.fetch(new Request(`${base}/api/jarvis/chat`, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] })
  }), { JARVIS_ACCESS_TOKEN: token, OPENROUTER_API_KEY: "not-a-real-key" });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, "jarvis_provider_billing_required");
  assert.equal(calls, 1);
});

test("provides local /status without an AI key", async () => {
  globalThis.fetch = async () => { throw new Error("No provider request expected"); };
  const res = await worker.fetch(new Request(`${base}/api/jarvis/chat`, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "/status" }] })
  }), { JARVIS_ACCESS_TOKEN: token });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).source, "streetwise.status");
});

test("denies command execution even with a valid token", async () => {
  const res = await worker.fetch(new Request(`${base}/api/jarvis/commands/run`, {
    method: "POST", headers: auth
  }), { JARVIS_ACCESS_TOKEN: token });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "jarvis_commands_unavailable");
});

test("passes static assets to Cloudflare", async () => {
  const res = await worker.fetch(new Request(`${base}/index.html`), { ASSETS: { fetch: async () => new Response("static works") } });
  assert.equal(await res.text(), "static works");
});
