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
