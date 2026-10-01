import { riskTiers } from "../../types.js";

export function createProductTool({ catalogue }) {
  if (!catalogue) throw new TypeError("catalogue is required");

  return Object.freeze({
    id: "commerce.products.list",
    description: "List products currently published to the Streetwise storefront.",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: false,
    validateInput(input = {}) {
      return input && typeof input === "object" && !Array.isArray(input);
    },
    async execute(input = {}) {
      if (input.search !== undefined && typeof input.search !== "string") {
        throw new Error("invalid_search");
      }
      return input.search ? catalogue.search(input.search) : catalogue.list();
    }
  });
}
