export const errorCodes = Object.freeze({
  INVALID_REQUEST: "invalid_request",
  POLICY_EVALUATION_FAILED: "policy_evaluation_failed",
  INPUT_VALIDATION_FAILED: "invalid_tool_input",
  RESULT_VALIDATION_FAILED: "invalid_tool_result",
  TOOL_EXECUTION_FAILED: "tool_execution_failed"
});

export function failure(requestId, error) {
  return Object.freeze({
    ok: false,
    requestId: requestId || null,
    error
  });
}
