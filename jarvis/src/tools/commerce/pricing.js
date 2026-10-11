import { riskTiers } from "../../types.js";

export function createPricingTool({ catalogue }) {
  if (!catalogue) throw new TypeError("catalogue is required");

  return Object.freeze({
    id: "commerce.pricing.get",
    description: "Return the authoritative storefront price for a published product.",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: false,
    validateInput(input = {}) {
      return !!input && typeof input === "object" && !Array.isArray(input) &&
        typeof input.productId === "string" && input.productId.trim().length > 0;
    },
    async execute(input) {
      const product = catalogue.get(input.productId);
      if (!product) throw new Error("product_not_found");
      return {
        productId: product.id,
        currency: product.currency || "USD",
        priceCents: product.priceCents
      };
    }
  });
}
