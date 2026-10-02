import assert from "node:assert/strict";
import test from "node:test";
import {
  createOperationRouter,
  createOperationTask,
  operationRoutes,
  operationStatuses,
  riskTiers,
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
