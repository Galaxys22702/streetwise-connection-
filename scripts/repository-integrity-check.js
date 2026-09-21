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

const rulesByType = new Map((ruleset.rules || []).map(rule => [rule.type, rule]));
for (const type of ["deletion", "non_fast_forward", "required_linear_history", "pull_request", "required_status_checks"]) {
  if (!rulesByType.has(type)) {
    fail(`documented main ruleset is missing required rule: ${type}`);
  }
}

const pullRequestRule = rulesByType.get("pull_request");
if ((pullRequestRule?.parameters?.required_approving_review_count || 0) < 1) {
  fail("documented main ruleset must require at least one approving review");
}
if (pullRequestRule?.parameters?.dismiss_stale_reviews_on_push !== true) {
  fail("documented main ruleset must dismiss stale reviews after new pushes");
}

const statusRule = rulesByType.get("required_status_checks");
if (statusRule?.parameters?.strict_required_status_checks_policy !== true) {
  fail("documented main ruleset must require branches to be up to date before merging");
}

const requiredContexts = new Set(
  (statusRule?.parameters?.required_status_checks || []).map(check => check.context)
);
for (const context of ["test", "docker-build", "verify", "Vercel"]) {
  if (!requiredContexts.has(context)) {
    fail(`documented main ruleset is missing required status check: ${context}`);
  }
}

if (failures.length) {
  console.error("Repository integrity policy failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository integrity policy passed for ${workflowFiles.length} workflows.`);
