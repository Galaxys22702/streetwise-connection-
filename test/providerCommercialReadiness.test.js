import assert from "node:assert/strict";
import test from "node:test";
import { assessProviderCommercialReadiness } from "../src/services/providerCommercialReadiness.js";

function completeProvider(overrides = {}) {
  return {
    evidenceRecordId: "secure-record-2026-001",
    responseDate: "2026-08-30",
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
      candidateSku: "us-cellular-plan",
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

function completeAttProvider(overrides = {}) {
  return completeProvider({
    partnerPath: "partner-exchange",
    tier1SupportModelDocumented: true,
    endUserBillingModelDocumented: true,
    frnStatusDocumented: true,
    apiAccessDocumented: true,
    brandingRightsDocumented: true,
    ...overrides
  });
}

function completeEvidence() {
  return {
    controls: {
      publicLaunchMode: "waitlist",
      checkoutEnabled: false,
      paymentsEnabled: false,
      liveProviderOrdersEnabled: false
    },
    selectedProvider: "att-wholesale",
    legalApprovalRecorded: true,
    providers: {
      "att-wholesale": completeAttProvider(),
      "1global": completeProvider({ evidenceRecordId: "secure-record-2026-002" }),
      "esim-go": completeProvider({
        evidenceRecordId: "secure-record-2026-003",
        termsApprovedForUseCase: false,
        domesticUsePermitted: false
      })
    }
  };
}

test("passes domestic comparison and AT&T activation only with complete evidence and safe controls", () => {
  const result = assessProviderCommercialReadiness(completeEvidence());
  assert.equal(result.safetyGatePassed, true);
  assert.equal(result.comparisonReady, true);
  assert.equal(result.activationReady, true);
  assert.equal(result.selectedProvider, "att-wholesale");
});

test("fails closed when an AT&T application fact is unknown", () => {
  const evidence = completeEvidence();
  evidence.providers["att-wholesale"].frnStatusDocumented = false;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.comparisonReady, false);
  assert.ok(result.providerResults[0].missing.includes("att-wholesale.frnStatusDocumented"));
  assert.equal(result.activationReady, false);
});

test("fails closed when the fallback provider commercial facts are incomplete", () => {
  const evidence = completeEvidence();
  evidence.providers["1global"].minimumCommitmentUsd = null;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.comparisonReady, false);
  assert.deepEqual(result.providerResults[1].missing, ["1global.minimumCommitmentUsd"]);
});

test("eSIM Go travel evidence does not block domestic provider comparison", () => {
  const result = assessProviderCommercialReadiness(completeEvidence());
  assert.equal(result.comparisonReady, true);
  assert.equal(result.optionalProviderResults.length, 1);
  assert.equal(result.optionalProviderResults[0].providerId, "esim-go");
  assert.equal(result.optionalProviderResults[0].commercialEvidenceComplete, false);
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

test("keeps activation blocked until AT&T technical and legal evidence is complete", () => {
  const evidence = completeEvidence();
  evidence.legalApprovalRecorded = false;
  evidence.providers["att-wholesale"].validationPassed = false;
  evidence.providers["att-wholesale"].stagingLifecycleTestPassed = false;
  const result = assessProviderCommercialReadiness(evidence);
  assert.equal(result.comparisonReady, true);
  assert.equal(result.activationReady, false);
  assert.deepEqual(result.activationMissing, [
    "legalApprovalRecorded",
    "att-wholesale.validationPassed",
    "att-wholesale.stagingLifecycleTestPassed"
  ]);
});
