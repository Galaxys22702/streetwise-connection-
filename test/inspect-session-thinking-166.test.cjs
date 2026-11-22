'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { inspect } = require('../infra/openclaw/inspect-session-thinking-166.cjs');
function fixture(t) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'sqlite-thinking-audit-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const agents = path.join(root,'agents','main','agent');
 fs.mkdirSync(agents,{recursive:true});
 const file=path.join(agents,'openclaw-agent.sqlite');
 return {root,file};
}
test('reads canonical SQLite thinking metadata without writing or exposing private content',t=>{
 const f=fixture(t);const db=new DatabaseSync(f.file);
 db.exec('CREATE TABLE session_nodes (entry_json TEXT, entry_valid INTEGER)');
 const add=db.prepare('INSERT INTO session_nodes (entry_json, entry_valid) VALUES (?, ?)');
 add.run(JSON.stringify({thinkingLevel:'off',modelSelectionLocked:true,sessionId:'DO_NOT_PRINT_ID',messages:['DO_NOT_PRINT_MESSAGE']}),1);
 add.run(JSON.stringify({thinkingLevel:'minimal'}),1);
 add.run(JSON.stringify({thinkingLevel:'high'}),1);
 add.run('{}',1); add.run('{INVALID_JSON',1); add.run(JSON.stringify({thinkingLevel:'off'}),0);
 db.close();
 const before=fs.readFileSync(f.file);
 const summary=inspect(f.root);
 assert.deepEqual(summary,{sqliteStores:1,unreadable:0,off:1,minimal:1,other:1,unset:1,locked:1,invalidRows:2});
 assert.deepEqual(fs.readFileSync(f.file),before);
 const child=spawnSync(process.execPath,[path.join(__dirname,'../infra/openclaw/inspect-session-thinking-166.cjs')],{encoding:'utf8',env:{...process.env,OPENCLAW_STATE_DIR:f.root}});
 assert.equal(child.status,0,child.stderr);
 for(const marker of ['DO_NOT_PRINT_ID','DO_NOT_PRINT_MESSAGE',f.root])assert.ok(!child.stdout.includes(marker));
 assert.match(child.stdout,/"off":1/);
});
test('missing session database returns zero aggregate results',t=>{
 const f=fixture(t);
 assert.deepEqual(inspect(f.root),{sqliteStores:0,unreadable:0,off:0,minimal:0,other:0,unset:0,locked:0,invalidRows:0});
});
test('unknown schema is reported generically, with no file paths',t=>{
 const f=fixture(t),db=new DatabaseSync(f.file);
 db.exec('CREATE TABLE unrelated (secret TEXT)');db.close();
 const summary=inspect(f.root);
 assert.equal(summary.unreadable,1);
 assert.ok(!JSON.stringify(summary).includes(f.root));
});

test('allowlisted other thinking levels are counted without leaking raw values',t=>{
 const f=fixture(t);
 const db=new DatabaseSync(f.file);
 db.exec('CREATE TABLE session_nodes (entry_json TEXT, entry_valid INTEGER)');
 const insert=db.prepare('INSERT INTO session_nodes (entry_json, entry_valid) VALUES (?, 1)');
 for(const thinkingLevel of ['minimal','minimal','low','medium','high','xhigh','adaptive','supersecret_this_is_not_a_level','unexpected',22]){
   insert.run(JSON.stringify({thinkingLevel,sessionId:'DO_NOT_PRINT_ID',messages:['DO_NOT_PRINT_MESSAGE']}));
 }
 db.close();
 const summary=inspect(f.root,{includeCategories:true});
 assert.equal(summary.minimal,2);
 assert.equal(summary.other,8);
 assert.deepEqual(summary.otherLevels,{low:1,medium:1,high:1,xhigh:1,adaptive:1,unexpected:3});
 const serialized=JSON.stringify(summary);
 for(const privateData of ['DO_NOT_PRINT_ID','DO_NOT_PRINT_MESSAGE','supersecret_this_is_not_a_level',f.root])
   assert.ok(!serialized.includes(privateData));
});
test('legacy inspection output remains unchanged for existing consumers',t=>{
 const f=fixture(t);
 assert.deepEqual(inspect(f.root),{sqliteStores:0,unreadable:0,off:0,minimal:0,other:0,unset:0,locked:0,invalidRows:0});
});
test('CLI outputs only enum categories and counts, never SQL entry values or paths',t=>{
 const f=fixture(t);
 const db=new DatabaseSync(f.file);
 db.exec('CREATE TABLE session_nodes (entry_json TEXT, entry_valid INTEGER)');
 db.prepare('INSERT INTO session_nodes (entry_json, entry_valid) VALUES (?, 1)').run(JSON.stringify({thinkingLevel:'SECRET_MODEL_LEVEL_DONT_LOG',messages:['PRIVATE_MESSAGE'],sessionId:'SECRET_SESSION_ID'}));
 db.close();
 const child=spawnSync(process.execPath,[path.join(__dirname,'../infra/openclaw/inspect-session-thinking-166.cjs')],{encoding:'utf8',env:{...process.env,OPENCLAW_STATE_DIR:f.root}});
 assert.equal(child.status,0,child.stderr);
 assert.match(child.stdout,/"unexpected":1/);
 assert.match(child.stdout,/"other":1/);
 for(const privateData of ['SECRET_MODEL_LEVEL_DONT_LOG','PRIVATE_MESSAGE','SECRET_SESSION_ID',f.root])
   assert.ok(!child.stdout.includes(privateData));
});
