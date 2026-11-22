import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Keep Vercel's required tests inside the project's test/ tree.
// Unrelated vendored integrations have their own package managers and test dependencies.
const root = resolve('test');
const files = [];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.isFile() && /\\.test\\.(?:js|mjs|cjs|ts)$/.test(entry.name)) files.push(path);
  }
}
visit(root);
files.sort();
if (files.length === 0) {
  console.error('No project tests found under test/; refusing to skip tests.');
  process.exit(1);
}
console.log('Running ' + files.length + ' project test files from test/.');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
