import { createHash } from "node:crypto";

export function createIdempotencyStore({ maxEntries = 10000 } = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError("maxEntries must be a positive integer");
  const entries = new Map();

  function fingerprint({ actorId, capability, environment, input }) {
    return createHash("sha256").update(stableStringify({ actorId, capability, environment, input })).digest("hex");
  }

  function reserve(key, request) {
    if (typeof key !== "string" || !key.trim()) return { accepted: true, reason: null };
    const cleanKey = key.trim();
    const digest = fingerprint(request);
    const existing = entries.get(cleanKey);

    if (existing) {
      return Object.freeze({
        accepted: false,
        reason: existing.fingerprint === digest ? "idempotency_replay" : "idempotency_conflict",
        operationId: existing.operationId
      });
    }

    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
    entries.set(cleanKey, { fingerprint: digest, operationId: request.operationId, state: "running" });
    return Object.freeze({ accepted: true, reason: null, operationId: request.operationId });
  }

  function complete(key) {
    if (typeof key === "string" && entries.has(key.trim())) entries.get(key.trim()).state = "succeeded";
  }

  function fail(key) {
    if (typeof key === "string" && entries.has(key.trim())) entries.get(key.trim()).state = "failed";
  }

  function inspect(key) {
    const entry = entries.get(String(key || "").trim());
    return entry ? Object.freeze({ ...entry }) : null;
  }

  return Object.freeze({ reserve, complete, fail, inspect, fingerprint });
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}
