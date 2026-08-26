import assert from "node:assert/strict";

const baseUrl = new URL(process.argv[2] || process.env.APP_BASE_URL || "https://streetwise-connection.vercel.app");
const smokeEmail = String(process.env.SMOKE_TEST_EMAIL || "").trim();

async function request(path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    ...options,
    headers: {
      accept: "application/json, text/html;q=0.9",
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text();
  return { response, body };
}

function assertWaitlistBlock(result, path) {
  assert.equal(result.response.status, 503, `${path} must stay blocked during waitlist launch`);
  assert.equal(result.body?.error, "public_waitlist_only", `${path} returned the wrong launch guard error`);
}

console.log(`Smoke checking ${baseUrl.origin}`);

const landing = await request("/");
assert.equal(landing.response.status, 200, "landing page must return 200");
assert.match(String(landing.body), /Streetwise Connection/i, "landing page must identify Streetwise Connection");
assert.match(String(landing.body), /waitlist/i, "landing page must remain waitlist-focused");

const privacy = await request("/waitlist-privacy.html");
assert.equal(privacy.response.status, 200, "waitlist privacy notice must return 200");
assert.match(String(privacy.body), /Waitlist privacy notice/i, "waitlist privacy notice content is missing");

const publicStatus = await request("/api/public-status");
assert.equal(publicStatus.response.status, 200, "public status must return 200");
assert.equal(publicStatus.body?.publicLaunchMode, "waitlist", "production must remain in waitlist launch mode");
assert.ok(publicStatus.body?.waitlist?.consentVersion, "waitlist consent version must be published");

const health = await request("/health");
assert.equal(health.response.status, 200, "health endpoint must return 200");
assert.equal(health.body?.ok, true, "health endpoint must report ok");
assert.equal(health.body?.payments?.liveModeEnabled, false, "live Stripe mode must stay disabled during waitlist launch");
assert.equal(health.body?.provider?.liveOrdersEnabled, false, "live eSIM ordering must stay disabled during waitlist launch");

for (const [path, body] of [
  ["/api/auth/register", { email: "smoke@example.invalid", password: "not-used" }],
  ["/api/payments/checkout", { planId: "smoke" }],
  ["/api/coverage/check", { country: "US" }],
  ["/api/esims/order", { validateOnly: true }]
]) {
  const result = await request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  assertWaitlistBlock(result, path);
}

if (publicStatus.body.waitlist.open) {
  assert.equal(health.body?.database?.configured, true, "open waitlist requires configured production storage");
  assert.equal(health.body?.database?.connected, true, "open waitlist requires connected production storage");

  if (smokeEmail) {
    const join = await request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: smokeEmail,
        consentVersion: publicStatus.body.waitlist.consentVersion
      })
    });
    assert.equal(join.response.status, 201, "smoke waitlist signup must succeed when the waitlist is open");
    assert.equal(join.body?.joined, true, "smoke waitlist signup must report joined=true");
    console.log(`Verified live waitlist persistence path with ${smokeEmail}`);
  } else {
    console.log("Waitlist is open; signup write test skipped because SMOKE_TEST_EMAIL is not set.");
  }
} else {
  const closedJoin = await request("/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "smoke@example.invalid",
      consentVersion: publicStatus.body.waitlist.consentVersion
    })
  });
  assert.equal(closedJoin.response.status, 503, "closed waitlist must reject signup writes");
  assert.equal(closedJoin.body?.error, "waitlist_not_open", "closed waitlist must return waitlist_not_open");
}

console.log("Production smoke check passed.");
