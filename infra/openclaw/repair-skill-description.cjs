'use strict';
// Repair only the known thinking-frameworks skill frontmatter on the persistent volume.
// Backup before mutation; skip symlinks, unexpected formats, and conflicting backups.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = '/data/workspace/skills/thinking-frameworks';
const filename = 'SKILL.md';
const description = 'Structured approaches to planning, reasoning, and reviewing decisions.';
const maxBytes = 128 * 1024;

function patchFrontmatter(source) {
  if (typeof source !== 'string' || !source.startsWith('---\n')) return null;
  const close = source.indexOf('\n---\n', 4);
  if (close < 4 || close > 4096) return null;
  const header = source.slice(4, close);
  if (!/^name:[ \t]*['"]?thinking-frameworks['"]?[ \t]*$/m.test(header)) return null;
  const lines = header.split('\n');
  const existing = lines.findIndex(line => /^description[ \t]*:/.test(line));
  if (existing >= 0) {
    const value = lines[existing].replace(/^description[ \t]*:[ \t]*/, '').trim();
    if (value && !/^(['"])\1$/.test(value)) return null;
    lines[existing] = 'description: ' + description;
  } else {
    const idx = lines.findIndex(line => /^name[ \t]*:/.test(line));
    lines.splice(idx + 1, 0, 'description: ' + description);
  }
  return '---\n' + lines.join('\n') + source.slice(close);
}

function safeReadTarget(directory, allowedRoot = '/data') {
  if (directory !== path.join(allowedRoot, 'workspace', 'skills', 'thinking-frameworks'))
    throw new Error('unexpected_path');
  for (const item of [allowedRoot, path.join(allowedRoot, 'workspace'),
      path.join(allowedRoot, 'workspace', 'skills'), directory]) {
    if (!fs.lstatSync(item).isDirectory()) throw new Error('unsafe_directory');
  }
  const target = path.join(directory, filename);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) throw new Error('unsafe_file');
  const fd = fs.openSync(target, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const check = fs.fstatSync(fd);
    if (!check.isFile() || check.size > maxBytes) throw new Error('unsafe_file');
    return { target, source: fs.readFileSync(fd, 'utf8'), mode: check.mode & 0o777 };
  } finally { fs.closeSync(fd); }
}

function repairSkill({ directory = root, allowedRoot = '/data' } = {}) {
  let temp;
  try {
    const { target, source, mode } = safeReadTarget(directory, allowedRoot);
    const patched = patchFrontmatter(source);
    if (patched == null) return 'unchanged_or_unrecognized';
    const backup = target + '.pre-jarvis-description-v1';
    try {
      fs.writeFileSync(backup, source, { flag: 'wx', mode: 0o600 });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const status = fs.lstatSync(backup);
      if (!status.isFile() || status.isSymbolicLink() || status.size > maxBytes ||
          fs.readFileSync(backup, 'utf8') !== source) return 'backup_conflict';
    }
    temp = target + '.jarvis-' + crypto.randomBytes(8).toString('hex') + '.tmp';
    fs.writeFileSync(temp, patched, { flag: 'wx', mode });
    if (safeReadTarget(directory, allowedRoot).source !== source) return 'changed_before_write';
    fs.renameSync(temp, target);
    temp = null;
    return 'repaired';
  } catch {
    return 'skipped';
  } finally {
    if (temp) try { fs.unlinkSync(temp); } catch { /* no-op */ }
  }
}

if (require.main === module)
  console.log('[JARVIS] Thinking-frameworks metadata: ' + repairSkill() + '.');
module.exports = { patchFrontmatter, repairSkill };
