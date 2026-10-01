import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuditLog,
  createJarvis,
  createMemory,
  createPolicy,
  createToolRegistry,
  riskTiers
} from "../jarvis/src/index.js";

test("Jarvis executes an authorised read-only tool and audits the execution", async () => {
  const registry = createToolRegistry();
  registry.register({
    id: "system.status",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async () => ({ status: "ok" })
  });
  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { rob: ["system.status"] } }),
    audit,
    memory: createMemory()
  });

  const result = await jarvis.run({
    actorId: "rob",
    capability: "system.status",
    metadata: { environment: "production" }
  });

  assert.deepEqual(result.result, { status: "ok" });
  assert.equal(result.ok, true);
  assert.equal(audit.list().at(-1).type, "tool_execution");
});

test("Jarvis fails closed when a capability is not authorised", async () => {
  const registry = createToolRegistry();
  registry.register({ id: "device.restart", riskTier: riskTiers.OPERATIONAL, execute: async () => "restarted" });
  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({ permissions: { rob: [] } }),
    audit,
    memory: createMemory()
  });

  const result = await jarvis.run({ actorId: "rob", capability: "device.restart" });

  assert.deepEqual(result, { ok: false, requestId: result.requestId, error: "capability_not_authorized" });
  assert.equal(audit.list().at(-1).allowed, false);
});

test("Jarvis requires explicit approval for non-read-only actions", async () => {
  const registry = createToolRegistry();
  registry.register({ id: "account.change", riskTier: riskTiers.REVERSIBLE, execute: async () => "changed" });
  const policy = createPolicy({ permissions: { rob: ["account.change"] } });
  const audit = createAuditLog();
  const jarvis = createJarvis({ registry, policy, audit, memory: createMemory() });

  const denied = await jarvis.run({ actorId: "rob", capability: "account.change" });
  const approved = await jarvis.run({
    actorId: "rob",
    capability: "account.change",
    metadata: { approved: true }
  });

  assert.equal(denied.error, "approval_required");
  assert.equal(approved.ok, true);
});

test("audit events do not retain credential-like fields", () => {
  const audit = createAuditLog();
  const event = audit.record({ type: "test", token: "not-for-storage", value: "safe" });
  assert.equal("token" in event, false);
  assert.equal(audit.list()[0].value, "safe");
});
