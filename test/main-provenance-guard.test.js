import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("main provenance guard is fail-closed and lease-protected", async () => {
  const source = await readFile(new URL("../scripts/guard-main-provenance.js", import.meta.url), "utf8");
  assert.match(source, /commits\/\$\{after\}\/pulls/);
  assert.match(source, /merge_commit_sha === after/);
  assert.match(source, /pr\.base\?\.ref === "main"/);
  assert.match(source, /--force-with-lease=/);
  assert.match(source, /Untrusted direct update detected/);
});

test("guard workflow runs only for pushes to main with scoped permissions", async () => {
  const source = await readFile(new URL("../.github/workflows/guard-main-provenance.yml", import.meta.url), "utf8");
  assert.match(source, /branches: \[main\]/);
  assert.match(source, /contents: write/);
  assert.match(source, /pull-requests: read/);
  assert.match(source, /cancel-in-progress: false/);
});
