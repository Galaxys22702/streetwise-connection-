import assert from "node:assert/strict";
import test from "node:test";
import { assessProviderCommercialReadiness } from "../src/services/providerCommercialReadiness.js";

function completeProvider(overrides = {}) {
  return {
    evidenceRecordId: "secure-record-2026-001",
    responseDate: "2026-08-27",
    termsApprovedForUseCase: true,
    domesticUsePermitted: true,
    commercialRole: "reseller",
    providerOfRecord: "provider",
    minimumCommitmentUsd: 0,
    networkCoverageConfirmed: true,
    refundRulesDocumented: true,
    supportResponsibilitiesDocumented: true,
    taxResponsibilitiesDocumented: true,
    pricing: {
      candidateSku: "us-data-plan",
      wholesaleCost: 4,
      currency: "USD",
      source: "written-quote"
    },
    credentialsVerified: true,
    catalogueImported: true,
    validationPassed: true,
    stagingLifecycleTestPassed: true,
    ...overrides
  };
}

function completeEvidence() {
  return {
    controls: {
      publicLaunchMode: "waitlist",
      checkoutEnabled: false,
      paymentsEnabled: false,
      liveProviderOrdersEnabled: false
    },
    selectedProvider: "esim-go",
    legalApprovalRecorded: true,
    providers: {
      "esim-go": completeProvider(),
      "1global": completeProvider({ evidenceRecordId: "secure-record-2026-002" })
    }
  };
}

test("passes comparison and activation only with complete evidence and safe controls", () => {
  const result = assessProviderCommercialReadiness(completeEvidence());
  assert.equal(result.safetyGatePassed, true);
  assert.equal(result.comparisonReady, true);
  assert.equal(result.activationReady, true);
});

test("fails closed when a commercial fact is unknown", () => {
  const evidence = completeEvidence();
  evidence.providers["1global"].minimumCommitmentUsd = null;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.comparisonReady, false);
  assert.deepEqual(result.providerResults[1].missing, ["1global.minimumCommitmentUsd"]);
  assert.equal(result.activationReady, false);
});

test("rejects public commerce or live provider ordering during evidence review", () => {
  const evidence = completeEvidence();
  evidence.controls.checkoutEnabled = true;
  evidence.controls.liveProviderOrdersEnabled = true;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.safetyGatePassed, false);
  assert.deepEqual(result.safetyFailures, [
    "controls.checkoutEnabled",
    "controls.liveProviderOrdersEnabled"
  ]);
  assert.equal(result.comparisonReady, false);
});

test("keeps activation blocked after comparison until technical and legal evidence is complete", () => {
  const evidence = completeEvidence();
  evidence.legalApprovalRecorded = false;
  evidence.providers["esim-go"].validationPassed = false;
  evidence.providers["esim-go"].stagingLifecycleTestPassed = false;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.comparisonReady, true);
  assert.equal(result.activationReady, false);
  assert.deepEqual(result.activationMissing, [
    "legalApprovalRecorded",
    "esim-go.validationPassed",
    "esim-go.stagingLifecycleTestPassed"
  ]);
});
