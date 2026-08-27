function firstFinite(...values) {
  for (const value of values) {
    if (value === null || value === undefined || typeof value === "boolean") continue;
    if (typeof value === "string" && !value.trim()) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function configuredNumber(options, name, fallback) {
  if (!Object.hasOwn(options, name)) return fallback;
  return firstFinite(options[name]);
}

function normalizeCurrency(value) {
  const currency = firstText(value);
  return currency ? currency.toUpperCase() : null;
}

export function normalizeWholesaleBundle(bundle = {}, options = {}) {
  const price = firstFinite(
    bundle.price,
    bundle.cost,
    bundle.wholesalePrice,
    bundle.pricePerUnit,
    bundle.total
  );

  const dataMb = firstFinite(
    bundle.dataAmount,
    bundle.dataMb,
    bundle.dataMB,
    bundle.allowanceMb,
    bundle.allowanceMB
  );

  const dataGb = firstFinite(
    bundle.dataGb,
    bundle.dataGB,
    bundle.allowanceGb,
    bundle.allowanceGB,
    dataMb === null ? null : dataMb / 1024
  );

  return {
    sku: firstText(bundle.name, bundle.sku, bundle.id, bundle.code) || "unknown",
    description: firstText(bundle.description, bundle.displayName, bundle.name) || "Unknown bundle",
    currency: normalizeCurrency(firstText(bundle.currency, bundle.currencyCode, options.providerCurrency)),
    wholesaleCost: price,
    dataGb,
    durationDays: firstFinite(bundle.duration, bundle.durationDays, bundle.validity, bundle.validityDays),
    countries: Array.isArray(bundle.countries) ? bundle.countries : [],
    raw: bundle
  };
}

export function calculateUnitEconomics(bundle, options = {}) {
  const retailCurrency = normalizeCurrency(options.retailCurrency) || "USD";
  const normalized = normalizeWholesaleBundle(bundle, {
    providerCurrency: normalizeCurrency(options.providerCurrency)
  });
  const retailPrice = configuredNumber(options, "retailPrice", 10);
  const paymentRate = configuredNumber(options, "paymentRate", 0.029);
  const paymentFixedFee = configuredNumber(options, "paymentFixedFee", 0.30);
  const supportReserve = configuredNumber(options, "supportReserve", 0.50);
  const taxReserveRate = configuredNumber(options, "taxReserveRate", 0);
  const infrastructureReserve = configuredNumber(options, "infrastructureReserve", 0.25);
  const minimumMarginPercent = configuredNumber(options, "minimumMarginPercent", 0);
  const wholesaleStressRate = configuredNumber(options, "wholesaleStressRate", 0);

  const assumptionsValid = (
    /^[A-Z]{3}$/.test(retailCurrency) &&
    retailPrice !== null && retailPrice > 0 &&
    paymentRate !== null && paymentRate >= 0 && paymentRate <= 1 &&
    paymentFixedFee !== null && paymentFixedFee >= 0 &&
    supportReserve !== null && supportReserve >= 0 &&
    taxReserveRate !== null && taxReserveRate >= 0 && taxReserveRate <= 1 &&
    infrastructureReserve !== null && infrastructureReserve >= 0 &&
    minimumMarginPercent !== null && minimumMarginPercent >= 0 && minimumMarginPercent <= 100 &&
    wholesaleStressRate !== null && wholesaleStressRate >= 0 && wholesaleStressRate <= 1
  );

  if (!assumptionsValid) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "invalid_economics_assumptions"
    };
  }

  if (normalized.wholesaleCost === null) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "wholesale_cost_missing"
    };
  }

  if (normalized.wholesaleCost < 0) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "wholesale_cost_invalid"
    };
  }

  if (!normalized.currency) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "provider_currency_missing"
    };
  }

  if (!/^[A-Z]{3}$/.test(normalized.currency)) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "provider_currency_invalid"
    };
  }

  if (normalized.currency !== retailCurrency) {
    return {
      ...normalized,
      retailCurrency,
      retailPrice,
      viable: false,
      reason: "currency_conversion_required"
    };
  }

  const paymentFees = retailPrice * paymentRate + paymentFixedFee;
  const taxReserve = retailPrice * taxReserveRate;
  const contribution = retailPrice
    - normalized.wholesaleCost
    - paymentFees
    - supportReserve
    - taxReserve
    - infrastructureReserve;
  const marginPercent = retailPrice > 0 ? (contribution / retailPrice) * 100 : null;
  const stressedWholesaleCost = normalized.wholesaleCost * (1 + wholesaleStressRate);
  const stressedContribution = retailPrice
    - stressedWholesaleCost
    - paymentFees
    - supportReserve
    - taxReserve
    - infrastructureReserve;
  const stressedMarginPercent = retailPrice > 0
    ? (stressedContribution / retailPrice) * 100
    : null;
  const contributionPositive = contribution > 0;
  const marginThresholdPassed = marginPercent >= minimumMarginPercent;
  const stressTestPassed = stressedContribution > 0;
  const viable = contributionPositive && marginThresholdPassed && stressTestPassed;

  let reason = "commercial_gate_passed";
  if (!contributionPositive) reason = "negative_contribution";
  else if (!marginThresholdPassed) reason = "margin_below_threshold";
  else if (!stressTestPassed) reason = "stress_test_negative";
  else if (minimumMarginPercent === 0 && wholesaleStressRate === 0) reason = "positive_contribution";

  return {
    ...normalized,
    retailCurrency,
    retailPrice,
    paymentFees,
    supportReserve,
    taxReserve,
    infrastructureReserve,
    contribution,
    marginPercent,
    minimumMarginPercent,
    wholesaleStressRate,
    stressedWholesaleCost,
    stressedContribution,
    stressedMarginPercent,
    marginThresholdPassed,
    stressTestPassed,
    viable,
    reason
  };
}

export function rankBundles(bundles = [], options = {}) {
  return bundles
    .map((bundle) => calculateUnitEconomics(bundle, options))
    .sort((a, b) => {
      if (a.contribution === undefined) return 1;
      if (b.contribution === undefined) return -1;
      return b.contribution - a.contribution;
    });
}
