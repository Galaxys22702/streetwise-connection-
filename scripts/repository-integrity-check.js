import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const allowedWriteWorkflows = new Set([
  "cleanup-merged-branches.yml",
  "guard-main-provenance.yml"
]);
const credentialedWorkflows = new Set([
  "facebook-auto-post.yml",
  "facebook-ops-heartbeat.yml",
  "provider-validation.yml",
  "stripe-test-validation.yml"
]);
const ignoredScanDirectories = new Set([
  ".git",
  ".vercel",
  "node_modules"
]);
const forbiddenAssignedSecrets = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ESIM_API_KEY",
  "ONEGLOBAL_CLIENT_SECRET",
  "ATT_WHOLESALE_CLIENT_SECRET",
  "META_PAGE_ACCESS_TOKEN",
  "META_ADMIN_API_KEY",
  "META_APP_SECRET",
  "META_OAUTH_STATE_SECRET",
  "META_TOKEN_ENCRYPTION_KEY"
];

const highConfidenceSecretPatterns = [
  {
    name: "Stripe live secret key",
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/
  },
  {
    name: "GitHub access token",
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/
  },
  {
    name: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  }
];

const failures = [];
const fail = message => failures.push(message);

async function listSourceFiles(directory = root, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredScanDirectories.has(entry.name)) {
        files.push(...await listSourceFiles(absolutePath, relativePath));
      }
      continue;
    }

    if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

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

const cleanupWorkflow = await readFile(
  path.join(root, ".github", "workflows", "cleanup-merged-branches.yml"),
  "utf8"
);
if (!cleanupWorkflow.includes("github.ref == 'refs/heads/main'")) {
  fail("branch cleanup write job must be restricted to refs/heads/main before it receives write permissions");
}
if (!cleanupWorkflow.includes("persist-credentials: false")) {
  fail("branch cleanup preview job must not persist Git credentials");
}
if (!cleanupWorkflow.includes('CLEANUP_MIN_AGE_DAYS: "7"')) {
  fail("branch cleanup workflow must retain the seven-day cooling-off period");
}

const facebookAutoPostWorkflow = await readFile(
  path.join(workflowsDir, "facebook-auto-post.yml"),
  "utf8"
);
if (!/FACEBOOK_AUTO_POST_ENABLED:[^\n]*\|\|\s*'false'/.test(facebookAutoPostWorkflow)) {
  fail("facebook-auto-post.yml must default FACEBOOK_AUTO_POST_ENABLED to false");
}
if (/FACEBOOK_AUTO_POST_ENABLED:[^\n]*\|\|\s*'true'/.test(facebookAutoPostWorkflow)) {
  fail("facebook-auto-post.yml must never opt into scheduled posting by default");
}

const facebookAutoPostRunner = await readFile(
  path.join(root, "scripts", "facebook-auto-post.js"),
  "utf8"
);
if (!/FACEBOOK_AUTO_POST_ENABLED\s*\?\?\s*"false"/.test(facebookAutoPostRunner)) {
  fail("facebook-auto-post runner must default FACEBOOK_AUTO_POST_ENABLED to false");
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

if (ruleset.name !== "Protect main") {
  fail("documented native main ruleset must remain named Protect main");
}
if (ruleset.target !== "branch") {
  fail("documented native main ruleset must target branches");
}
const includedRefs = ruleset.conditions?.ref_name?.include || [];
const excludedRefs = ruleset.conditions?.ref_name?.exclude || [];
if (
  includedRefs.length !== 1 ||
  includedRefs[0] !== "refs/heads/main" ||
  excludedRefs.length !== 0
) {
  fail("documented native main ruleset must target only refs/heads/main");
}
if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length !== 0) {
  fail("documented native main ruleset must not grant bypass actors");
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

const prParameters = pullRequestRule?.parameters || {};
if (prParameters.dismiss_stale_reviews_on_push !== true) {
  fail("documented main ruleset must dismiss stale reviews after new pushes");
}
if (prParameters.required_review_thread_resolution !== true) {
  fail("documented main ruleset must require review conversations to be resolved");
}
if (prParameters.require_code_owner_review !== false) {
  fail("documented solo-maintainer policy must not require code-owner approval");
}
if (prParameters.require_last_push_approval !== false) {
  fail("documented solo-maintainer policy must not require last-push approval");
}
if (prParameters.require_extra_approval_for_unattributed_changes !== false) {
  fail("documented solo-maintainer policy must not require unattributed-change approval");
}
const allowedMergeMethods = new Set(prParameters.allowed_merge_methods || []);
if (
  allowedMergeMethods.size !== 2 ||
  !allowedMergeMethods.has("squash") ||
  !allowedMergeMethods.has("rebase") ||
  allowedMergeMethods.has("merge")
) {
  fail("documented main ruleset must allow only squash and rebase merges");
}

const statusRule = ruleByType.get("required_status_checks");
if (statusRule?.parameters?.strict_required_status_checks_policy !== true) {
  fail("main ruleset must keep strict required status checks enabled");
}
if (statusRule?.parameters?.do_not_enforce_on_create !== false) {
  fail("documented main ruleset must enforce required checks on created refs");
}
const configuredStatusChecks = statusRule?.parameters?.required_status_checks || [];
if (configuredStatusChecks.length !== 4) {
  fail("documented main ruleset has an unexpected number of required status checks");
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

for (const relativePath of await listSourceFiles()) {
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

  for (const { name, pattern } of highConfidenceSecretPatterns) {
    if (pattern.test(source)) {
      fail(`${relativePath}: possible ${name} committed`);
    }
  }

  const skipNamedAssignmentScan =
    relativePath === ".env.example" ||
    relativePath.startsWith("docs/") ||
    relativePath.startsWith("test/") ||
    relativePath.startsWith(".github/workflows/");

  if (!skipNamedAssignmentScan) {
    for (const secretName of forbiddenAssignedSecrets) {
      const assignedValue = new RegExp(`${secretName}[ \\t]*=[ \\t]*[^\\s#]+`);
      if (assignedValue.test(source)) {
        fail(`${relativePath}: ${secretName} must not contain a committed value`);
      }
    }
  }
}

if (failures.length) {
  console.error("Repository integrity policy failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository integrity policy passed for ${workflowFiles.length} workflows.`);
