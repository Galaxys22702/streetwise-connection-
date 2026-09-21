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

if (ruleset.name !== "Protect main") {
  fail("documented native main ruleset must remain named Protect main");
}
if (ruleset.target !== "branch") {
  fail("documented native main ruleset must target branches");
}
if (ruleset.enforcement !== "active") {
  fail("documented native main ruleset must remain active");
}

const includedRefs = ruleset.conditions?.ref_name?.include || [];
const excludedRefs = ruleset.conditions?.ref_name?.exclude || [];
if (includedRefs.length !== 1 || includedRefs[0] !== "refs/heads/main" || excludedRefs.length !== 0) {
  fail("documented native main ruleset must target only refs/heads/main");
}

if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length !== 0) {
  fail("documented main ruleset must not grant bypass actors");
}

const rulesByType = new Map((ruleset.rules || []).map(rule => [rule.type, rule]));
for (const type of ["deletion", "non_fast_forward", "required_linear_history", "pull_request", "required_status_checks"]) {
  if (!rulesByType.has(type)) {
    fail(`documented main ruleset is missing required rule: ${type}`);
  }
}

const pullRequestRule = rulesByType.get("pull_request");
const pr = pullRequestRule?.parameters || {};

if (pr.required_approving_review_count !== 0) {
  fail("documented solo-maintainer policy must not require an external approval");
}
if (pr.dismiss_stale_reviews_on_push !== true) {
  fail("documented main ruleset must dismiss stale reviews after new pushes");
}
if (pr.required_review_thread_resolution !== true) {
  fail("documented main ruleset must require review conversations to be resolved");
}
if (pr.require_code_owner_review !== false) {
  fail("documented solo-maintainer policy must not require code-owner approval");
}
if (pr.require_last_push_approval !== false) {
  fail("documented solo-maintainer policy must not require last-push approval");
}
if (pr.require_extra_approval_for_unattributed_changes !== false) {
  fail("documented solo-maintainer policy must not require unattributed-change approval");
}

const allowedMergeMethods = new Set(pr.allowed_merge_methods || []);
if (
  allowedMergeMethods.size !== 2 ||
  !allowedMergeMethods.has("squash") ||
  !allowedMergeMethods.has("rebase") ||
  allowedMergeMethods.has("merge")
) {
  fail("documented main ruleset must allow only squash and rebase merges");
}

const statusRule = rulesByType.get("required_status_checks");
const status = statusRule?.parameters || {};

if (status.strict_required_status_checks_policy !== true) {
  fail("documented main ruleset must require branches to be up to date before merging");
}
if (status.do_not_enforce_on_create !== false) {
  fail("documented main ruleset must enforce required checks on created refs");
}

const requiredChecks = status.required_status_checks || [];
const expectedChecks = new Map([
  ["test", 15368],
  ["docker-build", 15368],
  ["verify", 15368],
  ["Vercel", 8329]
]);

if (requiredChecks.length !== expectedChecks.size) {
  fail("documented main ruleset has an unexpected number of required status checks");
}

for (const [context, integrationId] of expectedChecks) {
  const check = requiredChecks.find(item => item.context === context);
  if (!check) {
    fail(`documented main ruleset is missing required status check: ${context}`);
    continue;
  }
  if (check.integration_id !== integrationId) {
    fail(`documented main ruleset has unexpected integration for status check: ${context}`);
  }
}

for (const check of requiredChecks) {
  if (!expectedChecks.has(check.context)) {
    fail(`documented main ruleset includes unexpected status check: ${check.context}`);
  }
}

if (failures.length) {
  console.error("Repository integrity policy failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository integrity policy passed for ${workflowFiles.length} workflows.`);
