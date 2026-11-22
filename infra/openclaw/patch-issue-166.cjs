'use strict';
// Issue #166: fail-closed patch of the pinned OpenClaw setup-inference bundle.
// Does not touch /data, credentials, or model configuration.
const fs = require('node:fs');
const path = require('node:path');
const checkOnly = process.argv.includes('--check');
const root = process.argv.find(arg => arg !== '--check' && arg !== process.argv[0] && arg !== process.argv[1]) || '/usr/local/lib/node_modules/openclaw/dist';
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && /\.js$/.test(entry.name)) files.push(file);
  }
}
walk(root);
// Match only the unique setup-inference probe lane and its adjacent thinking options.
// A changed upstream bundle must stop the build, never silently apply a broad rewrite.
const anchor = /lane:\s*`session:probe-setup-inference:\$\{route\.provider\}`,\s*thinkLevel:\s*["']off["'],\s*reasoningLevel:\s*["']off["']/g;
const hits = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(anchor)) hits.push({ file, source, match });
}
if (hits.length !== 1) {
  throw new Error('Issue #166: expected exactly one pinned setup-inference probe anchor; found ' + hits.length + '. Refusing to modify runtime.');
}
const { file, source } = hits[0];
const patched = source.replace(anchor, match => match.replace(/thinkLevel:\s*["']off["']/, 'thinkLevel: "minimal"').replace(/reasoningLevel:\s*["']off["']/, 'reasoningLevel: "minimal"'));
if (patched === source) throw new Error('Issue #166: no thinking change applied.');
if (checkOnly) {
  console.log('[JARVIS] Issue #166: exactly one setup probe anchor verified; no files modified.');
} else {
  fs.writeFileSync(file, patched);
  console.log('[JARVIS] Issue #166: setup probe thinking pinned to minimal (one verified anchor).');
}
