import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuditLog,
  createJarvis,
  createMemory,
  createOperationRouter,
  createOperationTask,
  operationRoutes,
  operationStatuses,
  riskTiers,
  createPolicy,
  createToolRegistry,
  updateOperationTask
} from "../jarvis/src/index.js";

test("operation task creates a bounded, immutable execution envelope", () => {
  const task = createOperationTask({
    requestId: "req-1",
    actorId: "operator",
    intent: "inspect provider health",
    capability: "tech.provider.status",
    route: operationRoutes.TECH,
    riskTier: riskTiers.READ_ONLY,
    environment: "test",
    metadata: { source: "test" },
    now: () => "2026-10-02T20:00:00.000Z"
  });

  assert.equal(task.status, operationStatuses.QUEUED);
  assert.equal(task.approval.status, "not_required");
  assert.equal(task.route, "TECH");
  assert.equal(task.dryRun, false);
  assert.equal(Object.isFrozen(task), true);
  assert.equal(Object.isFrozen(task.metadata), true);
});

test("reversible and higher-risk tasks default to requiring approval", () => {
  const task = createOperationTask({
    requestId: "req-2",
    actorId: "operator",
    intent: "change an operational setting",
    capability: "ops.settings.update",
    route: operationRoutes.OPS,
    riskTier: riskTiers.OPERATIONAL,
    environment: "production"
  });

  assert.equal(task.approvalRequired, true);
  assert.equal(task.approval.status, "required");
});

test("operation router only resolves explicitly registered capabilities", () => {
  const router = createOperationRouter({
    routes: {
      "tech.provider.status": operationRoutes.TECH,
      "caller.case.note": operationRoutes.CALLER
    }
  });

  assert.equal(router.resolve("tech.provider.status"), operationRoutes.TECH);
  assert.equal(router.resolve("caller.case.note"), operationRoutes.CALLER);
  assert.equal(router.resolve("ops.unknown"), null);
  assert.deepEqual(router.list(), [
    { capability: "tech.provider.status", route: operationRoutes.TECH },
    { capability: "caller.case.note", route: operationRoutes.CALLER }
  ]);
});

test("operation task status updates are immutable and timestamped", () => {
  const task = createOperationTask({
    requestId: "req-3",
    actorId: "operator",
    intent: "run a safe check",
    capability: "tech.check",
    route: operationRoutes.TECH,
    now: () => "2026-10-02T20:00:00.000Z"
  });

  const updated = updateOperationTask(task, {
    status: operationStatuses.SUCCEEDED
  }, {
    now: () => "2026-10-02T20:01:00.000Z"
  });

  assert.equal(task.status, operationStatuses.QUEUED);
  assert.equal(updated.status, operationStatuses.SUCCEEDED);
  assert.equal(updated.updatedAt, "2026-10-02T20:01:00.000Z");
  assert.notEqual(updated, task);
});


test("Jarvis attaches an explicitly routed operation task without widening tool authority", async () => {
  let receivedOperation;
  const registry = createToolRegistry();
  registry.register({
    id: "tech.provider.status",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async (_input, context) => {
      receivedOperation = context.operation;
      return { status: "ok" };
    }
  });

  const audit = createAuditLog();
  const router = createOperationRouter({
    routes: { "tech.provider.status": operationRoutes.TECH }
  });
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { operator: ["tech.provider.status"] } }),
    audit,
    memory: createMemory(),
    operationRouter: router
  });

  const result = await jarvis.run({
    actorId: "operator",
    capability: "tech.provider.status",
    metadata: {
      environment: "test",
      intent: "inspect provider health",
      dryRun: true,
      idempotencyKey: "op-123"
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation.route, operationRoutes.TECH);
  assert.equal(result.operation.dryRun, true);
  assert.equal(result.operation.idempotencyKey, "op-123");
  assert.equal(receivedOperation.operationId, result.operation.operationId);
  assert.equal(receivedOperation.approval.status, "not_required");
  assert.equal(audit.list().some(event => event.type === "operation_task"), true);
});

test("Jarvis fails closed when an operation router has no explicit capability route", async () => {
  const registry = createToolRegistry();
  let executed = false;
  registry.register({
    id: "ops.unmapped",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async () => {
      executed = true;
      return "should-not-run";
    }
  });

  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { operator: ["ops.unmapped"] } }),
    audit,
    memory: createMemory(),
    operationRouter: createOperationRouter({ routes: {} })
  });

  const result = await jarvis.run({
    actorId: "operator",
    capability: "ops.unmapped",
    metadata: { environment: "test" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "operation_route_not_found");
  assert.equal(executed, false);
});
