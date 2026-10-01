import { createRequest } from "../types.js";

export function createJarvis({ registry, policy, audit, memory }) {
  if (!registry || !policy || !audit || !memory) throw new TypeError("registry, policy, audit and memory are required");

  async function run(input) {
    const request = createRequest(input);
    const tool = registry.get(request.capability);
    const environment = request.metadata.environment || "development";
    const decision = await policy.evaluate({ request, tool, environment });

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
      if (tool.validateInput && (await tool.validateInput(request.input)) !== true) {
        audit.record({
          type: "input_validation",
          requestId: request.requestId,
          actorId: request.actorId,
          capability: tool.id,
          ok: false
        });
        return { ok: false, requestId: request.requestId, error: "invalid_tool_input" };
      }

      const result = await tool.execute(request.input, {
        requestId: request.requestId,
        actorId: request.actorId,
        memory,
        metadata: request.metadata
      });

      if (tool.validateResult && (await tool.validateResult(result)) !== true) {
        audit.record({
          type: "result_validation",
          requestId: request.requestId,
          actorId: request.actorId,
          capability: tool.id,
          ok: false
        });
        return { ok: false, requestId: request.requestId, error: "invalid_tool_result" };
      }

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
