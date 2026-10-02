import { createRequest } from "../types.js";
import { errorCodes, failure } from "../errors.js";

export function createJarvis({ registry, policy, audit, memory }) {
  if (!registry || !policy || !audit || !memory) {
    throw new TypeError("registry, policy, audit and memory are required");
  }

  async function run(input) {
    let request;
    try {
      request = createRequest(input);
    } catch {
      return failure(null, errorCodes.INVALID_REQUEST);
    }

    const tool = registry.get(request.capability);
    const environment = request.metadata.environment || "development";

    let decision;
    try {
      decision = await policy.evaluate({ request, tool, environment });
    } catch {
      audit.record({
        type: "policy_error",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: request.capability,
        ok: false,
        errorCode: errorCodes.POLICY_EVALUATION_FAILED
      });
      return failure(request.requestId, errorCodes.POLICY_EVALUATION_FAILED);
    }

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
      return failure(request.requestId, decision.reason);
    }

    try {
      if (tool.validateInput) {
        const validation = await tool.validateInput(request.input);
        if (validation !== true && validation?.valid !== true) {
          audit.record({
            type: "input_validation",
            requestId: request.requestId,
            actorId: request.actorId,
            capability: tool.id,
            ok: false,
            errorCode: errorCodes.INPUT_VALIDATION_FAILED
          });
          return failure(request.requestId, errorCodes.INPUT_VALIDATION_FAILED);
        }
      }
    } catch {
      audit.record({
        type: "input_validation",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: tool.id,
        ok: false,
        errorCode: errorCodes.INPUT_VALIDATION_FAILED
      });
      return failure(request.requestId, errorCodes.INPUT_VALIDATION_FAILED);
    }

    const executionContext = Object.freeze({
      requestId: request.requestId,
      actorId: request.actorId,
      environment,
      memory
    });

    let result;
    try {
      result = await tool.execute(request.input, executionContext);
    } catch {
      audit.record({
        type: "tool_execution",
        requestId: request.requestId,
        actorId: request.actorId,
        capability: tool.id,
        riskTier: tool.riskTier,
        ok: false,
        errorCode: errorCodes.TOOL_EXECUTION_FAILED
      });
      return failure(request.requestId, errorCodes.TOOL_EXECUTION_FAILED);
    }

    if (tool.validateResult) {
      try {
        if ((await tool.validateResult(result)) !== true) {
          audit.record({
            type: "result_validation",
            requestId: request.requestId,
            actorId: request.actorId,
            capability: tool.id,
            ok: false,
            errorCode: errorCodes.RESULT_VALIDATION_FAILED
          });
          return failure(request.requestId, errorCodes.RESULT_VALIDATION_FAILED);
        }
      } catch {
        audit.record({
          type: "result_validation",
          requestId: request.requestId,
          actorId: request.actorId,
          capability: tool.id,
          ok: false,
          errorCode: errorCodes.RESULT_VALIDATION_FAILED
        });
        return failure(request.requestId, errorCodes.RESULT_VALIDATION_FAILED);
      }
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
  }

  return Object.freeze({ run });
}
