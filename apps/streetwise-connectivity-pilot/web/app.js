const api = 'https://api.streetwiseconnection.com';
const get = id => document.getElementById(id);
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));

async function request(path, options) {
  const result = await fetch(api + path,{ signal:AbortSignal.timeout(12_000),...options });
  const data = await result.json();
  if (!result.ok) throw Error(data.error || 'request_failed');
  return data;
}

request('/v1/status').then(({turn_ready,esim_ready})=>{
  get('test').disabled=!turn_ready;
  get('esim-fields').disabled=!esim_ready;
  if (!turn_ready) get('result').textContent='The relay has not been configured.';
  if (!esim_ready) get('esim-result').textContent='The eSIM pilot is closed.';
}).catch(()=>{
  get('result').textContent='The relay API is unavailable.';
  get('esim-result').textContent='The activation API is unavailable.';
});

request('/v1/check-network').then(({is_cbrs}) => {
  get('network').textContent = is_cbrs ? 'Your public IP matches a configured pilot range.'
    : 'Your public IP is outside the configured pilot ranges.';
}).catch(() => { get('network').textContent = 'The network API is unavailable.'; });

function gather(pc) {
  return new Promise((resolve,reject) => {
    const timer = setTimeout(()=>finish(Error('relay_gather_timeout')),8000);
    function finish(error) {
      clearTimeout(timer); pc.removeEventListener('icegatheringstatechange',changed);
      if (error) reject(error); else resolve();
    }
    function changed() { if (pc.iceGatheringState === 'complete') finish(); }
    pc.addEventListener('icegatheringstatechange',changed);
    changed();
  });
}

async function relayed(pc) {
  const stats = await pc.getStats();
  const transport = [...stats.values()].find(report=>report.type==='transport' && report.selectedCandidatePairId);
  const pair = transport ? stats.get(transport.selectedCandidatePairId)
    : [...stats.values()].find(report=>report.type==='candidate-pair' && report.nominated && report.state==='succeeded');
  return stats.get(pair?.localCandidateId)?.candidateType === 'relay' &&
    stats.get(pair?.remoteCandidateId)?.candidateType === 'relay';
}

get('test').addEventListener('click',async () => {
  const button = get('test');
  const output = get('result');
  const code = get('turn-code').value;
  get('turn-code').value = '';
  if (!code) { output.textContent = 'Enter your invited relay access code.'; return; }
  button.disabled = true;
  output.textContent = 'Getting temporary relay access…';
  let first,second,timer;
  try {
    const {iceServers} = await request('/v1/turn',{method:'POST',headers:{'X-Turn-Access-Code':code}});
    const configuration = {iceServers,iceTransportPolicy:'relay'};
    first = new RTCPeerConnection(configuration);
    second = new RTCPeerConnection(configuration);
    second.addEventListener('datachannel',event=>{
      event.channel.addEventListener('message',message=>event.channel.send(message.data));
    });
    const channel = first.createDataChannel('latency',{ordered:false,maxRetransmits:0});
    await first.setLocalDescription(await first.createOffer());
    await gather(first);
    await second.setRemoteDescription(first.localDescription);
    await second.setLocalDescription(await second.createAnswer());
    await gather(second);
    await first.setRemoteDescription(second.localDescription);
    const deadline = performance.now() + 8000;
    while (channel.readyState !== 'open' && performance.now() < deadline) await pause(100);
    if (channel.readyState !== 'open' || !await relayed(first) || !await relayed(second)) throw Error('relay_not_verified');
    output.textContent = 'TURN relay confirmed. Measuring for 10 seconds…';
    const pending = new Map();
    const results = [];
    let sequence = 0;
    const ping = () => {
      if (channel.readyState !== 'open') return;
      const id = String(sequence++);
      pending.set(id,performance.now());
      channel.send(id);
    };
    channel.addEventListener('message',event=>{
      if (!pending.has(event.data)) return;
      results.push(performance.now() - pending.get(event.data));
      pending.delete(event.data);
    });
    ping();
    timer = setInterval(ping,250);
    await pause(10_000);
    if (results.length < 5 || channel.readyState !== 'open' || !await relayed(first) || !await relayed(second)) {
      throw Error('insufficient_samples');
    }
    const average = results.reduce((sum,value)=>sum+value,0) / results.length;
    output.textContent = 'Verified TURN round trip averaged ' + average.toFixed(1) + ' ms. ' +
      results.length + ' of ' + sequence + ' probes replied.';
  } catch (error) {
    if (error.message === 'turn_access_required') { output.textContent = 'The relay access code was rejected.'; }
    else output.textContent = 'No verified TURN result. The API, relay, or browser route was unavailable.';
  } finally {
    clearInterval(timer);first?.close();second?.close();button.disabled=false;
  }
});

const messages = {
  esim_pilot_closed:'eSIM installation is not open yet.',
  pilot_access_required:'The pilot access code was rejected.',
  pilot_request_mismatch:'The details do not match the invited profile.',
  install_not_available:'The provider has not issued the iPhone install link.',
  subscription_not_ready:'The approved subscription is not active.',
  try_again_later:'Please wait before trying again.'
};
get('esim').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=get('esim-submit');
  const result=get('esim-result');
  const install=get('install');
  button.disabled=true; install.hidden=true; install.removeAttribute('href');
  result.textContent='Checking your pilot profile…';
  const code=get('code').value; get('code').value='';
  try {
    const data=await request('/v1/esim',{method:'POST',
      headers:{'Content-Type':'application/json','X-Pilot-Code':code},
      body:JSON.stringify({email:get('email').value,zip:get('zip').value,plan:get('plan').value})});
    const url=new URL(data.smdp_url);
    if (url.origin!=='https://esimsetup.apple.com' || url.pathname!=='/esim_qrcode_provisioning') throw Error('bad_install_link');
    install.href=url.href; install.hidden=false;
    result.textContent='Approved profile ready. Open the install link in Safari.';
  } catch (error) {
    result.textContent=Object.hasOwn(messages,error.message) ? messages[error.message] : 'The activation service is unavailable.';
  } finally { button.disabled=false; }
});
