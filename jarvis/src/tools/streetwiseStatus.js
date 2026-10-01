import { buildHealthStatus } from "../../../src/services/healthService.js";

export function createStreetwiseStatusTool() {
  return Object.freeze({
    id: "streetwise.status",
    description: "Read the current Streetwise Connection health status.",
    riskTier: 0,
    productionEnabled: true,
    validateInput(input = {}) {
      return input && typeof input === "object" && !Array.isArray(input)
        ? { valid: true }
        : { valid: false, reason: "invalid_input" };
    },
    async execute(input = {}) {
      const validation = this.validateInput(input);
      if (!validation.valid) throw new Error(validation.reason);
      const health = await buildHealthStatus({ runtime: "node" });
      return health.body;
    }
  });
}
