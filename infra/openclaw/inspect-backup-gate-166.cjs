'use strict';
// Issue #166: observe the *configuration* backup gate without changing data.
// Does not print or return paths, credentials, transcripts, config or file hashes.
// This is a point-in-time diagnostic, not permission to modify persisted state.
const fs = require('node:fs');
const BACKUP_SUFFIX = '.pre-jarvis-free-chat-v1';
const MAX_BYTES = 16 * 1024 * 1024;
const { O_RDONLY, O_NOFOLLOW } = fs.constants;

function readRegularBounded(file, privateOnly) {
  const fd = fs.openSync(file, O_RDONLY | O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('unsafe_file');
    if (privateOnly && (stat.mode & 0o077) !== 0) throw new Error('not_private');
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function classifyConfigBackup(target) {
  if (typeof target !== 'string' || !target.trim()) return { status: 'invalid_target', blocksExistingSnapshot: null };
  const backup = target + BACKUP_SUFFIX;
  let stat;
  try { stat = fs.lstatSync(backup); }
  catch (error) {
    return error?.code === 'ENOENT'
      ? { status: 'absent', blocksExistingSnapshot: false, creationPossible: 'unknown' }
      : { status: 'inaccessible', blocksExistingSnapshot: null, creationPossible: 'unknown' };
  }
  if (stat.isSymbolicLink()) return { status: 'unsafe_symlink', blocksExistingSnapshot: true };
  if (!stat.isFile()) return { status: 'not_regular', blocksExistingSnapshot: true };
  if ((stat.mode & 0o077) !== 0) return { status: 'permissions_not_private', blocksExistingSnapshot: true };
  try {
    const before = readRegularBounded(backup, true);
    const current = readRegularBounded(target, false);
    // Bytewise comparison follows savePrivateBackup's semantics; no data leaves process.
    return { status: before.equals(current) ? 'matching_private_snapshot' : 'different_private_snapshot', blocksExistingSnapshot: !before.equals(current) };
  } catch {
    return { status: 'unreadable_or_unsafe', blocksExistingSnapshot: true };
  }
}

module.exports = { classifyConfigBackup, BACKUP_SUFFIX };
