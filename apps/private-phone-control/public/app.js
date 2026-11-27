const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
let state={devices:[],events:[],checks:[],audit:[]};
let stream;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>s?new Date(s).toLocaleString():'Never';
const capabilities=['sms-in','sms-ai-draft','sms-send','call-in','call-answer','notify','pair','service-health'];
const badge=s=>`<span class="badge ${escapeHtml(s)}">${escapeHtml(s||'unknown')}</span>`;
const name=id=>state.devices.find(x=>x.id===id)?.alias||'Unknown device';
const toast=msg=>{const el=$('#flash');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000)};
async function api(path,{method='GET',body}={}){
 const init={method,credentials:'same-origin',headers:{}};
 if(body!==undefined){init.headers['content-type']='application/json';init.headers['x-streetwise-request']='owner-ui';init.body=JSON.stringify(body)}
 const res=await fetch(path,init);const data=await res.json().catch(()=>({error:'Unexpected response'}));
 if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);return data;
}
async function load(){try{state=await api('/api/state');render()}catch(e){if(e.message.includes('Sign in'))showLock();else toast(`Cannot refresh: ${e.message}`)}}
function showLock(){$('#app').hidden=true;$('#lock').hidden=false;stream?.close();}
async function unlock(){const res=await api('/api/session');if(res.authenticated){$('#lock').hidden=true;$('#app').hidden=false;await load();subscribe()}else showLock()}
function subscribe(){stream?.close();stream=new EventSource('/api/stream');stream.addEventListener('update',async ev=>{let data={};try{data=JSON.parse(ev.data)}catch{}await load();if(data.kind==='sms'||data.kind==='call'){toast(`New ${data.kind.toUpperCase()} bridge event. Review the inbox.`);if(document.hidden&&typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification('Streetwise incoming event',{body:'Open private control center to review. No contents shown.'})}});stream.addEventListener('error',()=>{ /* browser reconnects automatically; not a telecom failure */ });}
function nav(tab){$$('.tab').forEach(e=>e.hidden=e.id!==`tab-${tab}`);$$('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));$('#crumb').textContent=tab.toUpperCase();window.scrollTo({top:0,behavior:'instant'});}
function render(){
 const pending=state.events.filter(e=>e.kind==='sms'&&e.status==='needs-approval').length;
 $('#stats').innerHTML=[[state.devices.length,'Registered devices'],[state.events.length,'Recorded events'],[pending,'SMS needing approval'],[state.checks.filter(x=>x.status==='verified'&&x.completed).length,'Verified check records']].map(([v,l])=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
 $('#recent').innerHTML=state.events.length?state.events.slice(0,5).map(e=>`<div class="listitem"><div><b>${e.kind==='sms'?'✉ SMS':'☎ Call'} · ${escapeHtml(name(e.deviceId))}</b><p>${fmt(e.createdAt)} · ${escapeHtml(e.source)}</p></div>${badge(e.status)}</div>`).join(''):'<div class="empty">No inbound events observed yet. Nothing is connected automatically.</div>';
 const devices=state.devices;
 const options=devices.map(d=>`<option value="${d.id}">${escapeHtml(d.alias)} · ${escapeHtml(d.platform)}</option>`).join('');
 $('#checkDevice').innerHTML=options||'<option value="">Register a device first</option>';
 $('#deviceList').innerHTML=devices.length?devices.map(d=>`<div class="listitem"><div><b>${escapeHtml(d.alias)} · ${escapeHtml(d.platform)}</b><p>Integration: ${escapeHtml(d.integration)} · Last four ${d.last4?'••'+escapeHtml(d.last4.slice(-2)):'hidden'}</p><p>Registered ${fmt(d.createdAt)}. Carrier/device live access not verified.</p></div><button data-action="token" data-id="${d.id}">Generate bridge key</button></div>`).join(''):'<div class="empty">No device registered. Add one to start scoped tests.</div>';
 $('#events').innerHTML=state.events.length?state.events.map(e=>{
 const sms=e.kind==='sms';const draft=sms?`<p><b>Fallback draft:</b> ${escapeHtml(e.draft?.text||'')}</p><p>Draft source: ${escapeHtml(e.draft?.source||'Not known')}. AI drafting unverified.</p>`:'';
 let actions='';if(sms&&e.status==='needs-approval')actions=`<button data-action="approve" data-id="${e.id}">Review & approve</button>`;
 if(sms&&e.status==='approved-not-sent')actions=`<button data-action="delivery" data-id="${e.id}">Record external delivery proof</button>`;
 if(!sms)actions=`<button data-action="call" data-id="${e.id}">Record call outcome</button>`;
 return `<div class="listitem"><div><b>${sms?'✉ Incoming SMS':'☎ Incoming call'} · ${escapeHtml(name(e.deviceId))}</b><p>${fmt(e.createdAt)} · ${escapeHtml(e.source)} · ${escapeHtml(e.reference)} · Sender ending ${e.fromLast4?'••'+escapeHtml(e.fromLast4.slice(-2)):'hidden'}</p>${draft}<div class="itemactions">${actions}</div></div>${badge(e.status)}</div>`;
 }).join(''):'<div class="empty">No real, manual or test events recorded.</div>';
 const rows=[];
 for(const d of devices){
   // Unknown is rendered explicitly for every capability. Never inherit from another device or adapter.
   const integrations=[...new Set([d.integration,...state.checks.filter(c=>c.deviceId===d.id).map(c=>c.integration)])];
   for(const integration of integrations)for(const capability of capabilities){
     const c=state.checks.find(c=>c.deviceId===d.id&&c.integration===integration&&c.capability===capability);
     rows.push(`<tr><td>${escapeHtml(d.alias)}<br><small>${escapeHtml(d.platform)} / ${escapeHtml(integration)}</small></td><td>${escapeHtml(capability)}</td><td>${badge(c?.status||'unknown')}</td><td>${fmt(c?.checkedAt)}</td><td>Evidence: ${escapeHtml(c?.evidence||'none')}<br>Error: ${escapeHtml(c?.error||'none')}<br>Next: ${escapeHtml(c?.next||'Perform a consented device-specific end-to-end test')}<br>Completed test: ${c?.completed?'yes':'no'}${c?'<br>Source: owner-reported':''}</td></tr>`);
   }
 }
 $('#checks').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5">Register a device to see every capability as unknown.</td></tr>';
}
function modal(title,fields,submit,save){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=fields;$('#submitModal').textContent=submit;$('#modalForm').onsubmit=async e=>{e.preventDefault();const form=e.target;const data=Object.fromEntries(new FormData(form).entries());try{await save(data);$('#modal').close();toast('Record saved. No SMS or call was sent.');await load()}catch(err){toast(err.message)}};$('#modal').showModal();}
function manualEvent(){if(!state.devices.length)return toast('Register a device first.');const opt=state.devices.map(d=>`<option value="${d.id}">${escapeHtml(d.alias)} · ${escapeHtml(d.platform)}</option>`).join('');modal('Record observed / test event',`<label>Device<select name="deviceId">${opt}</select></label><label>Event<select name="kind"><option value="sms">SMS</option><option value="call">Call</option></select></label><label>Reference, no message body<input name="reference" minlength="5" required placeholder="consented-test-001"></label><label>Sender last four only<input name="fromLast4" maxlength="4" inputmode="numeric"></label><p class="quiet">Creates a MANUAL event only. It is not evidence of an actual incoming cellular event.</p>`,'Record event',d=>api('/api/events',{method:'POST',body:d}));}
function review(e){modal('Approve SMS fallback',`<p><b>Event:</b> ${escapeHtml(e.reference)}</p><p><b>Draft:</b> ${escapeHtml(e.draft.text)}</p><p>Approval records human consent but does not send an SMS. JARVIS AI draft is not connected.</p><label class="check"><input name="confirm" type="checkbox" required> I reviewed this exact draft and approve it for future verified sending.</label>`,'Approve, do not send',d=>api(`/api/events/${e.id}/approve`,{method:'POST',body:{confirm:d.confirm==='on'}}));}
function delivered(e){modal('Record independently observed delivery',`<p>No sender exists in this controller. Record only actual confirmation from an outside authorized sender.</p><label>External message ID / receipt<input name="proof" minlength="8" maxlength="160" required placeholder="Provider test receipt reference"></label><label class="check"><input name="confirm" type="checkbox" required> I independently verified delivery outside this controller.</label>`,'Record external proof',d=>api(`/api/events/${e.id}/confirm-delivery`,{method:'POST',body:{proof:d.proof,confirm:d.confirm==='on'}}));}
function callOutcome(e){modal('Record call outcome',`<label>Outcome<select name="outcome"><option value="needs-attention">Needs attention</option><option value="missed">Missed</option><option value="answered-by-jarvis">Answered by JARVIS (external test only)</option></select></label><label>Redacted evidence<input name="proof" maxlength="160" placeholder="Completed call reference"></label><label class="check"><input name="confirm" type="checkbox"> I verified this actual external call result.</label>`,'Record outcome',d=>api(`/api/events/${e.id}/call-outcome`,{method:'POST',body:{outcome:d.outcome,proof:d.proof,confirm:d.confirm==='on'}}));}
$('#login').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',body:{key:$('#ownerKey').value}});$('#ownerKey').value='';$('#loginError').textContent='';await unlock()}catch(err){$('#loginError').textContent=err.message}});
$('#logout').addEventListener('click',async()=>{await api('/api/logout',{method:'POST',body:{}}).catch(()=>{});showLock()});
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.tab)));
$('#deviceForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());try{await api('/api/devices',{method:'POST',body:data});e.target.reset();toast('Device registered. External access still disconnected.');await load()}catch(err){toast(err.message)}});
$('#checkForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());data.completed=data.completed==='on';try{await api('/api/checks',{method:'POST',body:data});e.target.reset();toast('Device-specific verification stored.');await load()}catch(err){toast(err.message)}});
$('#manualEventButton').addEventListener('click',manualEvent);
$('#cancelModal').addEventListener('click',()=>$('#modal').close());
$('#deviceList').addEventListener('click',async e=>{const b=e.target.closest('[data-action="token"]');if(!b)return;if(!confirm('Rotate/create a scoped inbound device key? An existing key for this device will stop working.'))return;try{const x=await api(`/api/devices/${b.dataset.id}/bridge-token`,{method:'POST',body:{}});$('#bridgeKey').value=x.bridgeKey;$('#keyReveal').hidden=false;toast('Bridge key issued once. Keep it private.')}catch(err){toast(err.message)}});
$('#hideBridgeKey').addEventListener('click',()=>{$('#bridgeKey').value='';$('#keyReveal').hidden=true});
$('#events').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const event=state.events.find(x=>x.id===b.dataset.id);if(!event)return;({approve:review,delivery:delivered,call:callOutcome}[b.dataset.action]||(()=>{}))(event)});
$('#eraseLocal').addEventListener('click',async()=>{
 if(!confirm('ERASE all locally saved devices, events, tests and audit entries? This cannot be undone.'))return;
 const phrase=prompt('Type ERASE LOCAL DATA to confirm permanent local deletion:');
 if(phrase!=='ERASE LOCAL DATA')return toast('Deletion canceled.');
 try{const result=await api('/api/privacy/erase-local',{method:'POST',body:{confirm:phrase}});toast(`Local records erased. No external changes. ${result.removed.events} events cleared.`);await load()}catch(e){toast(e.message)}
});
$('#healthButton').addEventListener('click',async()=>{try{$('#healthResult').textContent=JSON.stringify(await api('/api/health'),null,2)}catch(e){$('#healthResult').textContent=e.message}});
$('#notifications').addEventListener('click',async()=>{if(!('Notification' in window))return toast('Browser notifications unavailable');const p=await Notification.requestPermission();toast(`Notification permission: ${p}. Only while this dashboard is open.`)});
unlock();
