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

function buildJarvis(tool, { permissions = ["test.tool"], approvalVerifier } = {}) {
  const registry = createToolRegistry();
  registry.register(tool);
  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({
      permissions: { test: permissions },
      approvalVerifier
    }),
    audit,
    memory: createMemory()
  });
  return { jarvis, audit };
}

test("Jarvis executes an authorised read-only tool and audits the execution", async () => {
  const { jarvis, audit } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    execute: async () => ({ status: "ok" })
  });

  const result = await jarvis.run({
    actorId: "test",
    capability: "test.tool",
    metadata: { environment: "production" }
  });

  assert.deepEqual(result.result, { status: "ok" });
  assert.equal(result.ok, true);
  assert.equal(audit.list().at(-1).type, "tool_execution");
});

test("Jarvis fails closed when a capability is not authorised", async () => {
  const { jarvis, audit } = buildJarvis({
    id: "device.restart",
    riskTier: riskTiers.OPERATIONAL,
    execute: async () => "restarted"
  }, { permissions: [] });

  const result = await jarvis.run({ actorId: "test", capability: "device.restart" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "capability_not_authorized");
  assert.equal(typeof result.requestId, "string");
  assert.equal(audit.list().at(-1).allowed, false);
});

test("Jarvis requires trusted approval for non-read-only actions", async () => {
  let approvalCalls = 0;
  const approvalVerifier = async ({ request }) => {
    approvalCalls += 1;
    return request.metadata.approvalTicket === "valid-ticket";
  };
  const { jarvis } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.REVERSIBLE,
    execute: async () => "changed"
  }, { approvalVerifier });

  const denied = await jarvis.run({
    actorId: "test",
    capability: "test.tool",
    metadata: { approved: true }
  });
  const approved = await jarvis.run({
    actorId: "test",
    capability: "test.tool",
    metadata: { approvalTicket: "valid-ticket" }
  });

  assert.equal(denied.error, "approval_required");
  assert.equal(approved.ok, true);
  assert.equal(approvalCalls, 2);
});

test("Jarvis validates tool input before execution", async () => {
  let executed = false;
  const { jarvis } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    validateInput: input => typeof input === "object" && input.allowed === true,
    execute: async () => {
      executed = true;
      return "ran";
    }
  });

  const result = await jarvis.run({
    actorId: "test",
    capability: "test.tool",
    input: { allowed: false }
  });

  assert.equal(result.error, "invalid_tool_input");
  assert.equal(executed, false);
});

test("tool execution receives only trusted execution context", async () => {
  let received;
  const { jarvis } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    execute: async (_input, context) => {
      received = context;
      return "ok";
    }
  });

  await jarvis.run({
    actorId: "test",
    capability: "test.tool",
    metadata: { environment: "development", secret: "must-not-cross-boundary" }
  });

  assert.deepEqual(Object.keys(received).sort(), ["actorId", "environment", "memory", "requestId"]);
  assert.equal("secret" in received, false);
});

test("Jarvis validates tool results before returning them", async () => {
  const { jarvis } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    execute: async () => ({ status: "unexpected" }),
    validateResult: result => result.status === "ok"
  });

  const result = await jarvis.run({ actorId: "test", capability: "test.tool" });

  assert.equal(result.error, "invalid_tool_result");
});

test("tool failures return bounded errors without storing raw error messages", async () => {
  const { jarvis, audit } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    execute: async () => {
      throw new Error("provider secret=DO_NOT_STORE");
    }
  });

  const result = await jarvis.run({ actorId: "test", capability: "test.tool" });

  assert.equal(result.error, "tool_execution_failed");
  assert.equal(audit.list().at(-1).errorCode, "tool_execution_failed");
  assert.equal(audit.list().at(-1).error, undefined);
});

test("audit recursively redacts credential-like fields", () => {
  const audit = createAuditLog();
  const event = audit.record({
    type: "test",
    token: "not-for-storage",
    nested: { apiKey: "secret", safe: "value" }
  });

  assert.equal(event.token, "[redacted]");
  assert.equal(event.nested.apiKey, "[redacted]");
  assert.equal(event.nested.safe, "value");
});


test("Jarvis returns a stable error for malformed requests", async () => {
  const { jarvis } = buildJarvis({
    id: "test.tool",
    riskTier: riskTiers.READ_ONLY,
    execute: async () => "never"
  });

  const result = await jarvis.run({ capability: "test.tool" });

  assert.equal(result.ok, false);
  assert.equal(result.requestId, null);
  assert.equal(result.error, "invalid_request");
});
