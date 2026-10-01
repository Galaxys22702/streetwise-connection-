const SENSITIVE_KEYS = new Set([
  "secret", "secrets", "token", "tokens", "authorization", "password",
  "passwd", "privatekey", "private_key", "apikey", "api_key", "accesstoken",
  "refreshtoken", "clientsecret", "servicerolekey"
]);

function sanitize(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[redacted_circular_value]";
  seen.add(value);

  if (Array.isArray(value)) return value.map(item => sanitize(item, seen));

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = "[redacted]";
    } else {
      output[key] = sanitize(item, seen);
    }
  }
  return output;
}

export function createAuditLog() {
  const events = [];

  function record(event) {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new TypeError("audit event must be an object");
    }
    const safe = {
      timestamp: new Date().toISOString(),
      ...sanitize(event)
    };
    events.push(Object.freeze(safe));
    return safe;
  }

  return Object.freeze({
    record,
    list() { return events.map(event => sanitize(event)); }
  });
}
