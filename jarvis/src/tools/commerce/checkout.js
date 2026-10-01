import { randomUUID } from "node:crypto";
import { riskTiers } from "../../types.js";

export function createCheckoutTool({ cartStore, checkoutBoundary }) {
  if (!cartStore || typeof checkoutBoundary !== "object") {
    throw new TypeError("cartStore and checkoutBoundary are required");
  }
  if (typeof checkoutBoundary.createSession !== "function") {
    throw new TypeError("checkoutBoundary.createSession must be a function");
  }

  return Object.freeze({
    id: "commerce.checkout.prepare",
    description: "Prepare a customer checkout session without collecting payment credentials.",
    riskTier: riskTiers.HIGH_IMPACT,
    productionEnabled: false,
    validateInput(input = {}) {
      return !!input && typeof input === "object" && !Array.isArray(input) &&
        typeof input.cartId === "string" && input.cartId.trim().length > 0;
    },
    async execute(input, context) {
      const cart = cartStore.get(input.cartId);
      if (!cart || cart.items.length === 0) throw new Error("cart_empty");

      const session = await checkoutBoundary.createSession({
        cart,
        actorId: context.actorId,
        requestId: context.requestId,
        idempotencyKey: input.idempotencyKey || randomUUID()
      });

      return {
        checkoutSessionId: session.checkoutSessionId,
        status: session.status || "pending",
        redirectUrl: session.redirectUrl || null,
        cartId: cart.id
      };
    }
  });
}
