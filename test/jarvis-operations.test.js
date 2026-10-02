import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuditLog,
  createApprovalStore,
  createIdempotencyStore,
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

  const running = updateOperationTask(task, {
    status: operationStatuses.RUNNING
  });

  const updated = updateOperationTask(running, {
    status: operationStatuses.SUCCEEDED
  }, {
    now: () => "2026-10-02T20:01:00.000Z"
  });

  assert.equal(task.status, operationStatuses.QUEUED);
  assert.equal(running.status, operationStatuses.RUNNING);
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
  assert.equal(receivedOperation.status, operationStatuses.RUNNING);
  assert.equal(result.operation.status, operationStatuses.SUCCEEDED);
  assert.equal(receivedOperation.approval.status, "not_required");
  assert.equal(audit.list().some(event => event.type === "operation_task"), true);
  assert.deepEqual(
    audit.list()
      .filter(event => event.type === "operation_status")
      .map(event => event.status),
    [operationStatuses.RUNNING, operationStatuses.SUCCEEDED]
  );
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


test("generic operation task updates cannot rewrite identity or skip lifecycle states", () => {
  const task = createOperationTask({
    requestId: "req-4",
    actorId: "operator",
    intent: "run a safe check",
    capability: "tech.check",
    route: operationRoutes.TECH
  });

  assert.throws(
    () => updateOperationTask(task, { actorId: "attacker" }),
    /only status may be changed/
  );
  assert.throws(
    () => updateOperationTask(task, { status: operationStatuses.SUCCEEDED }),
    /invalid operation status transition/
  );

  const running = updateOperationTask(task, { status: operationStatuses.RUNNING });
  const succeeded = updateOperationTask(running, { status: operationStatuses.SUCCEEDED });

  assert.equal(running.status, operationStatuses.RUNNING);
  assert.equal(succeeded.status, operationStatuses.SUCCEEDED);
});


test("Jarvis marks an operation failed when tool execution fails", async () => {
  const registry = createToolRegistry();
  registry.register({
    id: "tech.failure",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async () => {
      throw new Error("internal failure");
    }
  });

  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { operator: ["tech.failure"] } }),
    audit,
    memory: createMemory(),
    operationRouter: createOperationRouter({
      routes: { "tech.failure": operationRoutes.TECH }
    })
  });

  const result = await jarvis.run({
    actorId: "operator",
    capability: "tech.failure",
    metadata: { environment: "test" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "tool_execution_failed");
  assert.deepEqual(
    audit.list()
      .filter(event => event.type === "operation_status")
      .map(event => event.status),
    [operationStatuses.RUNNING, operationStatuses.FAILED]
  );
});


test("approval records are bound, expiring, and single-use", () => {
  let now = new Date("2026-10-02T20:00:00.000Z");
  const approvals = createApprovalStore({ now: () => now });
  const issued = approvals.issue({
    approvalId: "approval-1",
    approvedBy: "operator-manager",
    actorId: "operator",
    capability: "ops.settings.update",
    environment: "production",
    expiresAt: "2026-10-02T21:00:00.000Z"
  });

  const verified = approvals.verifyAndConsume("approval-1", {
    actorId: "operator",
    capability: "ops.settings.update",
    environment: "production"
  });

  assert.equal(verified.approvalId, issued.approvalId);
  assert.equal(verified.approvedBy, "operator-manager");
  assert.equal(approvals.verifyAndConsume("approval-1", {
    actorId: "operator",
    capability: "ops.settings.update",
    environment: "production"
  }), null);

  const other = approvals.issue({
    approvalId: "approval-2",
    approvedBy: "operator-manager",
    actorId: "operator",
    capability: "ops.settings.update",
    environment: "production",
    expiresAt: "2026-10-02T20:30:00.000Z"
  });
  now = new Date("2026-10-02T20:31:00.000Z");
  assert.equal(approvals.verifyAndConsume(other.approvalId, {
    actorId: "operator",
    capability: "ops.settings.update",
    environment: "production"
  }), null);
});

test("idempotency blocks replay and conflicting reuse without executing twice", () => {
  const store = createIdempotencyStore();
  const first = store.reserve("key-1", {
    operationId: "op-1",
    actorId: "operator",
    capability: "tech.check",
    environment: "test",
    input: { target: "gateway" }
  });
  const replay = store.reserve("key-1", {
    operationId: "op-2",
    actorId: "operator",
    capability: "tech.check",
    environment: "test",
    input: { target: "gateway" }
  });
  const conflict = store.reserve("key-1", {
    operationId: "op-3",
    actorId: "operator",
    capability: "tech.check",
    environment: "test",
    input: { target: "different-gateway" }
  });

  assert.equal(first.accepted, true);
  assert.equal(replay.reason, "idempotency_replay");
  assert.equal(conflict.reason, "idempotency_conflict");
});

test("Jarvis blocks a duplicate idempotency key before tool execution", async () => {
  let executions = 0;
  const registry = createToolRegistry();
  registry.register({
    id: "tech.idempotent",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async () => {
      executions += 1;
      return { status: "ok" };
    }
  });

  const audit = createAuditLog();
  const idempotencyStore = createIdempotencyStore();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { operator: ["tech.idempotent"] } }),
    audit,
    memory: createMemory(),
    operationRouter: createOperationRouter({
      routes: { "tech.idempotent": operationRoutes.TECH }
    }),
    idempotencyStore
  });

  const request = {
    actorId: "operator",
    capability: "tech.idempotent",
    input: { target: "gateway" },
    metadata: { environment: "test", idempotencyKey: "same-operation" }
  };

  const first = await jarvis.run(request);
  const second = await jarvis.run(request);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.error, "idempotency_replay");
  assert.equal(executions, 1);
  assert.equal(second.operation.status, operationStatuses.BLOCKED);
});
