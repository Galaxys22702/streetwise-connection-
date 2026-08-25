import { randomUUID } from "node:crypto";
import { getProvider, getProviderName, getProviderStatus } from "../providers/index.js";

const orders = new Map();

function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    provider: order.provider,
    providerOrderReference: order.providerOrderReference,
    bundleName: order.bundleName,
    quantity: order.quantity,
    country: order.country,
    device: order.device,
    customerEmail: order.customerEmail,
    requestedMode: order.requestedMode,
    status: order.status,
    total: order.total,
    currency: order.currency,
    install: order.install || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function providerStatus() {
  return getProviderStatus();
}

export async function listProviderBundles({ country } = {}) {
  const provider = getProvider();
  return provider.listBundles({ country });
}

export async function checkProviderCoverage(input = {}) {
  const provider = getProvider();
  return provider.checkCoverage(input);
}

export async function provisionEsim(input = {}) {
  const bundleName = String(input.bundleName || "").trim();
  const country = String(input.country || "").trim().toUpperCase();
  const device = String(input.device || "").trim();
  const customerEmail = String(input.customerEmail || "").trim().toLowerCase();
  const quantity = Math.max(1, Math.min(Number(input.quantity) || 1, 5));
  const validateOnly = input.validateOnly !== false;

  if (!bundleName) throw new Error("bundle_name_required");

  const provider = getProvider();
  const id = randomUUID();
  const now = new Date().toISOString();

  const order = {
    id,
    provider: getProviderName(),
    providerOrderReference: null,
    bundleName,
    quantity,
    country: country || null,
    device: device || null,
    customerEmail: customerEmail || null,
    requestedMode: validateOnly ? "validate" : "transaction",
    status: "processing",
    total: null,
    currency: null,
    install: null,
    createdAt: now,
    updatedAt: now
  };

  orders.set(id, order);

  try {
    const result = await provider.createEsimOrder({ bundleName, quantity, validateOnly });

    order.providerOrderReference = result.orderReference || null;
    order.status = result.status || "submitted";
    order.total = result.total ?? null;
    order.currency = result.currency || null;
    order.install = result.install || null;
    order.providerMode = result.mode || null;
    order.liveOrderExecuted = Boolean(result.liveOrderExecuted);
    order.updatedAt = new Date().toISOString();
    orders.set(id, order);

    return {
      order: publicOrder(order),
      safety: {
        liveOrderExecuted: order.liveOrderExecuted,
        providerMode: order.providerMode
      }
    };
  } catch (error) {
    order.status = "failed";
    order.updatedAt = new Date().toISOString();
    order.error = error.message;
    orders.set(id, order);
    throw error;
  }
}

export async function getEsimOrder(id, { refresh = false } = {}) {
  const order = orders.get(id);
  if (!order) return null;

  if (refresh && order.providerOrderReference) {
    try {
      const provider = getProvider();
      const providerOrder = await provider.getOrder(order.providerOrderReference);
      order.status = providerOrder?.status || order.status;
      order.total = providerOrder?.total ?? order.total;
      order.currency = providerOrder?.currency || order.currency;
      order.updatedAt = new Date().toISOString();
      orders.set(id, order);
    } catch {
      // Keep the local order readable even if provider refresh temporarily fails.
    }
  }

  return publicOrder(order);
}

export async function getEsimInstallDetails(id) {
  const order = orders.get(id);
  if (!order) return null;
  if (order.install) return order.install;
  if (!order.providerOrderReference) return null;

  const provider = getProvider();
  const details = await provider.getInstallDetails(order.providerOrderReference);
  order.install = details;
  order.updatedAt = new Date().toISOString();
  orders.set(id, order);
  return details;
}
