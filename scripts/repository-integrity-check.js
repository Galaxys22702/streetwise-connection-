import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const allowedWriteWorkflows = new Set([
  "cleanup-merged-branches.yml",
  "guard-main-provenance.yml"
]);
const credentialedWorkflows = new Set([
  "provider-validation.yml",
  "stripe-test-validation.yml"
]);

const failures = [];
const fail = message => failures.push(message);

const workflowFiles = (await readdir(workflowsDir))
  .filter(name => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

for (const name of workflowFiles) {
  const source = await readFile(path.join(workflowsDir, name), "utf8");

  if (/\bpull_request_target\s*:/.test(source)) {
    fail(`${name}: pull_request_target is forbidden`);
  }
  if (/permissions\s*:\s*write-all/.test(source)) {
    fail(`${name}: write-all permissions are forbidden`);
  }

  const actionRefs = [...source.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)].map(match => match[1]);
  for (const ref of actionRefs) {
    if (!/^[a-f0-9]{40}$/.test(ref)) {
      fail(`${name}: action reference must be pinned to a full commit SHA: ${ref}`);
    }
  }

  const hasContentsWrite = /contents\s*:\s*write/.test(source);
  if (hasContentsWrite && !allowedWriteWorkflows.has(name)) {
    fail(`${name}: contents: write is not approved`);
  }

  const usesSecrets = /\bsecrets\.[A-Z0-9_]+/.test(source);
  if (usesSecrets && !credentialedWorkflows.has(name)) {
    fail(`${name}: repository secrets are not approved in this workflow`);
  }
  if (usesSecrets && /\bpull_request\s*:/.test(source)) {
    fail(`${name}: secret-bearing workflow must not run on pull_request`);
  }

  if (/persist-credentials:\s*true/.test(source) && !allowedWriteWorkflows.has(name)) {
    fail(`${name}: persisted Git credentials are not approved`);
  }
}

const guard = await readFile(path.join(root, ".github", "workflows", "guard-main-provenance.yml"), "utf8");
if (!/branches:\s*\[main\]/.test(guard) || !/contents:\s*write/.test(guard)) {
  fail("main provenance guard lost its required trigger or write capability");
}

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
if (!String(vercel.buildCommand || "").startsWith("node scripts/verify-deployment-provenance.js && ")) {
  fail("Vercel production provenance gate is no longer first in buildCommand");
}

const ruleset = JSON.parse(await readFile(path.join(root, ".github", "main-ruleset.json"), "utf8"));
if (ruleset.enforcement !== "active" || !ruleset.conditions?.ref_name?.include?.includes("refs/heads/main")) {
  fail("documented native main ruleset is no longer active/targeted at main");
}
if (Array.isArray(ruleset.bypass_actors) && ruleset.bypass_actors.length) {
  fail("documented native main ruleset must not define broad bypass actors");
}

const ruleByType = new Map((ruleset.rules || []).map(rule => [rule.type, rule]));
for (const type of ["deletion", "non_fast_forward", "required_linear_history", "pull_request", "required_status_checks"]) {
  if (!ruleByType.has(type)) {
    fail(`documented native main ruleset is missing ${type}`);
  }
}

const pullRequestRule = ruleByType.get("pull_request");
if (pullRequestRule?.parameters?.required_approving_review_count !== 0) {
  fail("single-maintainer main ruleset must use zero mandatory approving reviews");
}

const statusRule = ruleByType.get("required_status_checks");
if (statusRule?.parameters?.strict_required_status_checks_policy !== true) {
  fail("main ruleset must keep strict required status checks enabled");
}
const requiredChecks = new Map(
  (statusRule?.parameters?.required_status_checks || []).map(check => [check.context, check.integration_id])
);
for (const [context, integrationId] of [
  ["test", 15368],
  ["docker-build", 15368],
  ["verify", 15368],
  ["Vercel", 8329]
]) {
  if (requiredChecks.get(context) !== integrationId) {
    fail(`main ruleset is missing required status check ${context}`);
  }
}

let trackedFiles = [];
try {
  trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8"
  }).split("\0").filter(Boolean);
} catch {
  fail("unable to enumerate tracked files for secret scanning");
}

for (const relativePath of trackedFiles) {
  if (/\.(?:png|jpe?g|gif|webp|ico|zip|gz|pdf)$/i.test(relativePath)) continue;

  let source;
  try {
    source = await readFile(path.join(root, relativePath), "utf8");
  } catch {
    continue;
  }

  if (/\bEAA[A-Za-z0-9]{50,}\b/.test(source)) {
    fail(`${relativePath}: possible live Meta/Facebook access token committed`);
  }
  if (/META_PAGE_ACCESS_TOKEN\s*=\s*[^\s#]+/.test(source)) {
    fail(`${relativePath}: META_PAGE_ACCESS_TOKEN must not contain a committed value`);
  }
}

if (failures.length) {
  console.error("Repository integrity policy failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository integrity policy passed for ${workflowFiles.length} workflows.`);
