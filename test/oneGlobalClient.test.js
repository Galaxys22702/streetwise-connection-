import assert from "node:assert/strict";
import test from "node:test";
import {
  clearOneGlobalTokenCacheForTests,
  getOneGlobalStatus,
  listProductOfferings
} from "../src/providers/oneGlobalClient.js";

const envNames = [
  "ONEGLOBAL_API_BASE_URL",
  "ONEGLOBAL_TOKEN_URL",
  "ONEGLOBAL_CLIENT_ID",
  "ONEGLOBAL_CLIENT_SECRET",
  "ONEGLOBAL_API_VERSION"
];

function saveEnv() {
  return Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
}

function restoreEnv(saved) {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  clearOneGlobalTokenCacheForTests();
}

function configure() {
  process.env.ONEGLOBAL_API_BASE_URL = "https://api.1global.com/connect";
  process.env.ONEGLOBAL_TOKEN_URL = "https://auth.example.test/token";
  process.env.ONEGLOBAL_CLIENT_ID = "client-id";
  process.env.ONEGLOBAL_CLIENT_SECRET = "client-secret";
  process.env.ONEGLOBAL_API_VERSION = "2026-02-05";
  clearOneGlobalTokenCacheForTests();
}

test("status reports readiness without exposing OAuth credentials", () => {
  const saved = saveEnv();
  try {
    configure();
    const status = getOneGlobalStatus();
    assert.equal(status.configured, true);
    assert.equal(status.readOnly, true);
    assert.equal(JSON.stringify(status).includes("client-secret"), false);
  } finally {
    restoreEnv(saved);
  }
});

test("fetches OAuth token then lists active plan offerings for a country", async () => {
  const saved = saveEnv();
  const originalFetch = global.fetch;
  const requests = [];
  try {
    configure();
    global.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).includes("auth.example.test")) {
        return new Response(JSON.stringify({ access_token: "token-123", expires_in: 300 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        _embedded: {
          product_offerings: [{ id: "prdoff_1", name: "US Data Plan", status: "active", type: "plan" }]
        }
      }), { status: 200, headers: { "content-type": "application/hal+json" } });
    };

    const offerings = await listProductOfferings({ country: "us" });
    assert.equal(offerings[0].id, "prdoff_1");
    assert.equal(requests.length, 2);
    assert.match(requests[1].url, /\/product-offerings\?/);
    assert.match(requests[1].url, /status=active/);
    assert.match(requests[1].url, /type=plan/);
    assert.match(requests[1].url, /allowances%5Bcoverage-area%5D%5Bcountries%5D=US/);
    assert.equal(requests[1].options.headers.authorization, "Bearer token-123");
    assert.equal(requests[1].options.headers["Api-Version"], "2026-02-05");
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("fails closed when credentials are missing", async () => {
  const saved = saveEnv();
  try {
    process.env.ONEGLOBAL_TOKEN_URL = "";
    process.env.ONEGLOBAL_CLIENT_ID = "";
    process.env.ONEGLOBAL_CLIENT_SECRET = "";
    clearOneGlobalTokenCacheForTests();
    await assert.rejects(
      () => listProductOfferings({ country: "US" }),
      (error) => error.message === "oneglobal_not_configured" && error.statusCode === 503
    );
  } finally {
    restoreEnv(saved);
  }
});
