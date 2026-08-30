function boolEnv(name, fallback = false) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return value === "true";
}

function getConfig() {
  return {
    partnerPath: String(process.env.ATT_PARTNER_PATH || "").trim().toLowerCase(),
    apiBaseUrl: String(process.env.ATT_WHOLESALE_API_BASE_URL || "").trim().replace(/\/$/, ""),
    clientId: String(process.env.ATT_WHOLESALE_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.ATT_WHOLESALE_CLIENT_SECRET || "").trim(),
    accountId: String(process.env.ATT_WHOLESALE_ACCOUNT_ID || "").trim(),
    commercialContractApproved: boolEnv("ATT_COMMERCIAL_CONTRACT_APPROVED"),
    liveProvisioningEnabled: boolEnv("ATT_LIVE_PROVISIONING_ENABLED")
  };
}

export function getAttWholesaleStatus() {
  const config = getConfig();
  const credentialsConfigured = Boolean(
    config.apiBaseUrl &&
    config.clientId &&
    config.clientSecret &&
    config.accountId
  );

  return {
    provider: "att-wholesale",
    primaryDomesticCandidate: true,
    partnerPath: config.partnerPath || null,
    credentialsConfigured,
    commercialContractApproved: config.commercialContractApproved,
    liveProvisioningEnabled: config.liveProvisioningEnabled,
    integrationMode: credentialsConfigured ? "contract-defined" : "commercial-gate-only",
    readyForLiveProvisioning:
      credentialsConfigured &&
      config.commercialContractApproved &&
      config.liveProvisioningEnabled
  };
}

export function requireAttCommercialApproval() {
  const status = getAttWholesaleStatus();
  if (!status.commercialContractApproved) {
    const error = new Error("att_wholesale_commercial_contract_not_approved");
    error.statusCode = 503;
    throw error;
  }
  return status;
}

export function requireAttApiContract() {
  const status = requireAttCommercialApproval();
  if (!status.credentialsConfigured) {
    const error = new Error("att_wholesale_api_contract_not_configured");
    error.statusCode = 503;
    throw error;
  }
  return status;
}

export function requireAttLiveProvisioningApproval() {
  const status = requireAttApiContract();
  if (!status.liveProvisioningEnabled) {
    const error = new Error("att_wholesale_live_provisioning_disabled");
    error.statusCode = 503;
    throw error;
  }
  return status;
}
