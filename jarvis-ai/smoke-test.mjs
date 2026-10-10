import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port=String(30000+Math.floor(Math.random()*20000));
const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:port,OPENAI_API_KEY:''},stdio:'ignore'});
try {
 let response;
 for(let i=0;i<30;i++){
  try {response=await fetch('http://127.0.0.1:'+port+'/health');break;}catch{await new Promise(r=>setTimeout(r,100));}
 }
 assert.ok(response,'Server did not start');
 assert.equal(response.status,200);
 const health=await response.json();
 assert.equal(health.ok,true);
 assert.equal(health.aiConfigured,false);
 const home=await fetch('http://127.0.0.1:'+port+'/');
 assert.equal(home.status,200);
 assert.match(await home.text(),/JARVIS AI/);
 const invalid=await fetch('http://127.0.0.1:'+port+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:''})});
 assert.equal(invalid.status,400);
 const noKey=await fetch('http://127.0.0.1:'+port+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Hello JARVIS'})});
 assert.equal(noKey.status,503);
 console.log('JARVIS local smoke tests passed');
} finally {child.kill();}
