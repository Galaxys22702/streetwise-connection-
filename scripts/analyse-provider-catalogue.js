import fs from "node:fs/promises";
import { rankBundles } from "../src/services/providerEconomics.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/analyse-provider-catalogue.js <catalogue.json>");
  process.exit(1);
}

const retailPrice = Number(process.env.STREETWISE_RETAIL_PRICE || 10);
const supportReserve = Number(process.env.STREETWISE_SUPPORT_RESERVE || 0.50);
const infrastructureReserve = Number(process.env.STREETWISE_INFRA_RESERVE || 0.25);
const taxReserveRate = Number(process.env.STREETWISE_TAX_RESERVE_RATE || 0);

const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const bundles = Array.isArray(raw)
  ? raw
  : Array.isArray(raw?.bundles)
    ? raw.bundles
    : Array.isArray(raw?.data)
      ? raw.data
      : [];

if (!bundles.length) {
  console.error("No bundles found in catalogue JSON.");
  process.exit(2);
}

const results = rankBundles(bundles, {
  retailPrice,
  supportReserve,
  infrastructureReserve,
  taxReserveRate
});

console.log(`Streetwise provider economics at $${retailPrice.toFixed(2)} retail`);
console.log("SKU | Wholesale | Data GB | Days | Contribution | Margin | Viable");
for (const row of results) {
  const money = (value) => Number.isFinite(value) ? `$${value.toFixed(2)}` : "n/a";
  const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
  console.log([
    row.sku,
    money(row.wholesaleCost),
    row.dataGb ?? "n/a",
    row.durationDays ?? "n/a",
    money(row.contribution),
    percent(row.marginPercent),
    row.viable ? "yes" : "no"
  ].join(" | "));
}

const viable = results.filter((row) => row.viable);
console.log(`\n${viable.length}/${results.length} bundles have positive contribution before final telecom taxes, chargebacks, and unknown provider costs.`);
