import { createRequest } from "../types.js";

export function createJarvis({ registry, policy, audit, memory }) {
  if (!registry || !policy || !audit || !memory) throw new TypeError("registry, policy, audit and memory are required");

  async function run(input) {
    const request = createRequest(input);
    const tool = registry.get(request.capability);
    const environment = request.metadata.environment || "development";
    const approved = request.metadata.approved === true;
    const validation = typeof tool.validateInput === "function" ? tool.validateInput(request.input) : { valid: true };
    if (!validation || validation.valid !== true) {
      const reason = validation?.reason || "invalid_input";
      audit.record({
        type: "input_validation",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: request.capability,
        riskTier: tool.riskTier,
        allowed: false,
        reason
      });
      return { ok: false, requestId: request.requestId, error: reason };
    }

    const decision = policy.evaluate({ request, tool, approved, environment });

    audit.record({
      type: "policy_decision",
      requestId: request.requestId,
      actorId: request.actorId,
      capability: request.capability,
      riskTier: tool?.riskTier ?? null,
      allowed: decision.allowed,
      reason: decision.reason
    });

    if (!decision.allowed) {
      return { ok: false, requestId: request.requestId, error: decision.reason };
    }

    try {
      const result = await tool.execute(request.input, {
        requestId: request.requestId,
        actorId: request.actorId,
        memory,
        metadata: request.metadata
      });
      audit.record({
        type: "tool_execution",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: tool.id,
        riskTier: tool.riskTier,
        ok: true
      });
      return { ok: true, requestId: request.requestId, result };
    } catch (error) {
      audit.record({
        type: "tool_execution",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: tool.id,
        riskTier: tool.riskTier,
        ok: false,
        error: error instanceof Error ? error.message : "tool_execution_failed"
      });
      return { ok: false, requestId: request.requestId, error: "tool_execution_failed" };
    }
  }

  return Object.freeze({ run });
}
