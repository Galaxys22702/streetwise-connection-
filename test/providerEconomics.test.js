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
  const result = calculateUnitEconomics({ name: "bundle-a", price: 2.50 }, {
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

test("missing wholesale cost fails the viability check", () => {
  const result = calculateUnitEconomics({ name: "bundle-without-price" });
  assert.equal(result.viable, false);
  assert.equal(result.reason, "wholesale_cost_missing");
});

test("ranks bundles by contribution", () => {
  const results = rankBundles([
    { name: "expensive", price: 8 },
    { name: "cheap", price: 2 }
  ], { retailPrice: 10 });

  assert.equal(results[0].sku, "cheap");
  assert.equal(results[1].sku, "expensive");
});
