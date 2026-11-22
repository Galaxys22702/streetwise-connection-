'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { classifyConfigBackup, BACKUP_SUFFIX } = require('../infra/openclaw/inspect-backup-gate-166.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-166-backup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = path.join(root, 'openclaw.json');
  fs.writeFileSync(config, '{"token":"EXAMPLE_PRIVATE_SECRET","thinkingDefault":"off"}', { mode: 0o600 });
  return { root, config, backup: config + BACKUP_SUFFIX };
}
test('absent backup does not establish write permission', t => {
  const f=fixture(t), before=fs.readFileSync(f.config);
  assert.deepEqual(classifyConfigBackup(f.config), { status:'absent',blocksExistingSnapshot:false,creationPossible:'unknown' });
  assert.deepEqual(fs.readFileSync(f.config),before);
  assert.equal(fs.existsSync(f.backup),false);
});
test('matching private snapshot is classified without rewriting it', t => {
  const f=fixture(t);fs.copyFileSync(f.config,f.backup);fs.chmodSync(f.backup,0o600);
  const before=fs.readFileSync(f.backup);
  assert.deepEqual(classifyConfigBackup(f.config),{status:'matching_private_snapshot',blocksExistingSnapshot:false});
  assert.deepEqual(fs.readFileSync(f.backup),before);
});
test('different private snapshot is a blocking explanation without revealing values',t=>{
  const f=fixture(t);fs.writeFileSync(f.backup,'{"token":"OTHER_PRIVATE_SECRET"}',{mode:0o600});
  const before=fs.readFileSync(f.backup),out=classifyConfigBackup(f.config);
  assert.deepEqual(out,{status:'different_private_snapshot',blocksExistingSnapshot:true});
  assert.deepEqual(fs.readFileSync(f.backup),before);
  for(const secret of ['EXAMPLE_PRIVATE_SECRET','OTHER_PRIVATE_SECRET',f.root])assert.ok(!JSON.stringify(out).includes(secret));
});
test('nonprivate snapshot is blocked',t=>{
  const f=fixture(t);fs.writeFileSync(f.backup,'{}',{mode:0o600});fs.chmodSync(f.backup,0o644);
  assert.equal(classifyConfigBackup(f.config).status,'permissions_not_private');
});
test('symlink snapshot is not followed',t=>{
  const f=fixture(t);fs.symlinkSync(f.config,f.backup);
  assert.equal(classifyConfigBackup(f.config).status,'unsafe_symlink');
});
test('directory snapshot is not read',t=>{
  const f=fixture(t);fs.mkdirSync(f.backup);
  assert.equal(classifyConfigBackup(f.config).status,'not_regular');
});
test('missing current config reports generic unreadable without paths',t=>{
  const f=fixture(t);fs.copyFileSync(f.config,f.backup);fs.chmodSync(f.backup,0o600);fs.rmSync(f.config);
  assert.deepEqual(classifyConfigBackup(f.config),{status:'unreadable_or_unsafe',blocksExistingSnapshot:true});
});
test('symlink target config cannot be opened',t=>{
  const f=fixture(t);fs.copyFileSync(f.config,f.backup);fs.chmodSync(f.backup,0o600);
  const real=path.join(f.root,'real.json');fs.renameSync(f.config,real);fs.symlinkSync(real,f.config);
  assert.equal(classifyConfigBackup(f.config).status,'unreadable_or_unsafe');
});

// Exercise the executable diagnostic on a synthetic state without reading secrets.
test('CLI prints only aggregate status when backup is different', t => {
  const { spawnSync } = require('node:child_process');
  const f = fixture(t);
  fs.writeFileSync(f.backup, '{"secret":"NEVER_LOG_THIS"}', {mode:0o600});
  const before = fs.readFileSync(f.config);
  const result = spawnSync(process.execPath, [path.join(__dirname,'../infra/openclaw/inspect-backup-gate-166.cjs')], {
    encoding:'utf8', env:{...process.env, OPENCLAW_CONFIG_PATH:f.config}
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"status":"different_private_snapshot"/);
  for(const forbidden of ['NEVER_LOG_THIS', 'EXAMPLE_PRIVATE_SECRET', f.root]) assert.ok(!result.stdout.includes(forbidden));
  assert.deepEqual(fs.readFileSync(f.config),before);
});
