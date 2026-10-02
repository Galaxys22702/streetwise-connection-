export function createPolicy({
  permissions = {},
  requireApprovalAtOrAbove = 1,
  approvalVerifier = async () => false
} = {}) {
  if (typeof approvalVerifier !== "function") throw new TypeError("approvalVerifier must be a function");

  async function evaluate({ request, tool, environment = "development" }) {
    if (!request?.actorId) return deny("identity_required");
    if (!tool) return deny("tool_not_found");
    if (!permissions[request.actorId]?.includes(tool.id)) return deny("capability_not_authorized");
    if (environment !== "development" && environment !== "test" && environment !== "production") {
      return deny("invalid_environment");
    }
    if (environment === "production" && tool.productionEnabled !== true) return deny("production_execution_disabled");

    let approvalVerified = false;
    if (tool.riskTier >= requireApprovalAtOrAbove) {
      try {
        approvalVerified = (await approvalVerifier({ request, tool, environment })) === true;
      } catch {
        return deny("approval_verification_failed");
      }
      if (!approvalVerified) return deny("approval_required");
    }

    return { allowed: true, reason: "authorized", approvalVerified };
  }

  return Object.freeze({ evaluate });
}

function deny(reason) {
  return { allowed: false, reason, approvalVerified: false };
}
