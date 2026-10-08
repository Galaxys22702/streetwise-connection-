import { randomUUID } from "node:crypto";

export function createApprovalStore({ now = () => new Date() } = {}) {
  if (typeof now !== "function") throw new TypeError("now must be a function");
  const records = new Map();

  function issue({ approvalId = randomUUID(), approvedBy, actorId, capability, environment, expiresAt } = {}) {
    requireString(approvalId, "approvalId");
    requireString(approvedBy, "approvedBy");
    requireString(actorId, "actorId");
    requireString(capability, "capability");
    requireString(environment, "environment");

    const expiry = parseTime(expiresAt, "expiresAt");
    if (expiry <= now()) throw new TypeError("approval must expire in the future");
    if (records.has(approvalId)) throw new Error("approval_already_exists");

    const record = Object.freeze({
      approvalId,
      approvedBy: approvedBy.trim(),
      actorId: actorId.trim(),
      capability: capability.trim(),
      environment,
      approvedAt: now().toISOString(),
      expiresAt: expiry.toISOString()
    });
    records.set(approvalId, { record, consumed: false });
    return record;
  }

  function verifyAndConsume(approvalId, { actorId, capability, environment } = {}) {
    if (typeof approvalId !== "string" || !approvalId.trim()) return null;
    const entry = records.get(approvalId.trim());
    if (!entry || entry.consumed) return null;
    if (Date.parse(entry.record.expiresAt) <= now()) return null;
    if (entry.record.actorId !== actorId || entry.record.capability !== capability || entry.record.environment !== environment) return null;
    entry.consumed = true;
    return entry.record;
  }

  function has(approvalId) {
    return records.has(approvalId);
  }

  return Object.freeze({ issue, verifyAndConsume, has });
}

function requireString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " is required");
}

function parseTime(value, name) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) throw new TypeError(name + " must be a valid timestamp");
  return new Date(parsed);
}
