const byId = id => document.getElementById(id);
const set = (id, value) => { byId(id).textContent = value; };

function checkCapabilities() {
  const online = navigator.onLine;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  set('connection-value', online ? 'Browser reports online' : 'Browser reports offline');
  set('connection-detail', connection?.effectiveType
    ? 'Reported network type: ' + connection.effectiveType + '. This is an estimate, not a speed or coverage test.'
    : 'Network type is not exposed by this browser. Online status does not guarantee connectivity.');
  set('secure-value', window.isSecureContext ? 'Secure context' : 'Not secure');
  set('webrtc-value', typeof window.RTCPeerConnection === 'function' ? 'WebRTC available' : 'WebRTC unavailable');
  set('mic-value', navigator.mediaDevices?.getUserMedia ? 'Permission not requested' : 'Microphone API unavailable');
  set('lab-message', 'Local capability check complete. No data was sent to Streetwise.');
}
byId('run-check').addEventListener('click', checkCapabilities);
byId('mic-check').addEventListener('click', async () => {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    set('mic-value', 'Unsupported or insecure page');
    set('lab-message', 'Microphone permission requires HTTPS and a supported browser.');
    return;
  }
  set('lab-message', 'Waiting for your browser microphone permission decision…');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    set('mic-value', 'Permission granted');
    set('lab-message', 'Microphone access works. The test stopped the stream immediately; nothing was recorded or uploaded.');
  } catch (error) {
    const safe = ['NotAllowedError','NotFoundError','NotReadableError','OverconstrainedError','SecurityError'];
    set('mic-value', safe.includes(error?.name) ? error.name : 'Permission or device error');
    set('lab-message', 'Microphone test did not succeed. No audio was uploaded.');
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
});
