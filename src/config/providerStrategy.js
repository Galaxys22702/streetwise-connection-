export const providerStrategy = Object.freeze({
  domesticPrimary: "att-wholesale",
  domesticFallback: "1global",
  travelData: "esim-go",
  runtimeOrderProvider: "mock",
  publicCarrierBrandClaimAllowed: false,
  liveCellularActivationAllowed: false,
  notes: [
    "AT&T is the primary domestic commercial evaluation path.",
    "1GLOBAL remains the full-stack fallback candidate.",
    "eSIM Go remains a travel/data path and does not block domestic-provider selection.",
    "No AT&T affiliation, resale right, network access, API access, or live activation is implied until written approval is recorded."
  ]
});

export const domesticProviderCandidates = Object.freeze([
  providerStrategy.domesticPrimary,
  providerStrategy.domesticFallback
]);
