import assert from "node:assert/strict";
import test from "node:test";
import {
  checkProviderCoverage,
  getEsimInstallDetails,
  getEsimOrder,
  listEsimOrdersForUser,
  listProviderBundles,
  provisionEsim,
  recordMockUsage
} from "../src/services/esimService.js";

const user = { id: "test-user-001", email: "test@streetwise.example" };

test("mock provider validates coverage and exposes its safe catalogue", async () => {
  process.env.ESIM_PROVIDER = "mock";
  const supported = await checkProviderCoverage({ country: "us", device: "iPhone 15" });
  const unsupported = await checkProviderCoverage({ country: "ZZ", device: "iPhone 15" });
  const bundles = await listProviderBundles({ country: "US" });

  assert.equal(supported.supported, true);
  assert.equal(unsupported.supported, false);
  assert.ok(bundles.some((bundle) => bundle.name === "mock_1GB_7D_GLOBAL"));
});

test("mock eSIM orders are idempotent and only visible to their owner", async () => {
  process.env.ESIM_PROVIDER = "mock";
  const input = {
    bundleName: "mock_1GB_7D_GLOBAL",
    quantity: 1,
    country: "US",
    device: "iPhone 15",
    validateOnly: false
  };

  const first = await provisionEsim(input, { user, idempotencyKey: "test-order-key-001" });
  const replay = await provisionEsim(input, { user, idempotencyKey: "test-order-key-001" });
  const orders = await listEsimOrdersForUser(user.id);

  assert.equal(first.order.status, "completed");
  assert.equal(first.safety.liveOrderExecuted, false);
  assert.equal(first.idempotentReplay, false);
  assert.equal(replay.order.id, first.order.id);
  assert.equal(replay.idempotentReplay, true);
  assert.ok(orders.some((order) => order.id === first.order.id));
  assert.equal(await getEsimOrder(first.order.id, { userId: "another-user" }), null);
  assert.equal(await getEsimInstallDetails(first.order.id, { userId: "another-user" }), null);

  const usage = await recordMockUsage(first.order.id, user.id, 100);
  const installation = await getEsimInstallDetails(first.order.id, { userId: user.id });
  assert.equal(usage.usage.usedBytes, 100 * 1024 * 1024);
  assert.equal(installation.mock, true);
  assert.ok(installation.activationCode.startsWith("LPA:1$"));
});

test("transaction orders require both a user and an idempotency key in the service layer", async () => {
  process.env.ESIM_PROVIDER = "mock";
  const input = {
    bundleName: "mock_1GB_7D_GLOBAL",
    country: "US",
    validateOnly: false
  };

  await assert.rejects(
    () => provisionEsim(input),
    (error) => error.message === "authentication_required" && error.statusCode === 401
  );
  await assert.rejects(
    () => provisionEsim(input, { user }),
    (error) => error.message === "idempotency_key_required" && error.statusCode === 400
  );
});

test("anonymous validation orders are not persisted and quantities are normalized", async () => {
  process.env.ESIM_PROVIDER = "mock";
  const validation = await provisionEsim({
    bundleName: "mock_1GB_7D_GLOBAL",
    quantity: 2.8,
    country: "US",
    device: "iPhone 15",
    validateOnly: true
  });

  assert.equal(validation.order.quantity, 2);
  assert.equal(validation.order.total, 7);
  assert.equal(await getEsimOrder(validation.order.id, { userId: user.id }), null);
});

test("order input validation rejects malformed customer data", async () => {
  process.env.ESIM_PROVIDER = "mock";
  await assert.rejects(
    () => provisionEsim({
      bundleName: "mock_1GB_7D_GLOBAL",
      country: "USA",
      validateOnly: true
    }),
    (error) => error.message === "country_code_invalid" && error.statusCode === 400
  );
  await assert.rejects(
    () => provisionEsim({
      bundleName: "mock_1GB_7D_GLOBAL",
      country: "US",
      customerEmail: "not-an-email",
      validateOnly: true
    }),
    (error) => error.message === "customer_email_invalid" && error.statusCode === 400
  );
});
