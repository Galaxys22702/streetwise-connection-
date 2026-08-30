import assert from "node:assert/strict";
import test from "node:test";
import { domesticProviderCandidates, providerStrategy } from "../src/config/providerStrategy.js";

test("AT&T is primary without enabling public affiliation or live activation", () => {
  assert.equal(providerStrategy.domesticPrimary, "att-wholesale");
  assert.equal(providerStrategy.domesticFallback, "1global");
  assert.equal(providerStrategy.travelData, "esim-go");
  assert.equal(providerStrategy.runtimeOrderProvider, "mock");
  assert.equal(providerStrategy.publicCarrierBrandClaimAllowed, false);
  assert.equal(providerStrategy.liveCellularActivationAllowed, false);
  assert.deepEqual(domesticProviderCandidates, ["att-wholesale", "1global"]);
});
