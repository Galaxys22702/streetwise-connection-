import assert from "node:assert/strict";
import test from "node:test";
import {
  createCatalogue,
  createCartStore,
  createCartTool,
  createCheckoutTool,
  createOrderTool,
  createPricingTool,
  createProductTool,
  createToolRegistry,
  createPolicy,
  createAuditLog,
  createMemory,
  createJarvis,
  riskTiers
} from "../jarvis/src/index.js";

const products = [
  {
    id: "plan-basic",
    name: "Streetwise Basic",
    description: "Basic cellular service plan",
    priceCents: 2500,
    currency: "USD"
  },
  {
    id: "sim-standard",
    name: "Standard SIM",
    description: "Physical SIM",
    priceCents: 500,
    currency: "USD"
  }
];

test("catalogue lists and searches published products", () => {
  const catalogue = createCatalogue(products);
  assert.equal(catalogue.list().length, 2);
  assert.equal(catalogue.search("basic")[0].id, "plan-basic");
});

test("pricing returns authoritative integer-cent price", async () => {
  const catalogue = createCatalogue(products);
  const tool = createPricingTool({ catalogue });
  assert.deepEqual(await tool.execute({ productId: "plan-basic" }), {
    productId: "plan-basic",
    currency: "USD",
    priceCents: 2500
  });
});

test("cart totals use catalogue pricing", async () => {
  const catalogue = createCatalogue(products);
  const cartStore = createCartStore({ catalogue });
  const cartTool = createCartTool({ cartStore });
  const cart = await cartTool.execute({ productId: "plan-basic", quantity: 2 });
  assert.equal(cart.totalCents, 5000);
  assert.equal(cart.items[0].quantity, 2);
});

test("checkout hands payment to an external boundary without accepting credentials", async () => {
  const catalogue = createCatalogue(products);
  const cartStore = createCartStore({ catalogue });
  const cart = cartStore.addItem(null, "plan-basic", 1);
  let received;

  const checkout = createCheckoutTool({
    cartStore,
    checkoutBoundary: {
      async createSession(input) {
        received = input;
        return {
          checkoutSessionId: "cs_test",
          status: "pending",
          redirectUrl: "https://checkout.example/session"
        };
      }
    }
  });

  const result = await checkout.execute({ cartId: cart.id }, {
    actorId: "customer",
    requestId: "request-1"
  });

  assert.equal(result.checkoutSessionId, "cs_test");
  assert.equal(received.cart.totalCents, 2500);
  assert.equal("paymentToken" in received, false);
});

test("order confirmation refuses an unverified payment", async () => {
  const orderTool = createOrderTool({
    orderBoundary: {
      async confirmPaidOrder() {
        return { orderId: "order-1", status: "pending", paymentStatus: "pending" };
      }
    }
  });

  await assert.rejects(
    () => orderTool.execute({ checkoutSessionId: "cs_test" }, {
      actorId: "customer",
      requestId: "request-2"
    }),
    /payment_not_verified/
  );
});

test("commerce tools are blocked from production until explicitly enabled", async () => {
  const catalogue = createCatalogue(products);
  const registry = createToolRegistry();
  registry.register(createProductTool({ catalogue }));

  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { customer: ["commerce.products.list"] } }),
    audit: createAuditLog(),
    memory: createMemory()
  });

  const result = await jarvis.run({
    actorId: "customer",
    capability: "commerce.products.list",
    metadata: { environment: "production" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "production_execution_disabled");
  assert.equal(riskTiers.READ_ONLY, 0);
});
