'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { patchFrontmatter, repairSkill } = require('../infra/openclaw/repair-skill-description.cjs');
const mock = '---\nname: thinking-frameworks\n---\n# Thinking\nKeep original content.\n';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-skill-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, 'workspace', 'skills', 'thinking-frameworks');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'SKILL.md');
  return { base, dir, target };
}

test('patching adds only missing required description and preserves skill body', () => {
  const changed = patchFrontmatter(mock);
  assert.match(changed, /description: Structured approaches to planning/);
  assert.ok(changed.endsWith('# Thinking\nKeep original content.\n'));
  assert.equal(patchFrontmatter(changed), null);
  assert.match(patchFrontmatter('---\nname: thinking-frameworks\ndescription:\n---\nBODY'), /description: Structured/);
  assert.equal(patchFrontmatter('---\nname: thinking-frameworks\ndescription: custom\n---\nBODY'), null);
  assert.equal(patchFrontmatter('---\nname: different\n---\nBODY'), null);
  assert.equal(patchFrontmatter('# Unexpected skill'), null);
});

test('repair writes private backup, edits once, and leaves untouched body', t => {
  const { base, dir, target } = fixture(t);
  fs.writeFileSync(target, mock);
  assert.equal(repairSkill({ directory: dir, allowedRoot: base }), 'repaired');
  const updated = fs.readFileSync(target, 'utf8');
  assert.ok(updated.endsWith('# Thinking\nKeep original content.\n'));
  assert.equal(fs.readFileSync(target + '.pre-jarvis-description-v1', 'utf8'), mock);
  assert.equal(fs.statSync(target + '.pre-jarvis-description-v1').mode & 0o777, 0o600);
  assert.equal(repairSkill({ directory: dir, allowedRoot: base }), 'unchanged_or_unrecognized');
  assert.equal(fs.readFileSync(target, 'utf8'), updated);
});

test('refuses conflicting backup, symlink, wrong root and unexpected skill', t => {
  const { base, dir, target } = fixture(t);
  fs.writeFileSync(target, mock);
  fs.writeFileSync(target + '.pre-jarvis-description-v1', 'conflict');
  assert.equal(repairSkill({ directory: dir, allowedRoot: base }), 'backup_conflict');
  assert.equal(fs.readFileSync(target, 'utf8'), mock);
  assert.equal(repairSkill({ directory: base, allowedRoot: base }), 'skipped');
  fs.unlinkSync(target + '.pre-jarvis-description-v1');
  fs.unlinkSync(target);
  fs.symlinkSync('/etc/hosts', target);
  assert.equal(repairSkill({ directory: dir, allowedRoot: base }), 'skipped');
  fs.unlinkSync(target);
  fs.writeFileSync(target, '---\nname: other\n---\nBODY');
  assert.equal(repairSkill({ directory: dir, allowedRoot: base }), 'unchanged_or_unrecognized');
});
