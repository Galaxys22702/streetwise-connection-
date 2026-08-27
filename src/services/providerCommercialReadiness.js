const REQUIRED_PROVIDERS = ["esim-go", "1global"];
const COMMERCIAL_ROLES = new Set(["reseller", "agent", "mvno", "customer", "other"]);
const PRICING_SOURCES = new Set(["account-specific-catalogue", "written-quote", "signed-terms"]);

function hasText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function assessProvider(providerId, evidence = {}) {
  const missing = [];
  const pricing = evidence.pricing || {};
  const requireTrue = (field) => {
    if (evidence[field] !== true) missing.push(`${providerId}.${field}`);
  };

  if (!hasText(evidence.evidenceRecordId)) missing.push(`${providerId}.evidenceRecordId`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence.responseDate || "")) {
    missing.push(`${providerId}.responseDate`);
  }
  requireTrue("termsApprovedForUseCase");
  requireTrue("domesticUsePermitted");
  if (!COMMERCIAL_ROLES.has(evidence.commercialRole)) missing.push(`${providerId}.commercialRole`);
  if (!hasText(evidence.providerOfRecord)) missing.push(`${providerId}.providerOfRecord`);
  if (!isNonNegativeNumber(evidence.minimumCommitmentUsd)) {
    missing.push(`${providerId}.minimumCommitmentUsd`);
  }
  requireTrue("networkCoverageConfirmed");
  requireTrue("refundRulesDocumented");
  requireTrue("supportResponsibilitiesDocumented");
  requireTrue("taxResponsibilitiesDocumented");

  if (!hasText(pricing.candidateSku)) missing.push(`${providerId}.pricing.candidateSku`);
  if (!isPositiveNumber(pricing.wholesaleCost)) missing.push(`${providerId}.pricing.wholesaleCost`);
  if (!/^[A-Z]{3}$/.test(pricing.currency || "")) missing.push(`${providerId}.pricing.currency`);
  if (!PRICING_SOURCES.has(pricing.source)) missing.push(`${providerId}.pricing.source`);

  return {
    providerId,
    commercialEvidenceComplete: missing.length === 0,
    missing
  };
}

export function assessProviderCommercialReadiness(input = {}) {
  const controls = input.controls || {};
  const safetyFailures = [];
  if (controls.publicLaunchMode !== "waitlist") safetyFailures.push("controls.publicLaunchMode");
  if (controls.checkoutEnabled !== false) safetyFailures.push("controls.checkoutEnabled");
  if (controls.paymentsEnabled !== false) safetyFailures.push("controls.paymentsEnabled");
  if (controls.liveProviderOrdersEnabled !== false) safetyFailures.push("controls.liveProviderOrdersEnabled");

  const providerResults = REQUIRED_PROVIDERS.map((providerId) => (
    assessProvider(providerId, input.providers?.[providerId])
  ));
  const comparisonReady = (
    safetyFailures.length === 0 &&
    providerResults.every((provider) => provider.commercialEvidenceComplete)
  );

  const selectedProvider = input.selectedProvider;
  const selectedEvidence = input.providers?.[selectedProvider] || {};
  const activationMissing = [];
  if (!REQUIRED_PROVIDERS.includes(selectedProvider)) activationMissing.push("selectedProvider");
  if (input.legalApprovalRecorded !== true) activationMissing.push("legalApprovalRecorded");
  for (const field of [
    "credentialsVerified",
    "catalogueImported",
    "validationPassed",
    "stagingLifecycleTestPassed"
  ]) {
    if (selectedEvidence[field] !== true) activationMissing.push(`${selectedProvider || "selectedProvider"}.${field}`);
  }

  return {
    safetyGatePassed: safetyFailures.length === 0,
    safetyFailures,
    providerResults,
    comparisonReady,
    selectedProvider: selectedProvider || null,
    activationReady: comparisonReady && activationMissing.length === 0,
    activationMissing
  };
}
