import { randomUUID } from "node:crypto";
import { riskTiers } from "../types.js";

export const operationRoutes = Object.freeze({
  TECH: "TECH",
  CALLER: "CALLER",
  OPS: "OPS"
});

export const operationStatuses = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  BLOCKED: "blocked"
});

const ROUTES = new Set(Object.values(operationRoutes));
const STATUSES = new Set(Object.values(operationStatuses));

export function createOperationTask({
  requestId,
  actorId,
  intent,
  capability,
  route,
  riskTier = riskTiers.READ_ONLY,
  environment = "development",
  approvalRequired = riskTier >= riskTiers.REVERSIBLE,
  approval = null,
  dryRun = false,
  idempotencyKey = null,
  metadata = {},
  now = () => new Date().toISOString(),
  operationId = randomUUID()
} = {}) {
  requireNonEmptyString(requestId, "requestId");
  requireNonEmptyString(actorId, "actorId");
  requireNonEmptyString(intent, "intent");
  requireNonEmptyString(capability, "capability");

  if (!ROUTES.has(route)) throw new TypeError("route must be TECH, CALLER, or OPS");
  if (!Number.isInteger(riskTier) || riskTier < 0 || riskTier > 3) {
    throw new TypeError("riskTier must be an integer from 0 to 3");
  }
  if (!["development", "test", "production"].includes(environment)) {
    throw new TypeError("invalid environment");
  }
  if (typeof approvalRequired !== "boolean") {
    throw new TypeError("approvalRequired must be boolean");
  }
  if (typeof dryRun !== "boolean") throw new TypeError("dryRun must be boolean");
  if (idempotencyKey !== null) requireNonEmptyString(idempotencyKey, "idempotencyKey");
  if (!isRecord(metadata)) throw new TypeError("metadata must be an object");

  const createdAt = String(now());
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    throw new TypeError("now must return a valid timestamp");
  }

  const safeApproval = approval == null
    ? { status: approvalRequired ? "required" : "not_required", approvalId: null }
    : normaliseApproval(approval);

  if (!approvalRequired && safeApproval.status === "required") {
    throw new TypeError("approval cannot be required when approvalRequired is false");
  }

  const task = {
    operationId: String(operationId),
    requestId: requestId.trim(),
    actorId: actorId.trim(),
    intent: intent.trim(),
    capability: capability.trim(),
    route,
    riskTier,
    environment,
    status: operationStatuses.QUEUED,
    approvalRequired,
    approval: safeApproval,
    dryRun,
    idempotencyKey: idempotencyKey?.trim() || null,
    metadata: structuredClone(metadata),
    createdAt,
    updatedAt: createdAt
  };

  return freezeTask(task);
}

export function updateOperationTask(task, patch, { now = () => new Date().toISOString() } = {}) {
  if (!task || typeof task !== "object") throw new TypeError("task is required");
  if (!isRecord(patch)) throw new TypeError("patch must be an object");

  const keys = Object.keys(patch);
  if (keys.some(key => key !== "status")) {
    throw new TypeError("only status may be changed by the generic task updater");
  }
  if (!STATUSES.has(patch.status)) {
    throw new TypeError("invalid operation status");
  }
  if (!isAllowedTransition(task.status, patch.status)) {
    throw new TypeError("invalid operation status transition");
  }

  const updatedAt = String(now());
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) {
    throw new TypeError("now must return a valid timestamp");
  }

  return freezeTask({
    ...task,
    ...patch,
    updatedAt
  });
}

function normaliseApproval(approval) {
  if (!isRecord(approval)) throw new TypeError("approval must be an object");
  const status = String(approval.status || "");
  if (!["required", "approved", "rejected", "not_required"].includes(status)) {
    throw new TypeError("invalid approval status");
  }

  const normalised = {
    status,
    approvalId: approval.approvalId == null ? null : String(approval.approvalId)
  };

  for (const key of ["approvedBy", "approvedAt", "expiresAt"]) {
    if (approval[key] != null) normalised[key] = String(approval[key]);
  }

  return Object.freeze(normalised);
}

function freezeTask(task) {
  return Object.freeze({
    ...task,
    approval: Object.freeze({ ...task.approval }),
    metadata: Object.freeze(structuredClone(task.metadata))
  });
}

function isAllowedTransition(from, to) {
  if (from === operationStatuses.QUEUED) {
    return to === operationStatuses.RUNNING || to === operationStatuses.BLOCKED;
  }
  if (from === operationStatuses.RUNNING) {
    return to === operationStatuses.SUCCEEDED ||
      to === operationStatuses.FAILED ||
      to === operationStatuses.BLOCKED;
  }
  return false;
}

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} is required`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
