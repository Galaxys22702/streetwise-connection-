import { createHash, randomUUID } from "node:crypto";
import { withTransaction } from "../db/index.js";
import { verifyEsimGoWebhook } from "../providers/esimGoWebhook.js";

function parsePayload(rawBody) {
  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new Error();
    return payload;
  } catch {
    const error = new Error("invalid_esim_go_webhook_json");
    error.statusCode = 400;
    throw error;
  }
}

function toNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function validDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function lifecycleStatus(alertType, remainingBytes, currentStatus) {
  const type = String(alertType || "").toLowerCase();
  if (type.includes("deletion") && type.includes("scheduled")) return "deletion_scheduled";
  if (type.includes("deleted")) return "deleted";
  if (remainingBytes === 0) return "exhausted";
  if (type.includes("attachment") || type.includes("first use") || type.includes("utilisation") || type.includes("usage")) {
    return "active";
  }
  return currentStatus;
}

export async function handleEsimGoWebhook(rawBody, signature) {
  verifyEsimGoWebhook(rawBody, signature);
  const payload = parsePayload(rawBody);
  const iccid = String(payload.iccid || "").trim();
  const eventType = String(payload.alertType || "unknown").trim().slice(0, 120) || "unknown";
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");

  return withTransaction(async (client) => {
    const event = await client.query(
      `INSERT INTO esim_provider_webhook_events (
         id, provider, body_sha256, event_type, iccid, payload
       ) VALUES ($1, 'esim-go', $2, $3, $4, $5)
       ON CONFLICT (provider, body_sha256) DO NOTHING
       RETURNING id`,
      [
        `ewh_${randomUUID().replaceAll("-", "")}`,
        bodyHash,
        eventType,
        iccid || null,
        payload
      ]
    );

    if (!event.rows[0]) {
      return { received: true, duplicate: true, eventType };
    }

    if (!iccid) {
      return { received: true, duplicate: false, eventType, processed: false, reason: "iccid_missing" };
    }

    const result = await client.query(
      `SELECT * FROM esim_orders
       WHERE provider = 'esim-go'
         AND (esim_iccid = $1 OR install_json ->> 'iccid' = $1)
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [iccid]
    );
    const order = result.rows[0];
    if (!order) {
      return { received: true, duplicate: false, eventType, processed: false, reason: "order_not_found" };
    }

    const bundle = payload.bundle && typeof payload.bundle === "object" ? payload.bundle : {};
    const initialBytes = toNonNegativeInteger(bundle.initialQuantity);
    const remainingBytes = toNonNegativeInteger(bundle.remainingQuantity);
    const limitBytes = bundle.unlimited === true
      ? null
      : initialBytes ?? (order.data_limit_bytes == null ? null : Number(order.data_limit_bytes));
    const usedBytes = initialBytes != null && remainingBytes != null
      ? Math.max(0, initialBytes - remainingBytes)
      : Number(order.data_used_bytes || 0);
    const status = lifecycleStatus(eventType, remainingBytes, order.status);
    const activatedAt = status === "active" ? order.activated_at || new Date().toISOString() : order.activated_at;
    const expiresAt = validDate(bundle.endTime) || order.expires_at;

    await client.query(
      `UPDATE esim_orders
       SET esim_iccid = $2,
           status = $3,
           data_limit_bytes = $4,
           data_used_bytes = $5,
           activated_at = $6,
           expires_at = $7,
           updated_at = NOW()
       WHERE id = $1`,
      [order.id, iccid, status, limitBytes, usedBytes, activatedAt, expiresAt]
    );

    if (initialBytes != null || remainingBytes != null) {
      await client.query(
        `INSERT INTO esim_usage_events (id, order_id, source, used_bytes, remaining_bytes, raw_json)
         VALUES ($1, $2, 'esim-go-webhook', $3, $4, $5)`,
        [
          `use_${randomUUID().replaceAll("-", "")}`,
          order.id,
          usedBytes,
          remainingBytes,
          payload
        ]
      );
    }

    return {
      received: true,
      duplicate: false,
      eventType,
      processed: true,
      orderId: order.id,
      status
    };
  });
}
