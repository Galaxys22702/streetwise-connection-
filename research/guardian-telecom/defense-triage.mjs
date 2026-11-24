// Guardian defensive triage: local, offline, authorized inventory only.
import { readFileSync, statSync } from "node:fs";
import assert from "node:assert/strict";
const cvePattern = /^CVE-\d{4}-\d{4,}$/;
export function triage(catalog, inventory) {
  if (!Array.isArray(catalog?.vulnerabilities) || !Array.isArray(inventory) || inventory.length > 10000 || catalog.vulnerabilities.length > 50000) throw Error("Invalid or oversized input");
  const known = new Set();
  for (const item of catalog.vulnerabilities) {
    if (!cvePattern.test(item?.cveID ?? "")) throw Error("Invalid catalog identifier");
    known.add(item.cveID);
  }
  if (!known.size) throw Error("Empty catalog; cannot assess");
  const counts = { authorized: 0, excluded: 0, knownExploitedMatch: 0, otherReportedVulnerability: 0, noReportedVulnerabilities: 0, unknown: 0 };
  for (const asset of inventory) {
    if (asset?.authorized !== true) { counts.excluded++; continue; }
    counts.authorized++;
    if (!Array.isArray(asset.cves) || asset.cves.length > 1000 || !asset.cves.every(cve => typeof cve === "string" && cvePattern.test(cve))) { counts.unknown++; continue; }
    if (asset.cves.some(cve => known.has(cve))) counts.knownExploitedMatch++;
    else if (asset.cves.length) counts.otherReportedVulnerability++;
    else counts.noReportedVulnerabilities++;
  }
  return { mode: "offline defensive triage", catalogVersion: typeof catalog.catalogVersion === "string" && /^[0-9.]{1,32}$/.test(catalog.catalogVersion) ? catalog.catalogVersion : "unknown", counts,
    assessment: "Inventory-supplied CVE matches only. No scanning, exploitation, or proof of compromise. Empty results do not prove safety.",
    next: counts.knownExploitedMatch ? "Confirm affected versions; prioritize vendor-approved remediation and test recovery." : "Validate inventory completeness and review other reported vulnerabilities.",
    automaticChanges: false, externalDisclosure: false };
}
function load(path) {
  if (!statSync(path).isFile() || statSync(path).size > 20 * 1024 * 1024) throw Error("Input must be a bounded local file");
  return JSON.parse(readFileSync(path, "utf8"));
}
function selfTest() {
  const catalog = { catalogVersion: "1.0", vulnerabilities: [{ cveID: "CVE-2099-0001" }] };
  const input = [{ authorized: true, cves: ["CVE-2099-0001"] }, { authorized: true, cves: ["CVE-2099-0002"] }, { authorized: true, cves: [] }, { authorized: true }, { authorized: false, cves: ["CVE-2099-0001"] }];
  const report = triage(catalog, input);
  assert.deepEqual(report.counts, { authorized: 4, excluded: 1, knownExploitedMatch: 1, otherReportedVulnerability: 1, noReportedVulnerabilities: 1, unknown: 1 });
  assert.equal(report.automaticChanges, false);
  assert.equal(report.externalDisclosure, false);
  assert.throws(() => triage({ vulnerabilities: [] }, input));
  assert.throws(() => triage({}, input));
  assert.equal(triage(catalog, [{ authorized: "true", cves: [] }]).counts.excluded, 1);
  console.log("6 assertions passed using synthetic fixtures.");
}
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") selfTest();
  else if (args.length === 2) console.log(JSON.stringify(triage(load(args[0]), load(args[1])), null, 2));
  else { console.error("Usage: node defense-triage.mjs --self-test OR node defense-triage.mjs kev.json authorized-inventory.json"); process.exitCode = 2; }
} catch { console.error("Triage failed; validate input files. No security conclusion."); process.exitCode = 1; }
