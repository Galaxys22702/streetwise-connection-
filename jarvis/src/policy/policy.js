export function createPolicy({ permissions = {}, requireApprovalAtOrAbove = 1 } = {}) {
  function evaluate({ request, tool, approved = false, environment = "development" }) {
    if (!request?.actorId) return deny("identity_required");
    if (!tool) return deny("tool_not_found");
    if (!permissions[request.actorId]?.includes(tool.id)) return deny("capability_not_authorized");
    if (environment === "production" && tool.productionEnabled !== true) return deny("production_execution_disabled");
    if (tool.riskTier >= requireApprovalAtOrAbove && approved !== true) return deny("approval_required");
    return { allowed: true, reason: "authorized" };
  }

  return Object.freeze({ evaluate });
}

function deny(reason) {
  return { allowed: false, reason };
}
