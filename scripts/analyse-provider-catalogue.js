import fs from "node:fs/promises";
import { rankBundles } from "../src/services/providerEconomics.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/analyse-provider-catalogue.js <catalogue.json>");
  process.exit(1);
}

function environmentNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || !String(raw).trim()) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    console.error(`${name} must be a finite number.`);
    process.exit(2);
  }
  return value;
}

function environmentCurrency(name, fallback = null) {
  const raw = process.env[name];
  if (raw === undefined || !String(raw).trim()) return fallback;
  const value = String(raw).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) {
    console.error(`${name} must be a three-letter currency code.`);
    process.exit(2);
  }
  return value;
}

const retailPrice = environmentNumber("STREETWISE_RETAIL_PRICE", 10);
const supportReserve = environmentNumber("STREETWISE_SUPPORT_RESERVE", 0.50);
const infrastructureReserve = environmentNumber("STREETWISE_INFRA_RESERVE", 0.25);
const taxReserveRate = environmentNumber("STREETWISE_TAX_RESERVE_RATE", 0);
const retailCurrency = environmentCurrency("STREETWISE_RETAIL_CURRENCY", "USD");
const providerCurrency = environmentCurrency("STREETWISE_PROVIDER_CURRENCY");

const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const bundles = Array.isArray(raw)
  ? raw
  : Array.isArray(raw?.bundles)
    ? raw.bundles
    : Array.isArray(raw?.data)
      ? raw.data
      : raw?.bundles && typeof raw.bundles === "object"
        ? Object.values(raw.bundles)
        : [];

if (!bundles.length) {
  console.error("No bundles found in catalogue JSON.");
  process.exit(2);
}

const results = rankBundles(bundles, {
  retailPrice,
  supportReserve,
  infrastructureReserve,
  taxReserveRate,
  retailCurrency,
  providerCurrency
});

console.log(`Streetwise provider economics at ${retailPrice.toFixed(2)} ${retailCurrency} retail`);
console.log("SKU | Wholesale | Currency | Data GB | Days | Contribution | Margin | Viable | Reason");
for (const row of results) {
  const money = (value) => Number.isFinite(value) ? value.toFixed(2) : "n/a";
  const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
  console.log([
    row.sku,
    money(row.wholesaleCost),
    row.currency ?? "n/a",
    row.dataGb ?? "n/a",
    row.durationDays ?? "n/a",
    money(row.contribution),
    percent(row.marginPercent),
    row.viable ? "yes" : "no",
    row.reason
  ].join(" | "));
}

const viable = results.filter((row) => row.viable);
console.log(`\n${viable.length}/${results.length} bundles have positive contribution before final telecom taxes, chargebacks, and unknown provider costs.`);

const blockedByCurrency = results.filter((row) => (
  row.reason === "provider_currency_missing" ||
  row.reason === "provider_currency_invalid" ||
  row.reason === "currency_conversion_required"
));
if (blockedByCurrency.length) {
  console.error(
    "Currency gate failed. Confirm the provider account currency and set STREETWISE_PROVIDER_CURRENCY; convert prices before comparing different currencies."
  );
  process.exitCode = 3;
}

if (results.some((row) => row.reason === "invalid_economics_assumptions")) {
  console.error("Economics assumptions are outside the permitted ranges; correct them before using this report.");
  process.exitCode = 4;
}
