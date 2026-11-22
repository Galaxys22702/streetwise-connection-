import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([
  ".git", ".cache", ".next", ".npm", ".tmp", ".turbo", ".vercel",
  ".wrangler", "build", "coverage", "dist", "integrations",
  "node_modules", "tmp"
]);
const scripts = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await collect(path);
    } else if (entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name)) {
      scripts.push(path);
    }
  }
}

await collect(root);
scripts.sort();
if (!scripts.length) {
  console.error("No JavaScript files found; refusing to report a passing check.");
  process.exit(1);
}

let failed = 0;
for (const file of scripts) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    failed++;
    console.error("Syntax check failed: " + relative(root, file));
    console.error(result.error?.message || result.stderr || "Unknown error");
  }
}

const manifests = [
  "package.json", "package-lock.json", "vercel.json", ".github/main-ruleset.json"
];
for (const manifest of manifests) {
  try {
    JSON.parse(await readFile(join(root, manifest), "utf8"));
  } catch (error) {
    failed++;
    console.error("JSON validation failed: " + manifest + " (" + error.message + ")");
  }
}

if (failed) {
  console.error(failed + " source or configuration validation failure(s).");
  process.exit(1);
}
console.log("Syntax validation passed: " + scripts.length + " JavaScript files and " +
  manifests.length + " JSON configuration files.");
