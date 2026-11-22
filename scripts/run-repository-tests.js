// Run tests owned by the Streetwise application, not imported third-party tools.
// Imported integrations/superpowers tests require their own Vitest workspace.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) walk(path);
    } else if (entry.isFile() && /\.test\.[cm]?js$/.test(entry.name)) {
      files.push(path);
    }
  }
}
for (const dir of ['test', 'apps']) {
  try { walk(dir); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const file of readdirSync('.', { withFileTypes: true })) {
  if (file.isFile() && /\.test\.[cm]?js$/.test(file.name)) files.push(file.name);
}
files.sort();
if (files.length === 0) {
  console.error('No Streetwise tests discovered; refusing to pass an empty suite.');
  process.exit(1);
}
console.log('Running', files.length, 'Streetwise-owned test files.');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
