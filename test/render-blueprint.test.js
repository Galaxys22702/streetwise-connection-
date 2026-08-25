import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Render free-tier blueprint migrates the database during service startup", async () => {
  const [blueprint, dockerfile] = await Promise.all([
    readFile(new URL("../render.yaml", import.meta.url), "utf8"),
    readFile(new URL("../Dockerfile", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(blueprint, /preDeployCommand:/);
  assert.match(blueprint, /fromDatabase:\s*\n\s+name: streetwise-staging-db/);
  assert.match(dockerfile, /CMD \["node", "scripts\/start\.js"\]/);
});
