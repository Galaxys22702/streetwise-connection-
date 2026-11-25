'use strict';
// Read-only build-time discovery. Never inspect runtime state, env values or credentials.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root='/usr/local/lib/node_modules/openclaw/dist';
const markers=['[model-fetch] start provider=','[model-fetch] response provider=','Unsupported fetch input for transport-aware model request'];
function locate(directory){
 const hits=[];
 const queue=[directory];
 let files=0;
 while(queue.length){
  const dir=queue.pop();
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const target=path.join(dir,entry.name);
   if(entry.isSymbolicLink()) continue;
   if(entry.isDirectory()){if(entry.name!=='node_modules') queue.push(target);continue;}
   if(!entry.isFile()||!entry.name.endsWith('.mjs')) continue;
   if(++files>20000) throw Error('bundle scan limit');
   const fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
   try{
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.size>32*1024*1024) continue;
    const source=fs.readFileSync(fd,'utf8');
    if(markers.every(marker=>source.includes(marker))){
     hits.push({file:path.relative(directory,target),sha256:crypto.createHash('sha256').update(source).digest('hex'),markers:markers.map(marker=>({marker,count:source.split(marker).length-1})),namedFunction:/\bfunction\s+buildGuardedModelFetch\s*\(/.test(source)});
    }
   } finally {fs.closeSync(fd);}
  }
 }
 return hits;
}
if(require.main===module){
 try{
  const hits=locate(root);
  console.log('[JARVIS] foreground transport locator '+JSON.stringify({status:hits.length===1?'candidate_found':'unverified',count:hits.length,candidates:hits}));
 }catch{console.log('[JARVIS] foreground transport locator unavailable; no runtime change');}
}
module.exports={locate};
