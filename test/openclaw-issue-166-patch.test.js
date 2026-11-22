import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('../infra/openclaw/patch-issue-166.cjs', import.meta.url).pathname;
function fixture(t, bodies) {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-probe-anchor-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'chunks'));
  const paths = bodies.map((body, i) => {
    const file = join(root, 'chunks', `chunk-${i}.js`);
    writeFileSync(file, body);
    return file;
  });
  return { root, paths };
}
const anchor = 'lane: `session:probe-setup-inference:${route.provider}`, thinkLevel: "off", reasoningLevel: "off"';
function invoke(root) { return spawnSync(process.execPath, [script, root], { encoding: 'utf8' }); }

test('unique pinned setup probe anchor changes only thinking and reasoning', t => {
  const f = fixture(t, ['const x = { ' + anchor + ', verboseLevel: "off" };']);
  const result = invoke(f.root);
  assert.equal(result.status, 0, result.stderr);
  const output = readFileSync(f.paths[0], 'utf8');
  assert.match(output, /thinkLevel: "minimal", reasoningLevel: "minimal"/);
  assert.match(output, /verboseLevel: "off"/);
});
test('missing anchor fails closed without changes', t => {
  const f = fixture(t, ['const x = { thinkLevel: "off" };']);
  const before = readFileSync(f.paths[0], 'utf8');
  assert.notEqual(invoke(f.root).status, 0);
  assert.equal(readFileSync(f.paths[0], 'utf8'), before);
});
test('duplicate anchors fail closed without changes', t => {
  const f = fixture(t, [anchor, anchor]);
  const before = f.paths.map(p => readFileSync(p, 'utf8'));
  assert.notEqual(invoke(f.root).status, 0);
  assert.deepEqual(f.paths.map(p => readFileSync(p, 'utf8')), before);
});
test('non-probe thinking settings are preserved', t => {
  const f = fixture(t, [anchor, 'const userSession = { thinkLevel: "off" };']);
  assert.equal(invoke(f.root).status, 0);
  assert.equal(readFileSync(f.paths[1], 'utf8'), 'const userSession = { thinkLevel: "off" };');
});

test('read-only --check validates unique anchor without modifying the file', t => {
  const f = fixture(t, ['const probe = { ' + anchor + ' };']);
  const before = readFileSync(f.paths[0], 'utf8');
  const result = spawnSync(process.execPath, [script, '--check', f.root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(f.paths[0], 'utf8'), before);
});
