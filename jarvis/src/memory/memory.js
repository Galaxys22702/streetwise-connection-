export function createMemory() {
  const entries = new Map();

  function set(key, value) {
    if (typeof key !== "string" || !key.trim()) throw new TypeError("memory key is required");
    entries.set(key, value);
  }

  return Object.freeze({
    set,
    get(key) { return entries.get(key); },
    has(key) { return entries.has(key); },
    delete(key) { return entries.delete(key); },
    clear() { entries.clear(); }
  });
}
