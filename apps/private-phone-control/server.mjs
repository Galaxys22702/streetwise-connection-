import http from 'node:http';
import { readFile, writeFile, mkdir, rename, chmod, unlink } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA = process.env.STREETWISE_DATA_DIR || join(homedir(), '.streetwise-private');
const PORT = Number(process.env.STREETWISE_PORT || 8789);
const HOST = '127.0.0.1'; // Intentionally no external listener.
const DB_FILE = join(DATA, 'state.json');
const KEY_FILE = join(DATA, 'owner-key');
const MAX_BODY = 8_192;
const CAPABILITIES = new Set(['sms-in','sms-ai-draft','sms-send','call-in','call-answer','notify','pair','service-health']);
const PLATFORMS = new Set(['Android','iPhone / iOS','Windows','macOS','Linux','Provider / VoIP','Other']);
const OUTCOMES = new Set(['unknown','unverified','failed','verified']);
const clients = new Set();
const sessions = new Map();
let db = {version:1,devices:[],events:[],checks:[],audit:[]};
let ownerKey;
let server;
let activePort = PORT;
let persistence = Promise.resolve();
const loginAttempts = new Map();

function hash(v){return createHash('sha256').update(v).digest('hex');}
function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const aa=Buffer.from(hash(a),'hex'),bb=Buffer.from(hash(b),'hex');return timingSafeEqual(aa,bb);}
function now(){return new Date().toISOString();}
function id(prefix){return `${prefix}_${randomBytes(10).toString('hex')}`;}
function text(v,n=180){return String(v??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n);}
function safeRef(v,n=120){return text(v,n).replace(/(?:\+?\d[\s.()\-]*){7,}/g,'[redacted number]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/ig,'[redacted email]').replace(/\b(?:sk-[\w-]{8,}|Bearer\s+\S+)\b/ig,'[redacted credential]');}
function last4(v){return String(v??'').replace(/\D/g,'').slice(-4);}
function fail(code,message){const e=new Error(message);e.status=code;return e;}
function assert(b,msg){if(!b)throw fail(400,msg);}
function scrubPublic(){return {devices:db.devices.map(({bridgeHash,...d})=>d),events:db.events,checks:db.checks,audit:db.audit.slice(-50),settings:{storage:'private local file',bridge:'localhost only',outbound:'disabled',ai:'disabled',autoReply:false}};}
async function persist(){
 // Serialized atomic snapshots: simultaneous bridge events cannot corrupt state.json.
 const snapshot=JSON.stringify(db,null,2);
 persistence=persistence.catch(()=>{}).then(async()=>{
   const temp=join(DATA,`state-${process.pid}-${randomBytes(6).toString('hex')}.tmp`);
   try{
     await writeFile(temp,snapshot,{mode:0o600,flag:'wx'});
     await chmod(temp,0o600);
     await rename(temp,DB_FILE);
   }finally{await unlink(temp).catch(()=>{});}
 });
 return persistence;
}
function record(action,detail){db.audit.push({at:now(),action,detail:safeRef(detail,140)});db.audit=db.audit.slice(-250);}
function emit(event){const data=`event: update\ndata: ${JSON.stringify({id:event?.id||null,kind:event?.kind||'state'})}\n\n`;for(const c of clients){try{c.write(data)}catch{clients.delete(c)}}}
function respond(res,code,data){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
function lockHeaders(res){res.setHeader('x-content-type-options','nosniff');res.setHeader('x-frame-options','DENY');res.setHeader('referrer-policy','no-referrer');res.setHeader('cache-control','no-store');res.setHeader('permissions-policy','camera=(), microphone=(), geolocation=(), payment=()');res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");}
async function body(req){let sum=0;const parts=[];for await(const chunk of req){sum+=chunk.length;if(sum>MAX_BODY)throw fail(413,'Request too large');parts.push(chunk)}if(!parts.length)return {};try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail(400,'Invalid JSON')}}
function protectedOrigin(req){const host=req.headers.host;const allowed=new Set([`127.0.0.1:${activePort}`,`localhost:${activePort}`]);if(!allowed.has(host))throw fail(403,'Local host only');if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin)}catch{throw fail(403,'Origin denied')}if(origin.protocol!=='http:'||!allowed.has(origin.host))throw fail(403,'Origin denied');}}
function session(req){const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('streetwise_session='))?.slice('streetwise_session='.length);return cookie&&sessions.get(cookie)>Date.now();}
function requireSession(req){if(!session(req))throw fail(401,'Sign in to the private controller');}
function requireWrite(req){requireSession(req);if(req.headers['x-streetwise-request']!=='owner-ui')throw fail(403,'Request header required');if(!String(req.headers['content-type']).startsWith('application/json'))throw fail(415,'JSON required');}
function deviceById(id){const d=db.devices.find(x=>x.id===id);if(!d)throw fail(404,'Device not found');return d;}
function eventById(id){const e=db.events.find(x=>x.id===id);if(!e)throw fail(404,'Event not found');return e;}
function addEvent(p,source,device){
 assert(['call','sms'].includes(p.kind),'Event must be call or sms');
 assert(p.reference&&safeRef(p.reference).length>=5,'A non-sensitive event reference is required');
 assert(!('message' in p)&&!('body' in p)&&!('content' in p),'Do not upload message contents');
 const reference=safeRef(p.reference),dedupe=`${device.id}:${p.kind}:${reference}`;
 const prior=db.events.find(e=>e.dedupe===dedupe);if(prior)return {event:prior,created:false};
 const e={id:id('evt'),deviceId:device.id,platform:device.platform,kind:p.kind,source,reference,fromLast4:last4(p.fromLast4),createdAt:now(),status:p.kind==='sms'?'needs-approval':'needs-attention',draft:p.kind==='sms'?{text:"I'm not available right now. I'll get back to you as soon as I can.",source:'local fallback template',status:'pending',approvedAt:null,deliveryProof:null}:null,dedupe};
 db.events.unshift(e);db.events=db.events.slice(0,1000);record('event_received',`${source} ${p.kind} ${device.alias} (${reference})`);return {event:e,created:true};
}
function requireIdempotency(p){assert(typeof p==='object'&&p!==null&&!Array.isArray(p),'Object required')}
async function serve(req,res,path){
 let file=path==='/'?'index.html':path.slice(1);
 if(!['index.html','app.js','style.css'].includes(file))throw fail(404,'Not found');
 const full=resolve(PUBLIC,file);if(!full.startsWith(PUBLIC+'/'))throw fail(403,'Denied');
 const buf=await readFile(full);res.writeHead(200,{'content-type':extname(file)==='.html'?'text/html; charset=utf-8':extname(file)==='.js'?'text/javascript; charset=utf-8':'text/css; charset=utf-8'});res.end(buf);
}
async function handler(req,res){lockHeaders(res);try{
 protectedOrigin(req);const url=new URL(req.url,'http://localhost');const p=url.pathname;const method=req.method;
 if(method==='GET'&&p==='/api/health')return respond(res,200,{controller:'up',telephony:'not connected',ai:'not connected',outbound:'disabled'});
 if(method==='GET'&&p==='/api/session')return respond(res,200,{authenticated:!!session(req)});
 if(method==='POST'&&p==='/api/login'){
   const input=await body(req);assert(typeof input.key==='string','Key required');
   const attempts=loginAttempts.get('localhost')||{count:0,until:0};
   if(attempts.until>Date.now())throw fail(429,'Login temporarily locked. Retry later.');
   if(!equalSecret(input.key,ownerKey)){
     attempts.count+=1;
     if(attempts.count>=8){attempts.until=Date.now()+60_000;attempts.count=0;}
     loginAttempts.set('localhost',attempts);
     throw fail(401,'Invalid key');
   }
   loginAttempts.delete('localhost');
   const sid=randomBytes(32).toString('hex');sessions.set(sid,Date.now()+24*60*60*1000);
   res.setHeader('set-cookie',`streetwise_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
   return respond(res,200,{ok:true});
 }
 if(method==='POST'&&p==='/api/logout'){requireWrite(req);const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('streetwise_session='))?.split('=')[1];sessions.delete(c);res.setHeader('set-cookie','streetwise_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return respond(res,200,{ok:true});}
 if(method==='POST'&&p==='/api/bridge/event'){
   const deviceId=text(req.headers['x-streetwise-device'],90);const token=req.headers['x-streetwise-bridge-key'];
   if(!deviceId||typeof token!=='string'||token.length<32)throw fail(403,'Device bridge not authorized');
   const d=deviceById(deviceId);
   if(!d.bridgeHash||!equalSecret(hash(token),d.bridgeHash))throw fail(403,'Device bridge not authorized');
   // Intentionally do not collect message bodies or caller numbers.
   const data=await body(req);requireIdempotency(data);
   const result=addEvent(data,'authenticated device bridge',d);if(result.created){await persist();emit(result.event)}return respond(res,result.created?201:200,{accepted:true,duplicate:!result.created,eventId:result.event.id});
 }
 if(method==='GET'&&p==='/api/stream'){
   requireSession(req);res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','connection':'keep-alive','x-accel-buffering':'no'});res.write('retry: 5000\nevent: ready\ndata: {}\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
 }
 if(method==='GET'&&p==='/api/state'){requireSession(req);return respond(res,200,scrubPublic());}
 if(method==='POST'&&p.startsWith('/api/')){
   requireWrite(req);const data=await body(req);requireIdempotency(data);
   if(p==='/api/privacy/erase-local'){
     assert(data.confirm==='ERASE LOCAL DATA','Explicit erase confirmation required');
     const removed={devices:db.devices.length,events:db.events.length,checks:db.checks.length};
     db={version:1,devices:[],events:[],checks:[],audit:[]};
     record('local_data_erased','All local device, event and verification records erased');
     await persist();emit({kind:'privacy'});return respond(res,200,{erased:true,removed,externalChanges:false});
   }
   if(p==='/api/devices'){
     assert(text(data.alias,60).length>=2,'Device alias required');assert(PLATFORMS.has(data.platform),'Select a supported platform');
     const d={id:id('dev'),alias:safeRef(data.alias,60),platform:data.platform,last4:last4(data.last4),integration:safeRef(data.integration,100)||'Not connected',createdAt:now(),bridgeHash:null};db.devices.push(d);record('device_created',d.alias);await persist();emit({kind:'device'});return respond(res,201,{device:{...d,bridgeHash:undefined}});
   }
   if(p.startsWith('/api/devices/')&&p.endsWith('/bridge-token')){
     const d=deviceById(p.split('/')[3]);const key=randomBytes(32).toString('hex');d.bridgeHash=hash(key);record('bridge_key_rotated',d.alias);await persist();emit({kind:'device'});return respond(res,200,{deviceId:d.id,bridgeKey:key,note:'Save privately. This token is shown only once; rotating revokes the prior key.'});
   }
   if(p==='/api/events'){
     const d=deviceById(text(data.deviceId,90));const result=addEvent(data,'owner manual record',d);if(result.created){await persist();emit(result.event)}return respond(res,result.created?201:200,{eventId:result.event.id,duplicate:!result.created});
   }
   if(p.startsWith('/api/events/')&&p.endsWith('/approve')){
     const e=eventById(p.split('/')[3]);assert(e.kind==='sms'&&e.status==='needs-approval','SMS must be pending');assert(data.confirm===true,'Explicit approval required');
     // No send integration exists: approval is a state change, not a transmission.
     e.draft.status='approved';e.draft.approvedAt=now();e.status='approved-not-sent';record('draft_approved',e.reference);await persist();emit(e);return respond(res,200,{status:e.status,sent:false});
   }
   if(p.startsWith('/api/events/')&&p.endsWith('/confirm-delivery')){
     const e=eventById(p.split('/')[3]);assert(e.kind==='sms'&&e.status==='approved-not-sent','Approve the SMS first');assert(data.confirm===true&&safeRef(data.proof,160).length>=8,'Provide actual external delivery proof');
     e.draft.deliveryProof=safeRef(data.proof,160);e.status='delivery-recorded';e.draft.status='reported-delivered';record('external_delivery_recorded',e.reference);await persist();emit(e);return respond(res,200,{status:e.status,externallyReported:true,sentByController:false});
   }
   if(p.startsWith('/api/events/')&&p.endsWith('/call-outcome')){
     const e=eventById(p.split('/')[3]);assert(e.kind==='call','Call event required');assert(['answered-by-jarvis','missed','needs-attention'].includes(data.outcome),'Invalid outcome');
     if(data.outcome==='answered-by-jarvis')assert(data.confirm===true&&safeRef(data.proof,160).length>=8,'Completed test evidence required');
     e.status=data.outcome;e.outcomeProof=safeRef(data.proof,160);record('call_outcome_recorded',e.reference);await persist();emit(e);return respond(res,200,{status:e.status,scope:'owner-reported external result'});
   }
   if(p==='/api/checks'){
     assert(CAPABILITIES.has(data.capability),'Invalid capability');assert(OUTCOMES.has(data.status),'Invalid status');
     const d=deviceById(text(data.deviceId,90));const done=data.completed===true;const evidence=safeRef(data.evidence,220);
     if(data.status==='verified')assert(done&&evidence.length>=8,'Verified requires completed test and evidence');
     const check={id:id('check'),deviceId:d.id,platform:d.platform,integration:safeRef(data.integration,100)||d.integration,capability:data.capability,status:data.status,checkedAt:now(),completed:done,evidence,error:safeRef(data.error,180),next:safeRef(data.next,220),scope:'owner-reported'};db.checks.unshift(check);db.checks=db.checks.slice(0,500);record('capability_check',`${d.alias} ${check.capability} ${check.status}`);await persist();emit({kind:'check'});return respond(res,201,{check});
   }
   throw fail(404,'Unknown action');
 }
 if(method==='GET')return serve(req,res,p);
 throw fail(405,'Method not allowed');
 }catch(e){const code=e.status||500;if(code===500)console.error('Private controller error:',e?.code||e?.name||'error');if(!res.headersSent)respond(res,code,{error:code===500?'Internal error':e.message});else res.end();}}
export async function start({port=PORT}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
 activePort=port;
 await mkdir(DATA,{recursive:true,mode:0o700});await chmod(DATA,0o700);
 try{ownerKey=(await readFile(KEY_FILE,'utf8')).trim();if(ownerKey.length<32)throw new Error('Owner key too short');}catch(e){if(e.code!=='ENOENT')throw e;ownerKey=randomBytes(32).toString('hex');await writeFile(KEY_FILE,ownerKey,{mode:0o600,flag:'wx'});}
 try{const parsed=JSON.parse(await readFile(DB_FILE,'utf8'));if(parsed.version===1&&Array.isArray(parsed.devices)&&Array.isArray(parsed.events)&&Array.isArray(parsed.checks)&&Array.isArray(parsed.audit))db=parsed;else throw new Error('Invalid data');}catch(e){if(e.code!=='ENOENT')throw e;await persist();}
 server=http.createServer(handler);await new Promise((resolve,reject)=>server.once('error',reject).listen(port,HOST,resolve));
 console.log(`Streetwise private controller listening at http://${HOST}:${port}/`);
 console.log(`Owner key saved locally at ${KEY_FILE} (never paste it into chat).`);
 console.log('Telephony, SMS sending and AI adapters: DISCONNECTED. This service is localhost only.');
 return {port,stop:()=>new Promise(r=>server.close(r))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))start().catch(e=>{console.error(e.message);process.exitCode=1});
