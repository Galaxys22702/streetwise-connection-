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
  assert.match(result.stdout, /yes \| positive_contribution/);
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
