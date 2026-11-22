'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {shape,inspect}=require('../infra/openclaw/inspect-thinking-skill-shape-166.cjs');

const head='---\nname: thinking-frameworks\n';
const corpus=[
  ['canonical missing description',head+'---\nBODY','description_missing','canonical_lf'],
  ['canonical blank description',head+'description:\n---\nBODY','description_empty','canonical_lf'],
  ['canonical empty double quotes',head+'description: ""\n---\nBODY','description_empty','canonical_lf'],
  ['canonical valid description',head+'description: safe text\n---\nBODY','description_present','canonical_lf'],
  ['BOM with missing description','\ufeff'+head+'---\nBODY','description_missing','utf8_bom'],
  ['CRLF with missing description',(head+'---\nBODY').replace(/\n/g,'\r\n'),'description_missing','crlf_line_endings'],
  ['unclosed frontmatter',head+'BODY','unrecognized','unclosed_frontmatter'],
  ['plain markdown','# Thinking\nBODY','unrecognized','missing_frontmatter'],
  ['wrong YAML name','---\nname: anything-else\n---\nBODY','unrecognized','name_mismatch'],
  ['missing name','---\ndescription: x\n---\nBODY','unrecognized','name_missing'],
  ['quoted canonical name',"---\nname: 'thinking-frameworks'\n---\nBODY",'description_missing','canonical_lf']
];
for(const [name,source,status,reason] of corpus){
 test('classify only enums: '+name,()=>{
   const answer=shape(source);
   assert.equal(answer.status,status);
   assert.equal(answer.reason,reason);
   assert.ok(Object.keys(answer).every(k=>['status','reason','bom','crlf'].includes(k)));
   assert.ok(!JSON.stringify(answer).includes('BODY'));
 });
}
function fixture(t,source='---\nname: thinking-frameworks\n---\nsecret BODY'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-skill-shape-'));
  const skill=path.join(dir,'workspace','skills','thinking-frameworks');
  fs.mkdirSync(skill,{recursive:true});
  const file=path.join(skill,'SKILL.md');
  fs.writeFileSync(file,source);
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return {dir,skill,file};
}
test('real file classified without modifying source, mode or timestamps',t=>{
 const f=fixture(t);
 const before=fs.readFileSync(f.file);
 const stat=fs.statSync(f.file);
 const answer=inspect({directory:f.skill,allowedRoot:f.dir});
 assert.equal(answer.status,'description_missing');
 assert.deepEqual(fs.readFileSync(f.file),before);
 assert.equal(fs.statSync(f.file).mtimeMs,stat.mtimeMs);
 assert.equal(fs.statSync(f.file).mode,stat.mode);
});
test('disallowed path never read',t=>{
 const f=fixture(t);
 assert.deepEqual(inspect({directory:f.dir,allowedRoot:f.dir}),{status:'unavailable',reason:'disallowed_path'});
});
test('symlink target rejected',t=>{
 const f=fixture(t);
 const replacement=path.join(f.dir,'other.md');
 fs.writeFileSync(replacement,'private');
 fs.unlinkSync(f.file);
 fs.symlinkSync(replacement,f.file);
 assert.deepEqual(inspect({directory:f.skill,allowedRoot:f.dir}),{status:'unavailable',reason:'unsafe_file'});
});
test('symlink parent rejected',t=>{
 const f=fixture(t);
 const copy=path.join(f.dir,'alternate');
 fs.renameSync(path.join(f.dir,'workspace','skills'),copy);
 fs.symlinkSync(copy,path.join(f.dir,'workspace','skills'));
 assert.deepEqual(inspect({directory:f.skill,allowedRoot:f.dir}),{status:'unavailable',reason:'unsafe_path'});
});
test('file above size limit is rejected without content logging',t=>{
 const f=fixture(t,'x'.repeat(129*1024));
 assert.deepEqual(inspect({directory:f.skill,allowedRoot:f.dir}),{status:'unavailable',reason:'unsafe_file'});
});
test('module has no writes or network calls',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../infra/openclaw/inspect-thinking-skill-shape-166.cjs'),'utf8');
 for(const phrase of ['writeFileSync','renameSync','unlinkSync','createWriteStream','fetch(','http.request','https.request','child_process','spawn('])
   assert.equal(code.includes(phrase),false,phrase);
});
