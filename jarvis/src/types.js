import { randomUUID } from "node:crypto";

export const riskTiers = Object.freeze({ READ_ONLY: 0, REVERSIBLE: 1, OPERATIONAL: 2, HIGH_IMPACT: 3 });

export function createRequest({ actorId, requestId, capability, input = {}, metadata = {} }) {
  if (typeof actorId !== "string" || !actorId.trim()) throw new TypeError("actorId is required");
  if (typeof capability !== "string" || !capability.trim()) throw new TypeError("capability is required");
  return Object.freeze({
    requestId: requestId || randomUUID(),
    actorId: actorId.trim(),
    capability: capability.trim(),
    input,
    metadata
  });
}
