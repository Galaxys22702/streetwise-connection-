import { access, cp, lstat, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "public");
const output = join(root, "dist");

if (!(await lstat(source)).isDirectory()) {
  throw new Error("Expected public/ to contain the static website.");
}
for (const filename of ["index.html", "app.js"]) {
  await access(join(source, filename));
}

// dist/ is generated output only. Never delete source, configuration, or data.
await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });
for (const filename of ["index.html", "app.js"]) {
  await access(join(output, filename));
}
console.log("Static site built into dist/ (generated and Git-ignored).");
