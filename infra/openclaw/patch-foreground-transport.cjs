'use strict';
// Exact immutable compiled-file fingerprint from verified build 45713634162.
const fs=require('node:fs'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const file='/usr/local/lib/node_modules/openclaw/dist/provider-transport-fetch-CgnF5gpV.mjs';
const hash='4118e7bc57d860e42c6ebfb3e0284ea679b24bd0745be904086d301b304fb5bf';
const fd=fs.openSync(file,fs.constants.O_RDWR|fs.constants.O_NOFOLLOW);
try{
 const info=fs.fstatSync(fd);
 if(!info.isFile()||info.size>16_000_000)throw Error('Unsafe compiled transport');
 const source=fs.readFileSync(fd,'utf8');
 if(crypto.createHash('sha256').update(source).digest('hex')!==hash)throw Error('Compiled transport fingerprint drift');
 const anchor='function buildGuardedModelFetch(';
 if(source.split(anchor).length!==2||source.includes('jarvisOriginalGuardedModelFetch'))throw Error('Transport anchor mismatch');
 const patched='import jarvisForegroundGuard from "/app/foreground-cooldown.cjs";\n'+
  source.replace(anchor,'function jarvisOriginalGuardedModelFetch(')+
  '\nfunction buildGuardedModelFetch(model,...args){return jarvisForegroundGuard.wrapModelFetch(model,jarvisOriginalGuardedModelFetch(model,...args));}\n';
 const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:patched,encoding:'utf8'});
 if(check.status!==0)throw Error('Patched transport syntax failed');
 const bytes=Buffer.from(patched);
 fs.ftruncateSync(fd,0);
 let offset=0;
 while(offset<bytes.length)offset+=fs.writeSync(fd,bytes,offset,bytes.length-offset,offset);
 fs.fsyncSync(fd);
 console.log('[JARVIS] Pinned foreground transport wrapper installed; runtime opt-in only.');
}finally{fs.closeSync(fd);}
