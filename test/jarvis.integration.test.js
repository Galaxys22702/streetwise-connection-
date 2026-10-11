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

test("Jarvis integration executes the full request-policy-tool-audit path", async () => {
  const registry = createToolRegistry();
  registry.register({
    id: "integration.status",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    validateInput: input => input?.region === "us-west"
      ? { valid: true }
      : { valid: false, reason: "region_required" },
    validateResult: result => result?.status === "ok",
    execute: async (input, context) => ({
      status: "ok",
      region: input.region,
      actorId: context.actorId
    })
  });

  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({
      permissions: { operator: ["integration.status"] }
    }),
    audit,
    memory: createMemory()
  });

  const result = await jarvis.run({
    actorId: "operator",
    capability: "integration.status",
    input: { region: "us-west" },
    metadata: { environment: "test" }
  });

  assert.deepEqual(result.result, {
    status: "ok",
    region: "us-west",
    actorId: "operator"
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    audit.list().map(event => event.type),
    ["policy_decision", "tool_execution"]
  );
});

test("Jarvis integration never exposes validator or tool exceptions", async () => {
  const registry = createToolRegistry();
  registry.register({
    id: "integration.failure",
    riskTier: riskTiers.READ_ONLY,
    productionEnabled: true,
    validateInput: () => {
      throw new Error("secret validator details");
    },
    execute: async () => {
      throw new Error("secret provider details");
    }
  });

  const audit = createAuditLog();
  const jarvis = createJarvis({
    registry,
    policy: createPolicy({
      permissions: { operator: ["integration.failure"] }
    }),
    audit,
    memory: createMemory()
  });

  const result = await jarvis.run({
    actorId: "operator",
    capability: "integration.failure",
    metadata: { environment: "test" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_tool_input");
  assert.equal(JSON.stringify(audit.list()).includes("secret validator details"), false);
});
