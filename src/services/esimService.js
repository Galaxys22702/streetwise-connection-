import { randomUUID } from "node:crypto";
import { databaseConfigured, query } from "../db/index.js";
import { getProvider, getProviderName, getProviderStatus } from "../providers/index.js";

const memoryOrders = new Map();
const GB = 1024 * 1024 * 1024;

function inferDataLimitBytes(bundleName) {
  const match = String(bundleName || "").match(/^mock_(\d+)GB_/i);
  return match ? Number(match[1]) * GB : null;
}

function usageSummary(order) {
  const limitBytes = order.dataLimitBytes == null ? null : Number(order.dataLimitBytes);
  const usedBytes = Number(order.dataUsedBytes || 0);
  const remainingBytes = limitBytes == null ? null : Math.max(0, limitBytes - usedBytes);
  return {
    limitBytes,
    usedBytes,
    remainingBytes,
    percentUsed: limitBytes ? Number(Math.min(100, (usedBytes / limitBytes) * 100).toFixed(2)) : null
  };
}

function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    userId: order.userId || null,
    provider: order.provider,
    providerOrderReference: order.providerOrderReference,
    bundleName: order.bundleName,
    quantity: order.quantity,
    country: order.country,
    device: order.device,
    customerEmail: order.customerEmail,
    requestedMode: order.requestedMode,
    status: order.status,
    total: order.total == null ? null : Number(order.total),
    currency: order.currency,
    install: order.install || null,
    usage: usageSummary(order),
    activatedAt: order.activatedAt || null,
    expiresAt: order.expiresAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerOrderReference: row.provider_order_reference,
    bundleName: row.bundle_name,
    quantity: row.quantity,
    country: row.country,
    device: row.device,
    customerEmail: row.customer_email,
    requestedMode: row.requested_mode,
    status: row.status,
    total: row.total,
    currency: row.currency,
    providerMode: row.provider_mode,
    liveOrderExecuted: row.live_order_executed,
    install: row.install_json,
    error: row.error,
    dataLimitBytes: row.data_limit_bytes,
    dataUsedBytes: row.data_used_bytes,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function insertOrder(order) {
  if (!databaseConfigured) {
    memoryOrders.set(order.id, order);
    return;
  }
  await query(
    `INSERT INTO esim_orders (
       id, user_id, provider, provider_order_reference, bundle_name, quantity,
       country, device, customer_email, requested_mode, status, total, currency,
       provider_mode, live_order_executed, install_json, error, data_limit_bytes,
       data_used_bytes, activated_at, expires_at, created_at, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
     )`,
    [
      order.id, order.userId, order.provider, order.providerOrderReference, order.bundleName,
      order.quantity, order.country, order.device, order.customerEmail, order.requestedMode,
      order.status, order.total, order.currency, order.providerMode, order.liveOrderExecuted,
      order.install, order.error, order.dataLimitBytes, order.dataUsedBytes, order.activatedAt,
      order.expiresAt, order.createdAt, order.updatedAt
    ]
  );
}

async function updateOrder(order) {
  if (!databaseConfigured) {
    memoryOrders.set(order.id, order);
    return;
  }
  await query(
    `UPDATE esim_orders SET
       user_id=$2, provider_order_reference=$3, status=$4, total=$5, currency=$6,
       provider_mode=$7, live_order_executed=$8, install_json=$9, error=$10,
       data_limit_bytes=$11, data_used_bytes=$12, activated_at=$13, expires_at=$14,
       updated_at=$15
     WHERE id=$1`,
    [
      order.id, order.userId, order.providerOrderReference, order.status, order.total,
      order.currency, order.providerMode, order.liveOrderExecuted, order.install, order.error,
      order.dataLimitBytes, order.dataUsedBytes, order.activatedAt, order.expiresAt, order.updatedAt
    ]
  );
}

async function findOrder(id) {
  if (!databaseConfigured) return memoryOrders.get(id) || null;
  const result = await query("SELECT * FROM esim_orders WHERE id=$1 LIMIT 1", [id]);
  return rowToOrder(result.rows[0]);
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

export async function provisionEsim(input = {}, { user = null } = {}) {
  const bundleName = String(input.bundleName || "").trim();
  const country = String(input.country || "").trim().toUpperCase();
  const device = String(input.device || "").trim();
  const customerEmail = String(input.customerEmail || user?.email || "").trim().toLowerCase();
  const quantity = Math.max(1, Math.min(Number(input.quantity) || 1, 5));
  const validateOnly = input.validateOnly !== false;

  if (!bundleName) throw new Error("bundle_name_required");

  const provider = getProvider();
  const id = randomUUID();
  const now = new Date().toISOString();

  const order = {
    id,
    userId: user?.id || null,
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
    providerMode: null,
    liveOrderExecuted: false,
    install: null,
    error: null,
    dataLimitBytes: inferDataLimitBytes(bundleName),
    dataUsedBytes: 0,
    activatedAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now
  };

  await insertOrder(order);

  try {
    const result = await provider.createEsimOrder({ bundleName, quantity, validateOnly });
    order.providerOrderReference = result.orderReference || null;
    order.status = result.status || "submitted";
    order.total = result.total ?? null;
    order.currency = result.currency || null;
    order.install = result.install || null;
    order.providerMode = result.mode || null;
    order.liveOrderExecuted = Boolean(result.liveOrderExecuted);
    if (order.status === "completed" && !validateOnly) order.activatedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    await updateOrder(order);

    return {
      order: publicOrder(order),
      safety: {
        liveOrderExecuted: order.liveOrderExecuted,
        providerMode: order.providerMode
      }
    };
  } catch (error) {
    order.status = "failed";
    order.error = error.message;
    order.updatedAt = new Date().toISOString();
    await updateOrder(order);
    throw error;
  }
}

export async function getEsimOrder(id, { refresh = false, userId = null } = {}) {
  const order = await findOrder(id);
  if (!order || (userId && order.userId && order.userId !== userId)) return null;

  if (refresh && order.providerOrderReference) {
    try {
      const provider = getProvider();
      const providerOrder = await provider.getOrder(order.providerOrderReference);
      order.status = providerOrder?.status || order.status;
      order.total = providerOrder?.total ?? order.total;
      order.currency = providerOrder?.currency || order.currency;
      order.updatedAt = new Date().toISOString();
      await updateOrder(order);
    } catch {
      // Keep the stored order readable even if provider refresh temporarily fails.
    }
  }

  return publicOrder(order);
}

export async function getEsimInstallDetails(id, { userId = null } = {}) {
  const order = await findOrder(id);
  if (!order || (userId && order.userId && order.userId !== userId)) return null;
  if (order.install) return order.install;
  if (!order.providerOrderReference) return null;

  const provider = getProvider();
  const details = await provider.getInstallDetails(order.providerOrderReference);
  order.install = details;
  order.updatedAt = new Date().toISOString();
  await updateOrder(order);
  return details;
}

export async function listEsimOrdersForUser(userId) {
  if (!databaseConfigured) {
    return [...memoryOrders.values()]
      .filter((order) => order.userId === userId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(publicOrder);
  }
  const result = await query(
    "SELECT * FROM esim_orders WHERE user_id=$1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows.map((row) => publicOrder(rowToOrder(row)));
}

export async function recordMockUsage(id, userId, usedMegabytes) {
  if (getProviderName() !== "mock") {
    const error = new Error("usage_simulation_available_in_mock_mode_only");
    error.statusCode = 409;
    throw error;
  }
  const order = await findOrder(id);
  if (!order || order.userId !== userId) {
    const error = new Error("order_not_found");
    error.statusCode = 404;
    throw error;
  }

  const increment = Math.max(0, Math.floor(Number(usedMegabytes || 0) * 1024 * 1024));
  order.dataUsedBytes = Number(order.dataUsedBytes || 0) + increment;
  if (order.dataLimitBytes != null) {
    order.dataUsedBytes = Math.min(Number(order.dataLimitBytes), order.dataUsedBytes);
  }
  order.updatedAt = new Date().toISOString();
  await updateOrder(order);

  if (databaseConfigured) {
    const remaining = order.dataLimitBytes == null
      ? null
      : Math.max(0, Number(order.dataLimitBytes) - Number(order.dataUsedBytes));
    await query(
      `INSERT INTO esim_usage_events (id, order_id, source, used_bytes, remaining_bytes, raw_json)
       VALUES ($1,$2,'mock-simulation',$3,$4,$5)`,
      [`use_${randomUUID().replaceAll("-", "")}`, id, order.dataUsedBytes, remaining, { incrementBytes: increment }]
    );
  }

  return publicOrder(order);
}
