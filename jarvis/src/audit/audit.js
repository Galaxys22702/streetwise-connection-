export function createAuditLog() {
  const events = [];

  function record(event) {
    const safe = {
      timestamp: new Date().toISOString(),
      ...event
    };
    delete safe.secret;
    delete safe.token;
    delete safe.authorization;
    events.push(Object.freeze(safe));
    return safe;
  }

  return Object.freeze({
    record,
    list() { return events.map(event => ({ ...event })); }
  });
}
