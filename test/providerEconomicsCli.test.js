import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("../scripts/analyse-provider-catalogue.js", import.meta.url));
const fixturePath = fileURLToPath(new URL("./fixtures/provider-catalogue.json", import.meta.url));

function runAnalyser(overrides = {}) {
  return spawnSync(process.execPath, [scriptPath, fixturePath], {
    encoding: "utf8",
    env: {
      ...process.env,
      STREETWISE_RETAIL_PRICE: "10",
      STREETWISE_RETAIL_CURRENCY: "USD",
      STREETWISE_PROVIDER_CURRENCY: "",
      STREETWISE_SUPPORT_RESERVE: "0.50",
      STREETWISE_INFRA_RESERVE: "0.25",
      STREETWISE_TAX_RESERVE_RATE: "0",
      STREETWISE_MIN_MARGIN_PERCENT: "30",
      STREETWISE_WHOLESALE_STRESS_RATE: "0.15",
      ...overrides
    }
  });
}

test("catalogue analyser fails closed when provider currency is not supplied", () => {
  const result = runAnalyser();

  assert.equal(result.status, 3);
  assert.match(result.stdout, /provider_currency_missing/);
  assert.match(result.stderr, /Currency gate failed/);
});

test("catalogue analyser accepts an explicitly confirmed matching currency", () => {
  const result = runAnalyser({ STREETWISE_PROVIDER_CURRENCY: "USD" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /esim_1GB_7D_US_V2/);
  assert.match(result.stdout, /minimum 30\.0% base margin/);
  assert.match(result.stdout, /yes \| commercial_gate_passed/);
});

test("catalogue analyser rejects invalid numeric environment settings", () => {
  const result = runAnalyser({ STREETWISE_RETAIL_PRICE: "not-a-number" });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /STREETWISE_RETAIL_PRICE must be a finite number/);
});

test("catalogue analyser rejects malformed currency settings", () => {
  const result = runAnalyser({ STREETWISE_PROVIDER_CURRENCY: "US dollars" });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /STREETWISE_PROVIDER_CURRENCY must be a three-letter currency code/);
});

test("catalogue analyser exits unsuccessfully for unsafe numeric assumptions", () => {
  const result = runAnalyser({
    STREETWISE_PROVIDER_CURRENCY: "USD",
    STREETWISE_SUPPORT_RESERVE: "-1"
  });

  assert.equal(result.status, 4);
  assert.match(result.stdout, /invalid_economics_assumptions/);
  assert.match(result.stderr, /outside the permitted ranges/);
});

test("catalogue analyser fails when no bundle passes the configured commercial gate", () => {
  const result = runAnalyser({
    STREETWISE_PROVIDER_CURRENCY: "USD",
    STREETWISE_MIN_MARGIN_PERCENT: "80"
  });

  assert.equal(result.status, 5);
  assert.match(result.stdout, /no \| margin_below_threshold/);
  assert.match(result.stderr, /No catalogue bundle passes/);
});
