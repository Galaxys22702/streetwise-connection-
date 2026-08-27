function firstFinite(...values) {
  for (const value of values) {
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

export function normalizeWholesaleBundle(bundle = {}) {
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
    currency: (firstText(bundle.currency, bundle.currencyCode) || "USD").toUpperCase(),
    wholesaleCost: price,
    dataGb,
    durationDays: firstFinite(bundle.duration, bundle.durationDays, bundle.validity, bundle.validityDays),
    countries: Array.isArray(bundle.countries) ? bundle.countries : [],
    raw: bundle
  };
}

export function calculateUnitEconomics(bundle, options = {}) {
  const normalized = normalizeWholesaleBundle(bundle);
  const retailPrice = firstFinite(options.retailPrice, 10) ?? 10;
  const paymentRate = firstFinite(options.paymentRate, 0.029) ?? 0.029;
  const paymentFixedFee = firstFinite(options.paymentFixedFee, 0.30) ?? 0.30;
  const supportReserve = firstFinite(options.supportReserve, 0.50) ?? 0.50;
  const taxReserveRate = firstFinite(options.taxReserveRate, 0) ?? 0;
  const infrastructureReserve = firstFinite(options.infrastructureReserve, 0.25) ?? 0.25;

  if (normalized.wholesaleCost === null) {
    return {
      ...normalized,
      retailPrice,
      viable: false,
      reason: "wholesale_cost_missing"
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

  return {
    ...normalized,
    retailPrice,
    paymentFees,
    supportReserve,
    taxReserve,
    infrastructureReserve,
    contribution,
    marginPercent,
    viable: contribution > 0,
    reason: contribution > 0 ? "positive_contribution" : "negative_contribution"
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
