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
    if (!["development", "test", "production"].includes(environment)) return deny("invalid_environment");
    if (environment === "production" && tool.productionEnabled !== true) return deny("production_execution_disabled");

    let approval = null;
    if (tool.riskTier >= requireApprovalAtOrAbove) {
      let verified;
      try {
        verified = await approvalVerifier({ request, tool, environment });
      } catch {
        return deny("approval_verification_failed");
      }

      if (verified === true) {
        approval = Object.freeze({ status: "approved", approvalId: null });
      } else if (verified && typeof verified === "object" && verified.status === undefined) {
        if (
          typeof verified.approvalId !== "string" ||
          typeof verified.approvedBy !== "string" ||
          typeof verified.expiresAt !== "string" ||
          Date.parse(verified.expiresAt) <= Date.now()
        ) {
          return deny("approval_invalid");
        }
        approval = Object.freeze({
          status: "approved",
          approvalId: verified.approvalId,
          approvedBy: verified.approvedBy,
          approvedAt: typeof verified.approvedAt === "string" ? verified.approvedAt : null,
          expiresAt: verified.expiresAt
        });
      }

      if (!approval) return deny("approval_required");
    }

    return { allowed: true, reason: "authorized", approvalVerified: Boolean(approval), approval };
  }

  return Object.freeze({ evaluate });
}

function deny(reason) {
  return { allowed: false, reason, approvalVerified: false, approval: null };
}
