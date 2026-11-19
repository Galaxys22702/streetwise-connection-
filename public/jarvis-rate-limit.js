// Keep free-tier retries local and conservative. No background retry is scheduled.
export function retryAfterSeconds(raw, now = Date.now()) {
  const value = String(raw || "").trim();
  let seconds = 60;
  if (/^\d{1,6}$/.test(value)) {
    seconds = Number(value);
  } else if (value) {
    const reset = Date.parse(value);
    if (Number.isFinite(reset)) seconds = Math.ceil((reset - now) / 1000);
  }
  return Math.max(60, Math.min(86400, seconds));
}

export function isLocalStatusPrompt(text) {
  return /^(\/status|streetwise status|check streetwise status|jarvis online)$/i.test(String(text).trim());
}
