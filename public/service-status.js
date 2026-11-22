const status = document.getElementById('waitlist-status');
const message = document.getElementById('waitlist-message');
const checked = document.getElementById('checked-at');
const announcement = document.getElementById('status-message');
async function refreshStatus() {
  announcement.textContent = 'Checking public status…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('/api/public-status', { signal: controller.signal, headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    const open = data?.publicLaunchMode === 'waitlist' && data?.waitlist?.open === true;
    status.textContent = open ? 'Open for updates' : 'Currently closed';
    status.dataset.status = open ? 'available' : 'unavailable';
    message.textContent = open ? 'You may register for launch updates. No plan purchases or activations are available.' : 'Signups are not currently available. Please check back later.';
    checked.textContent = 'Status checked: ' + new Date().toLocaleString();
    announcement.textContent = 'Public status updated.';
  } catch {
    status.textContent = 'Unable to verify';
    status.dataset.status = 'unavailable';
    message.textContent = 'The status service cannot be reached. This does not mean the waitlist is open.';
    checked.textContent = 'Live status not verified.';
    announcement.textContent = 'Public status check failed. Try again later.';
  } finally { clearTimeout(timer); }
}
document.getElementById('refresh-status').addEventListener('click', refreshStatus);
refreshStatus();
