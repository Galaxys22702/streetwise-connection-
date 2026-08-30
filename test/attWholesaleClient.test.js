import assert from "node:assert/strict";
import test from "node:test";
import {
  getAttWholesaleStatus,
  requireAttApiContract,
  requireAttCommercialApproval,
  requireAttLiveProvisioningApproval
} from "../src/providers/attWholesaleClient.js";

const keys = [
  "ATT_PARTNER_PATH",
  "ATT_WHOLESALE_API_BASE_URL",
  "ATT_WHOLESALE_CLIENT_ID",
  "ATT_WHOLESALE_CLIENT_SECRET",
  "ATT_WHOLESALE_ACCOUNT_ID",
  "ATT_COMMERCIAL_CONTRACT_APPROVED",
  "ATT_LIVE_PROVISIONING_ENABLED"
];

function withCleanEnv(fn) {
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}

test("AT&T status exposes no credentials and starts fail-closed", () => withCleanEnv(() => {
  const status = getAttWholesaleStatus();
  assert.equal(status.provider, "att-wholesale");
  assert.equal(status.primaryDomesticCandidate, true);
  assert.equal(status.credentialsConfigured, false);
  assert.equal(status.commercialContractApproved, false);
  assert.equal(status.liveProvisioningEnabled, false);
  assert.equal(status.readyForLiveProvisioning, false);
  assert.equal("clientSecret" in status, false);
  assert.equal("clientId" in status, false);
}));

test("AT&T commercial approval is required before API configuration is considered", () => withCleanEnv(() => {
  assert.throws(() => requireAttCommercialApproval(), /att_wholesale_commercial_contract_not_approved/);
}));

test("AT&T API contract is required after commercial approval", () => withCleanEnv(() => {
  process.env.ATT_COMMERCIAL_CONTRACT_APPROVED = "true";
  assert.throws(() => requireAttApiContract(), /att_wholesale_api_contract_not_configured/);
}));

test("AT&T live provisioning requires an explicit final switch", () => withCleanEnv(() => {
  process.env.ATT_COMMERCIAL_CONTRACT_APPROVED = "true";
  process.env.ATT_WHOLESALE_API_BASE_URL = "https://provider.example.test";
  process.env.ATT_WHOLESALE_CLIENT_ID = "test-client";
  process.env.ATT_WHOLESALE_CLIENT_SECRET = "test-secret";
  process.env.ATT_WHOLESALE_ACCOUNT_ID = "test-account";

  const status = requireAttApiContract();
  assert.equal(status.credentialsConfigured, true);
  assert.equal(status.liveProvisioningEnabled, false);
  assert.throws(() => requireAttLiveProvisioningApproval(), /att_wholesale_live_provisioning_disabled/);
}));
