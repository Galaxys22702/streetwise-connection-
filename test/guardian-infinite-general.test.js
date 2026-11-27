import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import installer from '../scripts/install-guardian-skill.cjs';

test('Guardian skill installer preserves existing skill and does not touch other files', t => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const sentinel = path.join(workspace, 'owner.txt');
  fs.writeFileSync(sentinel, 'preserve');
  const file = installer.install(workspace);
  assert.equal(file, path.join(fs.realpathSync(workspace), 'skills', 'guardian-infinite-general', 'SKILL.md'));
  const skill = fs.readFileSync(file, 'utf8');
  assert.match(skill, /name: guardian-infinite-general/);
  assert.match(skill, /free-only routing/);
  fs.writeFileSync(file, 'owner revision');
  assert.throws(() => installer.install(workspace), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(file, 'utf8'), 'owner revision');
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'preserve');
});

test('Guardian skill installer refuses relative and nonexistent workspaces', () => {
  assert.throws(() => installer.install('relative/workspace'), /absolute path/);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-missing-'));
  try {
    assert.throws(() => installer.install(path.join(workspace, 'missing')), { code: 'ENOENT' });
  } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
});
