export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const message=typeof req.body?.message==='string'?req.body.message.trim():'';
 if(!message||message.length>4000)return res.status(400).json({error:'Message must be 1–4000 characters'});
 if(!process.env.OPENAI_API_KEY || process.env.JARVIS_DEPLOYMENT_READY!=='true')return res.status(503).json({error:'JARVIS remains locked until private access is enabled and the server is configured.'});
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:'You are JARVIS for Streetwise Connection Media. Provide helpful plans and drafts. Never claim to have sent, purchased, posted, deployed, or edited files. External actions require explicit user approval. Never ask for API keys.',input:message,max_output_tokens:700}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)return res.status(502).json({error:'AI provider request failed ('+response.status+').'});
  const data=await response.json();
  const answer=(data.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('\n')||'No text returned.';
  return res.status(200).json({answer});
 }catch{return res.status(502).json({error:'AI provider temporarily unavailable.'});}
}
