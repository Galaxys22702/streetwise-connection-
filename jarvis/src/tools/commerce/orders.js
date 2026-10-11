import { riskTiers } from "../../types.js";

export function createOrderTool({ orderBoundary }) {
  if (!orderBoundary || typeof orderBoundary.confirmPaidOrder !== "function") {
    throw new TypeError("orderBoundary.confirmPaidOrder is required");
  }

  return Object.freeze({
    id: "commerce.orders.confirm",
    description: "Confirm an order only after the approved payment boundary verifies payment.",
    riskTier: riskTiers.HIGH_IMPACT,
    productionEnabled: false,
    validateInput(input = {}) {
      return !!input && typeof input === "object" && !Array.isArray(input) &&
        typeof input.checkoutSessionId === "string" && input.checkoutSessionId.trim().length > 0;
    },
    async execute(input, context) {
      const order = await orderBoundary.confirmPaidOrder({
        checkoutSessionId: input.checkoutSessionId,
        actorId: context.actorId,
        requestId: context.requestId
      });

      if (!order || order.paymentStatus !== "paid") {
        throw new Error("payment_not_verified");
      }

      return {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus
      };
    }
  });
}
