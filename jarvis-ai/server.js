import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port=Number(process.env.PORT||3000);
const sessions=new Map();
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const server=http.createServer(async(req,res)=>{
 const send=(status,obj)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj));};
 if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);return;}
 if(req.method==='GET'&&req.url==='/health'){send(200,{ok:true,aiConfigured:!!process.env.OPENAI_API_KEY});return;}
 if(req.method==='POST'&&req.url==='/api/chat'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){send(413,{error:'Request too large'});return;}}
  let input;try{input=JSON.parse(body)}catch{send(400,{error:'Invalid JSON'});return}
  const message=String(input.message||'').trim();
  if(!message||message.length>4000){send(400,{error:'Message must be 1–4000 characters'});return}
  if(!process.env.OPENAI_API_KEY){send(503,{error:'AI not configured. Set OPENAI_API_KEY on the server, not in the browser.'});return}
  try{
   const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+process.env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:'You are JARVIS, a practical business and creative assistant for Streetwise Connection Media. Never claim to send, purchase, publish, deploy, or edit files. Provide draft plans and require explicit approval for external actions. Do not request secrets.',input:message,max_output_tokens:700})});
   const data=await upstream.json();if(!upstream.ok){send(502,{error:'AI provider request failed ('+upstream.status+').'});return}
   const answer=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'No text returned.';
   send(200,{answer});
  }catch{send(502,{error:'AI provider temporarily unavailable.'})}
  return;
 }
 send(404,{error:'Not found'});
});
server.listen(port,'127.0.0.1',()=>console.log('JARVIS listening on localhost:'+port));
