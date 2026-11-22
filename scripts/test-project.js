import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Explicitly select this repository's tests. Node's default recursive discovery
// would also run this runner (test-project.js), and may run vendored Vitest tests.
const root = fileURLToPath(new URL("../", import.meta.url));
const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", "integrations"]);
const files = [];
const testName = /\.(?:test|spec)\.(?:js|mjs|cjs)$/;

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) collect(path);
    } else if (entry.isFile() && testName.test(entry.name)) {
      files.push(path);
    }
  }
}

collect(join(root, "test"));
collect(join(root, "apps"));
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && testName.test(entry.name)) files.push(join(root, entry.name));
}

const args = process.argv.slice(2);
if (args.some(arg => arg !== "--coverage")) {
  console.error("Usage: node scripts/test-project.js [--coverage]");
  process.exit(2);
}
files.sort();
if (!files.length) {
  console.error("No project-owned test files found; refusing to report success.");
  process.exit(1);
}
const flags = ["--test", ...(args.includes("--coverage") ? ["--experimental-test-coverage"] : [])];
console.log("Running " + files.length + " project-owned tests from test/, apps/, and repository root.");
const result = spawnSync(process.execPath, [...flags, ...files], {
  stdio: "inherit",
  cwd: root
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
