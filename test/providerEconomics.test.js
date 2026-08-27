import assert from "node:assert/strict";
import test from "node:test";
import { calculateUnitEconomics, normalizeWholesaleBundle, rankBundles } from "../src/services/providerEconomics.js";

test("normalizes common provider catalogue fields", () => {
  const result = normalizeWholesaleBundle({
    name: "esim_1GB_7D_US_V2",
    price: 2.50,
    currency: "usd",
    dataAmount: 1024,
    duration: 7,
    countries: ["US"]
  });

  assert.equal(result.sku, "esim_1GB_7D_US_V2");
  assert.equal(result.wholesaleCost, 2.5);
  assert.equal(result.currency, "USD");
  assert.equal(result.dataGb, 1);
  assert.equal(result.durationDays, 7);
});

test("calculates contribution margin without pretending unknown taxes are zero-cost facts", () => {
  const result = calculateUnitEconomics({ name: "bundle-a", price: 2.50, currency: "USD" }, {
    retailPrice: 10,
    paymentRate: 0.029,
    paymentFixedFee: 0.30,
    supportReserve: 0.50,
    infrastructureReserve: 0.25,
    taxReserveRate: 0.05
  });

  assert.equal(Number(result.paymentFees.toFixed(2)), 0.59);
  assert.equal(Number(result.taxReserve.toFixed(2)), 0.50);
  assert.equal(Number(result.contribution.toFixed(2)), 5.66);
  assert.equal(Number(result.marginPercent.toFixed(1)), 56.6);
  assert.equal(result.viable, true);
});

test("enforces the configured minimum contribution margin", () => {
  const result = calculateUnitEconomics(
    { name: "thin-margin", price: 6.50, currency: "USD" },
    { minimumMarginPercent: 30, wholesaleStressRate: 0.15 }
  );

  assert.equal(Number(result.marginPercent.toFixed(1)), 21.6);
  assert.equal(result.marginThresholdPassed, false);
  assert.equal(result.stressTestPassed, true);
  assert.equal(result.viable, false);
  assert.equal(result.reason, "margin_below_threshold");
});

test("requires positive contribution after wholesale-cost stress", () => {
  const result = calculateUnitEconomics(
    { name: "stress-failure", price: 7, currency: "USD" },
    { minimumMarginPercent: 0, wholesaleStressRate: 0.25 }
  );

  assert.equal(Number(result.contribution.toFixed(2)), 1.66);
  assert.equal(Number(result.stressedContribution.toFixed(2)), -0.09);
  assert.equal(result.marginThresholdPassed, true);
  assert.equal(result.stressTestPassed, false);
  assert.equal(result.viable, false);
  assert.equal(result.reason, "stress_test_negative");
});

test("missing wholesale cost fails the viability check", () => {
  const result = calculateUnitEconomics({ name: "bundle-without-price", currency: "USD" });
  assert.equal(result.viable, false);
  assert.equal(result.reason, "wholesale_cost_missing");
});

test("null and blank provider values remain missing instead of becoming zero", () => {
  for (const price of [null, "", "   "]) {
    const result = calculateUnitEconomics({ name: "missing-price", price, currency: "USD" });
    assert.equal(result.wholesaleCost, null);
    assert.equal(result.viable, false);
    assert.equal(result.reason, "wholesale_cost_missing");
  }

  const normalized = normalizeWholesaleBundle({ name: "missing-data", price: 2.5, currency: "USD" });
  assert.equal(normalized.dataGb, null);
});

test("requires explicit provider currency when catalogue rows omit it", () => {
  const blocked = calculateUnitEconomics({ name: "bundle-a", price: 2.50 });
  assert.equal(blocked.viable, false);
  assert.equal(blocked.reason, "provider_currency_missing");

  const allowed = calculateUnitEconomics(
    { name: "bundle-a", price: 2.50 },
    { providerCurrency: "USD" }
  );
  assert.equal(allowed.currency, "USD");
  assert.equal(allowed.viable, true);
});

test("does not compare provider and retail amounts in different currencies", () => {
  const result = calculateUnitEconomics(
    { name: "bundle-eur", price: 2.50, currency: "EUR" },
    { retailCurrency: "USD" }
  );

  assert.equal(result.viable, false);
  assert.equal(result.reason, "currency_conversion_required");
  assert.equal(result.contribution, undefined);
});

test("rejects malformed currency codes and negative wholesale costs", () => {
  const invalidCurrency = calculateUnitEconomics({
    name: "bad-currency",
    price: 2.50,
    currency: "US dollars"
  });
  assert.equal(invalidCurrency.viable, false);
  assert.equal(invalidCurrency.reason, "provider_currency_invalid");

  const negativeCost = calculateUnitEconomics({
    name: "negative-cost",
    price: -2.50,
    currency: "USD"
  });
  assert.equal(negativeCost.viable, false);
  assert.equal(negativeCost.reason, "wholesale_cost_invalid");
});

test("invalid assumptions fail closed instead of falling back silently", () => {
  const result = calculateUnitEconomics(
    { name: "bundle-a", price: 2.50, currency: "USD" },
    { retailPrice: "not-a-number" }
  );

  assert.equal(result.viable, false);
  assert.equal(result.reason, "invalid_economics_assumptions");

  const invalidRetailCurrency = calculateUnitEconomics(
    { name: "bundle-a", price: 2.50, currency: "USD" },
    { retailCurrency: "US dollars" }
  );
  assert.equal(invalidRetailCurrency.viable, false);
  assert.equal(invalidRetailCurrency.reason, "invalid_economics_assumptions");

  const invalidMarginThreshold = calculateUnitEconomics(
    { name: "bundle-a", price: 2.50, currency: "USD" },
    { minimumMarginPercent: 101 }
  );
  assert.equal(invalidMarginThreshold.viable, false);
  assert.equal(invalidMarginThreshold.reason, "invalid_economics_assumptions");

  const invalidStressRate = calculateUnitEconomics(
    { name: "bundle-a", price: 2.50, currency: "USD" },
    { wholesaleStressRate: -0.01 }
  );
  assert.equal(invalidStressRate.viable, false);
  assert.equal(invalidStressRate.reason, "invalid_economics_assumptions");
});

test("ranks bundles by contribution", () => {
  const results = rankBundles([
    { name: "expensive", price: 8, currency: "USD" },
    { name: "cheap", price: 2, currency: "USD" }
  ], { retailPrice: 10 });

  assert.equal(results[0].sku, "cheap");
  assert.equal(results[1].sku, "expensive");
});
