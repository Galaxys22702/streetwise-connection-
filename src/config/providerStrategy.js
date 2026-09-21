export const providerStrategy = Object.freeze({
  domesticPrimary: "att-wholesale",
  domesticFallback: "1global",
  domesticPriorityMode: "equal-evaluation",
  domesticEvaluationPriority: Object.freeze(["att-wholesale", "1global"]),
  travelData: "esim-go",
  runtimeOrderProvider: "mock",
  publicCarrierBrandClaimAllowed: false,
  liveCellularActivationAllowed: false,
  notes: [
    "As of 2026-09-20, AT&T and 1GLOBAL have equal domestic commercial evaluation priority because no viable AT&T path was recorded by the fallback trigger date.",
    "domesticPrimary and domesticFallback are retained as compatibility identifiers and do not represent the current evaluation ranking.",
    "eSIM Go remains a travel/data path and does not block domestic-provider selection.",
    "No carrier affiliation, resale right, network access, API access, or live activation is implied until written approval is recorded."
  ]
});

export const domesticProviderCandidates = providerStrategy.domesticEvaluationPriority;
