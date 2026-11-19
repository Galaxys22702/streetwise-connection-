const node = id => document.getElementById(id);

function normalizeNumber(value) {
  if (!/^\+?[\d ().-]{1,30}$/.test(value.trim())) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10) digits = '1' + digits;
  return /^1[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? '+' + digits : null;
}

node('route').addEventListener('submit', event => {
  event.preventDefault();
  const number = normalizeNumber(node('number').value);
  node('route-result').textContent = number
    ? 'Format accepted for the number ending in ' + number.slice(-4) + '. Simulation complete. No number was dialed.'
    : 'Enter a 10-digit number with an area code, or add +1 before it. Short codes are unavailable.';
});

function gather(peer) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(Error('candidate_timeout')), 4500);
    function finish(error) {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', changed);
      if (error) reject(error);
      else resolve();
    }
    function changed() {
      if (peer.iceGatheringState === 'complete') finish();
    }
    peer.addEventListener('icegatheringstatechange', changed);
    changed();
  });
}

async function testAudio(useMicrophone) {
  const buttons = [node('audio-test'), node('mic-test'), node('speaker-test')];
  const output = node('audio-result');
  if (!window.RTCPeerConnection || !window.AudioContext) {
    output.textContent = 'This browser does not expose the features needed for the audio call test.';
    return;
  }
  if (useMicrophone && !navigator.mediaDevices?.getUserMedia) {
    output.textContent = 'Microphone access is unavailable. Open this page directly in Safari.';
    return;
  }
  buttons.forEach(button => button.disabled = true);
  output.textContent = useMicrophone ? 'Allow microphone access when Safari asks.' : 'Opening two WebRTC connections…';
  let context;
  let sender;
  let receiver;
  let tone;
  let testStream;
  let analyser;
  try {
    context = new AudioContext();
    await context.resume();
    if (useMicrophone) {
      testStream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false });
      output.textContent = 'Connecting the test. Speak when prompted.';
    } else {
      const oscillator = context.createOscillator();
      const level = context.createGain();
      const sink = context.createMediaStreamDestination();
      level.gain.value = 0.1;
      oscillator.connect(level).connect(sink);
      oscillator.start();
      tone = oscillator;
      testStream = sink.stream;
    }
    sender = new RTCPeerConnection();
    receiver = new RTCPeerConnection();
    if (useMicrophone) {
      receiver.addEventListener('track', event => {
        const source = context.createMediaStreamSource(event.streams[0] || new MediaStream([event.track]));
        analyser = context.createAnalyser();
        const mutedMonitor = context.createGain();
        mutedMonitor.gain.value = 0;
        source.connect(analyser).connect(mutedMonitor).connect(context.destination);
      });
    }
    sender.addTrack(testStream.getAudioTracks()[0], testStream);
    await sender.setLocalDescription(await sender.createOffer());
    await gather(sender);
    await receiver.setRemoteDescription(sender.localDescription);
    await receiver.setLocalDescription(await receiver.createAnswer());
    await gather(receiver);
    await sender.setRemoteDescription(receiver.localDescription);
    if (useMicrophone) output.textContent = 'Speak a short sentence now. This test plays no sound.';
    const end = Date.now() + 7500;
    let mostPackets = 0;
    let heardSignal = false;
    while (Date.now() < end) {
      let packets = 0;
      (await receiver.getStats()).forEach(report => {
        if (report.type === 'inbound-rtp' && (report.kind || report.mediaType) === 'audio') {
          packets += report.packetsReceived || 0;
        }
      });
      mostPackets = Math.max(mostPackets, packets);
      if (analyser && !heardSignal) {
        const wave = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(wave);
        heardSignal = wave.some(sample => Math.abs(sample) > 0.015);
      }
      if (mostPackets > 0 && (!useMicrophone || heardSignal)) {
        output.textContent = useMicrophone
          ? 'Passed. This browser received sound from your microphone over WebRTC.'
          : 'Passed. The receiving connection counted ' + mostPackets + ' audio packets on this device.';
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    output.textContent = mostPackets > 0
      ? 'Audio packets arrived, but no clear microphone sound was detected.'
      : useMicrophone
        ? 'The microphone opened, but the browser did not report received WebRTC audio.'
        : 'Inconclusive. The browser did not report received audio packets.';
  } catch (error) {
    output.textContent = error.name === 'NotAllowedError'
      ? 'Microphone permission was denied. Allow it for Streetwise in Safari, then retry.'
      : 'The audio loopback did not complete on this browser.';
  } finally {
    tone?.stop();
    testStream?.getTracks().forEach(track => track.stop());
    sender?.close();
    receiver?.close();
    await context?.close().catch(() => {});
    buttons.forEach(button => button.disabled = false);
  }
}

node('audio-test').addEventListener('click', () => testAudio(false));
node('mic-test').addEventListener('click', () => testAudio(true));
node('speaker-test').addEventListener('click', async () => {
  const button = node('speaker-test');
  const output = node('audio-result');
  if (!window.AudioContext) {
    output.textContent = 'Speaker testing is unavailable in this browser.';
    return;
  }
  button.disabled = true;
  let context;
  try {
    context = new AudioContext();
    await context.resume();
    const tone = context.createOscillator();
    const volume = context.createGain();
    volume.gain.value = 0.12;
    tone.connect(volume).connect(context.destination);
    const finished = new Promise(resolve => tone.addEventListener('ended',resolve,{ once:true }));
    tone.start();
    tone.stop(context.currentTime + 0.45);
    await finished;
    output.textContent = 'Tone played. If you heard it, your current audio output is working.';
  } catch {
    output.textContent = 'The browser could not play the speaker tone.';
  } finally {
    await context?.close().catch(() => {});
    button.disabled = false;
  }
});
