import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("../scripts/check-provider-commercial-readiness.js", import.meta.url)
);
const examplePath = fileURLToPath(
  new URL("../docs/provider-commercial-evidence.example.json", import.meta.url)
);

test("example evidence fails comparison while provider facts remain unknown", () => {
  const result = spawnSync(process.execPath, [scriptPath, examplePath], { encoding: "utf8" });
  assert.equal(result.status, 4);
  assert.match(result.stdout, /att-wholesale: incomplete/);
  assert.match(result.stdout, /1global: incomplete/);
  assert.match(result.stdout, /Comparison ready: no/);
});

test("invalid stage is rejected", () => {
  const result = spawnSync(
    process.execPath,
    [scriptPath, examplePath, "--stage=unknown"],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});
