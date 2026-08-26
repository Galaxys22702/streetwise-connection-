import assert from "node:assert/strict";
import test from "node:test";
import {
  createEsimOrder,
  getInstallDetails,
  getProviderStatus,
  listBundles
} from "../src/providers/esimGoProvider.js";

const envNames = [
  "ESIM_API_BASE_URL",
  "ESIM_API_KEY",
  "ESIM_WEBHOOKS_ENABLED",
  "ESIM_LIVE_ORDERS_ENABLED"
];

function saveEnv() {
  return Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
}

function restoreEnv(saved) {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function configure({ live = false } = {}) {
  process.env.ESIM_API_BASE_URL = "https://api.esim-go.com/v2.5";
  process.env.ESIM_API_KEY = "test-provider-key";
  process.env.ESIM_WEBHOOKS_ENABLED = "false";
  process.env.ESIM_LIVE_ORDERS_ENABLED = live ? "true" : "false";
}

test("provider status reports configuration without exposing the API key", () => {
  const saved = saveEnv();
  try {
    configure();
    const status = getProviderStatus();
    assert.deepEqual(status, {
      provider: "esim-go",
      configured: true,
      webhooksEnabled: false,
      liveOrdersEnabled: false,
      baseUrl: "https://api.esim-go.com/v2.5"
    });
    assert.equal(JSON.stringify(status).includes("test-provider-key"), false);
  } finally {
    restoreEnv(saved);
  }
});

test("catalogue requests use the API key and normalized country filter", async () => {
  const saved = saveEnv();
  const originalFetch = global.fetch;
  let request;

  try {
    configure();
    global.fetch = async (url, options = {}) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify([{ name: "esim_1GB_7D_US_V2" }]), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const bundles = await listBundles({ country: "us" });
    assert.equal(bundles[0].name, "esim_1GB_7D_US_V2");
    assert.match(request.url, /\/catalogue\?countries=US&perPage=100$/);
    assert.equal(request.options.headers["X-API-Key"], "test-provider-key");
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("validation mode cannot execute a live order while the live-order switch is off", async () => {
  const saved = saveEnv();
  const originalFetch = global.fetch;
  let payload;

  try {
    configure({ live: false });
    global.fetch = async (_url, options = {}) => {
      payload = JSON.parse(options.body);
      return new Response(JSON.stringify({
        order: [{ item: "esim_1GB_7D_US_V2", quantity: 1, pricePerUnit: 2.5 }],
        total: 2.5,
        valid: true,
        currency: "USD",
        assigned: false
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const result = await createEsimOrder({
      bundleName: "esim_1GB_7D_US_V2",
      quantity: 1,
      validateOnly: false
    });

    assert.equal(payload.type, "validate");
    assert.equal(payload.assign, false);
    assert.deepEqual(payload.order, [{ type: "bundle", quantity: 1, item: "esim_1GB_7D_US_V2" }]);
    assert.equal(result.mode, "validate");
    assert.equal(result.liveOrderExecuted, false);
    assert.equal(result.total, 2.5);
    assert.equal(result.currency, "USD");
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("transaction mode requires both the live-order switch and validateOnly=false", async () => {
  const saved = saveEnv();
  const originalFetch = global.fetch;
  let payload;

  try {
    configure({ live: true });
    global.fetch = async (_url, options = {}) => {
      payload = JSON.parse(options.body);
      return new Response(JSON.stringify({
        total: 2.5,
        currency: "USD",
        status: "completed",
        statusMessage: "Order completed",
        orderReference: "order-ref-001",
        assigned: true
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const result = await createEsimOrder({
      bundleName: "esim_1GB_7D_US_V2",
      quantity: 1,
      validateOnly: false
    });

    assert.equal(payload.type, "transaction");
    assert.equal(payload.assign, true);
    assert.equal(result.mode, "transaction");
    assert.equal(result.liveOrderExecuted, true);
    assert.equal(result.orderReference, "order-ref-001");
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("install-detail requests use the current assignments endpoint and request direct install URLs", async () => {
  const saved = saveEnv();
  const originalFetch = global.fetch;
  let requestUrl;

  try {
    configure();
    global.fetch = async (url) => {
      requestUrl = String(url);
      return new Response(JSON.stringify({
        iccid: "8944123456789012345",
        matchingId: "MATCH-001",
        smdpAddress: "rsp.example.com",
        profileStatus: "Released",
        appleInstallUrl: "https://example.invalid/apple",
        androidInstallUrl: "https://example.invalid/android"
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const details = await getInstallDetails("order ref 001");
    assert.match(requestUrl, /\/esims\/assignments\?reference=order\+ref\+001&additionalFields=installUrl$/);
    assert.equal(details.iccid, "8944123456789012345");
    assert.ok(details.appleInstallUrl);
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("provider calls fail closed when the API key is missing", async () => {
  const saved = saveEnv();
  try {
    process.env.ESIM_API_KEY = "";
    await assert.rejects(
      () => listBundles({ country: "US" }),
      (error) => error.message === "esim_provider_not_configured" && error.statusCode === 503
    );
  } finally {
    restoreEnv(saved);
  }
});
