import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("main provenance guard is fail-closed and lease-protected", async () => {
  const source = await readFile(new URL("../scripts/guard-main-provenance.js", import.meta.url), "utf8");
  assert.match(source, /commits\/\$\{after\}\/pulls/);
  assert.match(source, /merge_commit_sha === after/);
  assert.match(source, /pr\.base\?\.ref === "main"/);
  assert.match(source, /--force-with-lease=/);
  assert.match(source, /Untrusted direct update detected/);
});

test("guard workflow runs only for pushes to main with scoped permissions", async t => {
  const url = new URL("../.github/workflows/guard-main-provenance.yml", import.meta.url);
  try { await access(url); } catch { t.skip("workflow metadata is intentionally absent from the production Docker context"); return; }
  const source = await readFile(url, "utf8");
  assert.match(source, /branches: \[main\]/);
  assert.match(source, /contents: write/);
  assert.match(source, /pull-requests: read/);
  assert.match(source, /cancel-in-progress: false/);
});

test("production deployment provenance is fail-closed", async () => {
  const source = await readFile(new URL("../scripts/verify-deployment-provenance.js", import.meta.url), "utf8");
  assert.match(source, /VERCEL_ENV/);
  assert.match(source, /env !== "production"/);
  assert.match(source, /merge_commit_sha === sha/);
  assert.match(source, /Blocked production deployment/);
});

test("Vercel build checks provenance before tests and build", async t => {
  const url = new URL("../vercel.json", import.meta.url);
  try { await access(url); } catch { t.skip("Vercel metadata is intentionally absent from the production Docker context"); return; }
  const config = JSON.parse(await readFile(url, "utf8"));
  assert.match(config.buildCommand, /^node scripts\/verify-deployment-provenance\.js && /);
});
