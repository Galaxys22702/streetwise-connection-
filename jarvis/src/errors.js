export const errorCodes = Object.freeze({
  INVALID_REQUEST: "invalid_request",
  POLICY_EVALUATION_FAILED: "policy_evaluation_failed",
  OPERATION_ROUTE_NOT_FOUND: "operation_route_not_found",
  INPUT_VALIDATION_FAILED: "invalid_tool_input",
  RESULT_VALIDATION_FAILED: "invalid_tool_result",
  TOOL_EXECUTION_FAILED: "tool_execution_failed",
  APPROVAL_REQUIRED: "approval_required",
  APPROVAL_INVALID: "approval_invalid",
  IDEMPOTENCY_UNAVAILABLE: "idempotency_unavailable",
  IDEMPOTENCY_REPLAY: "idempotency_replay",
  IDEMPOTENCY_CONFLICT: "idempotency_conflict"
});

export function failure(requestId, error) {
  return Object.freeze({
    ok: false,
    requestId: requestId || null,
    error
  });
}
