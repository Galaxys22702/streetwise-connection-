import { randomUUID } from "node:crypto";
import { riskTiers } from "../../types.js";

export function createCartStore({ catalogue }) {
  if (!catalogue) throw new TypeError("catalogue is required");

  const carts = new Map();

  function addItem(cartId, productId, quantity = 1) {
    const product = catalogue.get(productId);
    if (!product) throw new Error("product_not_found");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("invalid_quantity");
    }

    const id = cartId || randomUUID();
    const cart = carts.get(id) || { id, items: [] };
    const existing = cart.items.find(item => item.productId === productId);

    if (existing) existing.quantity += quantity;
    else cart.items.push({ productId, quantity });

    carts.set(id, cart);
    return snapshot(cart);
  }

  function get(cartId) {
    const cart = carts.get(cartId);
    return cart ? snapshot(cart) : null;
  }

  function clear(cartId) {
    carts.delete(cartId);
  }

  function snapshot(cart) {
    const items = cart.items.map(item => {
      const product = catalogue.get(item.productId);
      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: product.priceCents * item.quantity,
        currency: product.currency || "USD"
      };
    });
    return {
      id: cart.id,
      items,
      totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
      currency: items[0]?.currency || "USD"
    };
  }

  return Object.freeze({ addItem, get, clear });
}

export function createCartTool({ cartStore }) {
  if (!cartStore) throw new TypeError("cartStore is required");

  return Object.freeze({
    id: "commerce.cart.add",
    description: "Add a published product to a customer cart.",
    riskTier: riskTiers.REVERSIBLE,
    productionEnabled: false,
    validateInput(input = {}) {
      return !!input && typeof input === "object" && !Array.isArray(input) &&
        typeof input.productId === "string" &&
        Number.isInteger(input.quantity) && input.quantity >= 1 && input.quantity <= 99;
    },
    async execute(input) {
      return cartStore.addItem(input.cartId, input.productId, input.quantity);
    }
  });
}
