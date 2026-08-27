import fs from "node:fs/promises";
import { assessProviderCommercialReadiness } from "../src/services/providerCommercialReadiness.js";

const args = process.argv.slice(2);
const stageArgument = args.find((argument) => argument.startsWith("--stage="));
const stage = stageArgument?.slice("--stage=".length) || "comparison";
const inputPath = args.find((argument) => !argument.startsWith("--"));

if (!inputPath || !["comparison", "activation"].includes(stage)) {
  console.error(
    "Usage: node scripts/check-provider-commercial-readiness.js <evidence.json> [--stage=comparison|activation]"
  );
  process.exit(2);
}

let evidence;
try {
  evidence = JSON.parse(await fs.readFile(inputPath, "utf8"));
} catch (error) {
  console.error(`Unable to read provider evidence: ${error.message}`);
  process.exit(2);
}

const result = assessProviderCommercialReadiness(evidence);
console.log(`Safety gate: ${result.safetyGatePassed ? "pass" : "fail"}`);
for (const provider of result.providerResults) {
  console.log(
    `${provider.providerId}: ${provider.commercialEvidenceComplete ? "complete" : "incomplete"}`
  );
  for (const item of provider.missing) console.log(`  missing: ${item}`);
}
console.log(`Comparison ready: ${result.comparisonReady ? "yes" : "no"}`);
console.log(`Activation ready: ${result.activationReady ? "yes" : "no"}`);

if (!result.safetyGatePassed) {
  for (const failure of result.safetyFailures) console.error(`Unsafe control: ${failure}`);
  process.exit(3);
}

if (stage === "comparison" && !result.comparisonReady) process.exit(4);
if (stage === "activation" && !result.activationReady) {
  for (const item of result.activationMissing) console.error(`Activation evidence missing: ${item}`);
  process.exit(5);
}
