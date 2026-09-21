import assert from "node:assert/strict";
import test from "node:test";
import { domesticProviderCandidates, providerStrategy } from "../src/config/providerStrategy.js";

test("AT&T and 1GLOBAL are equal evaluation priorities without enabling affiliation or activation", () => {
  assert.equal(providerStrategy.domesticPrimary, "att-wholesale");
  assert.equal(providerStrategy.domesticFallback, "1global");
  assert.equal(providerStrategy.domesticPriorityMode, "equal-evaluation");
  assert.deepEqual(providerStrategy.domesticEvaluationPriority, ["att-wholesale", "1global"]);
  assert.equal(providerStrategy.travelData, "esim-go");
  assert.equal(providerStrategy.runtimeOrderProvider, "mock");
  assert.equal(providerStrategy.publicCarrierBrandClaimAllowed, false);
  assert.equal(providerStrategy.liveCellularActivationAllowed, false);
  assert.deepEqual(domesticProviderCandidates, ["att-wholesale", "1global"]);
});
